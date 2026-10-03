#!/usr/bin/env node
/**
 * Which image model can actually spell?
 *
 * Asks several models for the SAME picture with the SAME words in it, then puts
 * the results side by side. Pictures are easy; lettering is where image models
 * fall over, so this is the only honest way to choose one that renders text.
 *
 *   node scripts/text-model-bakeoff.mjs
 *
 * Writes .impeccable/type/text-bakeoff/<model>.webp and prints a table of what
 * each one cost and how long it took. Spelling is judged by eye afterwards.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '.impeccable', 'type', 'text-bakeoff')
const API_KEY = process.env.VENICE_API_KEY

/**
 * The candidates, cheapest first. Every one of these has a reputation for
 * lettering; the point of the test is to find out which reputation is earned.
 */
const CANDIDATES = [
  { model: 'qwen-image',            note: 'Venice rates this its highest quality trait' },
  { model: 'gpt-image-2-5-flare',   note: 'GPT Image, low quality tier' },
  { model: 'ideogram-v4-5',         note: 'Ideogram, the typography specialist' },
  { model: 'qwen-image-3',          note: 'newer Qwen image' },
  { model: 'recraft-v4',            note: 'Recraft, strong at type and layout' },
  { model: 'seedream-v5-lite',      note: 'Seedream lite' },
]

const TITLE = 'The Lantern That Would Not Go Out'
const BYLINE = 'A KinderQuill Story'

const PROMPT =
  'A children\u2019s picture book cover, hand painted in gouache. A small child in a mustard ' +
  'coat kneels on a jetty holding a lit brass lantern, and a small brown squirrel sits beside ' +
  'them, at dusk. The picture has been lettered by a real typesetter: the title ' +
  `"${TITLE}" is written across the upper third in warm cream hand-painted capitals, and ` +
  `beneath it in much smaller letters "${BYLINE}". The lettering is correct, complete and ` +
  'perfectly spelled, with no extra words, no invented letters and no gibberish. ' +
  'Deep indigo and plum night, one warm amber light source, painted edge to edge.'

const NEGATIVE = 'misspelled words, extra words, invented letters, gibberish text, watermark, border, frame'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shoot({ model }) {
  const started = Date.now()
  // Newer models reject width/height and want an aspect ratio instead, so start
  // with the old shape and switch to the new one the moment the API says so.
  let useAspectRatio = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const size = useAspectRatio ? { aspect_ratio: '1:1' } : { width: 1024, height: 1024 }
      const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: PROMPT,
          ...size,
          format: 'webp',
          hide_watermark: true,
          safe_mode: true,
          negative_prompt: NEGATIVE,
        }),
      })
      if (!res.ok) {
        const body = (await res.text()).slice(0, 140)
        if (res.status === 400 && /aspect_ratio/.test(body) && !useAspectRatio) {
          console.log('   (this model wants aspect_ratio, retrying that way)')
          useAspectRatio = true
          continue
        }
        if ([401, 402, 404].includes(res.status)) {
          return { model, ok: false, why: `http ${res.status} ${body}` }
        }
        await sleep(attempt * 2500)
        continue
      }
      const data = await res.json()
      const b64 = data.images?.[0]
      if (!b64) { await sleep(attempt * 2500); continue }
      await writeFile(path.join(OUT, `${model}.webp`), Buffer.from(b64, 'base64'))
      return { model, ok: true, ms: Date.now() - started, bytes: Buffer.from(b64, 'base64').length }
    } catch (err) {
      if (attempt === 3) return { model, ok: false, why: err.message }
      await sleep(attempt * 2500)
    }
  }
  return { model, ok: false, why: 'no image after 3 attempts' }
}

if (!API_KEY) { console.error('VENICE_API_KEY is not set.'); process.exit(1) }
await mkdir(OUT, { recursive: true })

const results = []
for (const c of CANDIDATES) {
  process.stdout.write(`${c.model.padEnd(22)} ${c.note}\n`)
  const r = await shoot(c)
  results.push(r)
  console.log(r.ok ? `   ok  ${(r.ms / 1000).toFixed(1)}s  ${Math.round(r.bytes / 1024)} KB` : `   FAILED  ${r.why}`)
}

console.log('\ntext to have spelled correctly:')
console.log(`  "${TITLE}"`)
console.log(`  "${BYLINE}"`)
await writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1))
