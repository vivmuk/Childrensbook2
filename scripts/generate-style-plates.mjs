#!/usr/bin/env node
/**
 * One painted plate per illustration style.
 *
 * Every plate shows the SAME scene, so the only thing that changes between them
 * is the style itself. That is what makes them useful: a parent comparing
 * "Torn Paper Collage" with "Clay and Felt" is looking at the same picture made
 * two ways, not at two different pictures.
 *
 * The plates are what the style picker and the gallery show, so nobody has to
 * guess what a style name means.
 *
 *   node scripts/generate-style-plates.mjs            # fill in what is missing
 *   node scripts/generate-style-plates.mjs --force    # repaint everything
 *   node scripts/generate-style-plates.mjs --only clay
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Compile lib/illustration-style.ts on the fly if it is not built yet, so a
// fresh clone can just run this file.
const BUILT = path.join(ROOT, '.kq-build', 'illustration-style.js')
if (!existsSync(BUILT)) {
  const { execFileSync } = await import('node:child_process')
  console.log('compiling lib/illustration-style.ts once ...')
  execFileSync(
    'npx',
    ['tsc', 'lib/illustration-style.ts', '--outDir', '.kq-build', '--module', 'esnext',
     '--target', 'es2020', '--moduleResolution', 'bundler', '--skipLibCheck'],
    { cwd: ROOT, stdio: 'inherit' },
  )
}

const { ILLUSTRATION_STYLES, buildIllustrationPrompt, styleModel } = await import(BUILT)

const OUT_DIR = process.env.KQ_OUT_DIR ? path.resolve(process.env.KQ_OUT_DIR) : path.join(ROOT, 'public', 'styles')
const API_KEY = process.env.VENICE_API_KEY
// The style decides the machine; KQ_IMAGE_MODEL forces one model for the whole run.
const MODEL_OVERRIDE = process.env.KQ_IMAGE_MODEL || null
const WIDTH = 1024
const HEIGHT = 1024

const FORCE = process.argv.includes('--force')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null

const NEGATIVE =
  'text, letters, words, numbers, lettering, signage, shop signs, street signs, billboards, ' +
  'posters, gibberish writing, watermark, signature, logo, border, frame, vignette, ' +
  'neon, lens flare, pure black, 3d render, photograph'

/**
 * The one scene every style renders. Deliberately plain: a child, a small
 * animal friend, a lamp and an open book. Enough to show how a style handles
 * faces, fur, fabric, light and space, and nothing that only works in one style.
 */
const SCENE =
  'A child of about six in a warm coat sits on a tree stump at dusk with a small friendly ' +
  'squirrel beside them, both looking at an open book held between them. A storm lantern on ' +
  'the ground beside the stump is the only light, and beyond them the ground falls away into ' +
  'quiet dark hills and a sky with a few early stars. Shot: medium wide, both characters ' +
  'large and clearly readable.'

const CHARACTERS =
  'The child: about six years old, short dark curly hair, a mustard-yellow coat, green boots. ' +
  'The squirrel: small, russet brown, one white ear, a fluffy tail. ' +
  'Keep both exactly the same across every picture.'

let useAspectRatio = false
const ASPECT = process.env.KQ_ASPECT || '1:1'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function generateImage(prompt, seed, model, attemptMax = 4) {
  for (let attempt = 1; attempt <= attemptMax; attempt++) {
    try {
      const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          ...(useAspectRatio ? { aspect_ratio: ASPECT } : { width: WIDTH, height: HEIGHT }),
          format: 'webp',
          steps: 20,
          seed,
          negative_prompt: NEGATIVE,
          cfg_scale: 7,
          hide_watermark: true,
          safe_mode: true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.images?.[0]) return data.images[0]
        console.error(`  no image in response (attempt ${attempt})`)
      } else {
        const body = (await res.text()).slice(0, 160)
        console.error(`  http ${res.status} (attempt ${attempt}): ${body}`)
        if (res.status === 400 && !useAspectRatio && /width|height|aspect/i.test(body)) {
          // Newer models dropped width/height for aspect_ratio. Ask again their way.
          useAspectRatio = true
          continue
        }
        if (res.status === 401 || res.status === 402 || res.status === 400) return null
      }
    } catch (err) {
      console.error(`  request failed (attempt ${attempt}):`, err.message)
    }
    if (attempt < attemptMax) await sleep(attempt * 3000)
  }
  return null
}

function seedFor(value) {
  let h = 7
  for (const c of `plate:${value}`) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) % 999999999
}

async function main() {
  if (!API_KEY) {
    console.error('VENICE_API_KEY is not set. Nothing to do.')
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })

  const styles = ONLY ? ILLUSTRATION_STYLES.filter((s) => s.value === ONLY) : ILLUSTRATION_STYLES
  if (!styles.length) {
    console.error(`No style matches --only ${ONLY}`)
    process.exit(1)
  }

  let made = 0
  let kept = 0

  for (const style of styles) {
    const file = path.join(OUT_DIR, `${style.value}.webp`)
    if (existsSync(file) && !FORCE) {
      console.log(`  ${style.value.padEnd(18)} already there`)
      kept++
      continue
    }

    const prompt = buildIllustrationPrompt({
      style: style.value,
      characters: CHARACTERS,
      scene: SCENE,
    })

    const b64 = await generateImage(prompt, seedFor(style.value), MODEL_OVERRIDE || styleModel(style.value))
    if (!b64) {
      console.error(`  ${style.value.padEnd(18)} FAILED`)
      continue
    }
    await writeFile(file, Buffer.from(b64, 'base64'))
    console.log(`  ${style.value.padEnd(18)} painted`)
    made++
  }

  console.log(`\nDone. ${made} painted, ${kept} already there, ${styles.length} styles.`)
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
