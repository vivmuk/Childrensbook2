#!/usr/bin/env node
/**
 * Which model should paint which style?
 *
 * One model for everything was the wrong shape. flux-2-max paints beautifully
 * but it cannot do print texture, torn paper or a cheap comic, so those styles
 * came back looking like ordinary paintings wearing a costume. This asks the
 * same styles of several models, from the same brief, and puts the results in
 * one folder to be looked at side by side.
 *
 *   node scripts/style-model-routing-test.mjs
 *
 * Writes .impeccable/type/model-routing/<style>--<model>.webp
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '.impeccable', 'type', 'model-routing')
const API_KEY = process.env.VENICE_API_KEY

const BUILT = path.join(ROOT, '.kq-build', 'illustration-style.js')
const { buildIllustrationPrompt, ILLUSTRATION_STYLES } = await import(BUILT)

/** The styles that failed, plus one painting style to price-check the cheap model. */
const STYLES = ['papercut', 'amar-chitra', 'chacha-chaudhary', 'gouache']
const MODELS = ['gpt-image-2-5-flare', 'qwen-image-3']

const SCENE =
  'A child of about six in a warm coat sits on a tree stump at dusk with a small friendly ' +
  'squirrel beside them, both looking at an open book held between them. A storm lantern on ' +
  'the ground beside the stump is the only light, and beyond them the ground falls away into ' +
  'quiet dark hills and a sky with a few early stars. Shot: medium wide.'

const CHARACTERS =
  'The child: about six, short dark curly hair, a mustard-yellow coat, green boots. ' +
  'The squirrel: small, russet brown, one white ear, a fluffy tail. Keep both identical.'

const NEGATIVE =
  'text, letters, words, lettering, signage, watermark, signature, logo, border, frame, ' +
  'vignette, white margin, neon, lens flare, pure black, 3d render, photograph'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shoot(model, prompt) {
  let aspect = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const size = aspect ? { aspect_ratio: '4:3' } : { width: 1024, height: 768 }
      const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, prompt, ...size, format: 'webp',
          hide_watermark: true, safe_mode: true, negative_prompt: NEGATIVE,
        }),
      })
      if (!res.ok) {
        const body = (await res.text()).slice(0, 150)
        if (res.status === 400 && /aspect_ratio/.test(body) && !aspect) { aspect = true; continue }
        if ([401, 402, 404].includes(res.status)) return { ok: false, why: `http ${res.status}` }
        await sleep(attempt * 2500); continue
      }
      const data = await res.json()
      const b64 = data.images?.[0]
      if (!b64) { await sleep(attempt * 2500); continue }
      const bytes = Buffer.from(b64, 'base64')
      // a few kilobytes is the blank-render signature: an HTTP 200 with no picture
      if (bytes.length < 12000) return { ok: false, why: `blank render (${bytes.length} bytes)` }
      return { ok: true, bytes }
    } catch (err) {
      if (attempt === 3) return { ok: false, why: err.message }
      await sleep(attempt * 2500)
    }
  }
  return { ok: false, why: 'no image after 3 attempts' }
}

if (!API_KEY) { console.error('VENICE_API_KEY is not set.'); process.exit(1) }
await mkdir(OUT, { recursive: true })

const results = []
for (const style of STYLES) {
  const label = ILLUSTRATION_STYLES.find((s) => s.value === style)?.label || style
  for (const model of MODELS) {
    const prompt = buildIllustrationPrompt({ style, characters: CHARACTERS, scene: SCENE })
    process.stdout.write(`${label} (${style}) on ${model} — prompt ${prompt.length} chars ... `)
    const r = await shoot(model, prompt)
    if (r.ok) {
      await writeFile(path.join(OUT, `${style}--${model}.webp`), r.bytes)
      console.log(`ok ${Math.round(r.bytes.length / 1024)} KB`)
      results.push({ style, model, ok: true })
    } else {
      console.log(`FAILED ${r.why}`)
      results.push({ style, model, ok: false, why: r.why })
    }
  }
}

await writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1))
console.log('\nLook at the folder, then decide per style.')
