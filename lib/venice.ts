/**
 * Every call KinderQuill makes to Venice, in one place.
 *
 * Before this file each route carried its own copy of "fetch with a timeout",
 * "retry on 429", "fall back to aspect_ratio when a model refuses width and
 * height" and "read the image out of the response", and the copies had drifted:
 * one assumed every edit came back as PNG, another never retried. The routes
 * now describe what they want and this file deals with the machine.
 *
 * Server only. The API key is passed in by the caller, used in a header, and
 * never logged, echoed into an error, or returned.
 */

export const VENICE_BASE = 'https://api.venice.ai/api/v1'

/* ─────────────────────────────── Plumbing ─────────────────────────────── */

/** fetch with a hard timeout, so one hung request cannot stall a whole book. */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function headers(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A message a parent can read, from a Venice status code. Never the raw body. */
export function friendlyVeniceError(status: number, fallback: string): string {
  if (status === 401) return 'That Venice API key was not accepted. Please check it and try again.'
  if (status === 402) return 'The Venice account is out of credit. Top it up and try again.'
  if (status === 429) return 'Venice is busy right now. Please try again in a minute.'
  if (status === 422) return 'Venice would not paint that. Try wording it a little differently.'
  return fallback
}

/** Runs async tasks through a bounded pool, preserving result order. */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  onEach?: () => void | Promise<void>,
): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
      if (onEach) await onEach()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()))
  return results
}

/* ─────────────────────────────── Models ───────────────────────────────── */

export interface VeniceModel {
  id: string
  name: string
  type: string
  traits: string[]
  /** The whole model_spec, for the few callers that need a constraint. */
  spec: any
}

const modelCache = new Map<string, { at: number; models: VeniceModel[] }>()
const MODEL_TTL = 10 * 60 * 1000

/**
 * The live model list from Venice, cached for ten minutes per type. Models
 * arrive and retire faster than this codebase changes, so the picker and the
 * automatic default read what Venice actually offers today rather than a list
 * typed in here months ago. Returns [] when Venice cannot be reached; callers
 * always have a fallback.
 */
export async function listModels(type: string, apiKey?: string): Promise<VeniceModel[]> {
  const hit = modelCache.get(type)
  if (hit && Date.now() - hit.at < MODEL_TTL) return hit.models
  try {
    const res = await fetchWithTimeout(
      `${VENICE_BASE}/models?type=${encodeURIComponent(type)}`,
      { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} },
      10_000,
    )
    if (!res.ok) return hit?.models || []
    const data = await res.json()
    const models: VeniceModel[] = (data.data || []).map((m: any) => ({
      id: String(m.id),
      name: String(m.model_spec?.name || m.id),
      type: String(m.type || type),
      traits: Array.isArray(m.model_spec?.traits) ? m.model_spec.traits : [],
      spec: m.model_spec || {},
    }))
    modelCache.set(type, { at: Date.now(), models })
    return models
  } catch {
    return hit?.models || []
  }
}

/**
 * The painter used when a parent leaves the model on Automatic.
 *
 * Muse first, when Venice lists it, then Grok Imagine. Muse is matched by name
 * rather than by a hard-coded id because its id was not published when this
 * was written; whichever image model Venice names "Muse" is the one we want.
 */
export const GROK_IMAGE_MODEL = 'grok-imagine-image'
export const GROK_EDIT_MODEL = 'grok-imagine-edit'

/** Reference-image models tried in order when a page is painted around the hero. */
export const EDIT_MODEL_FALLBACKS = [GROK_EDIT_MODEL, 'nano-banana-2-edit', 'qwen-image-2-edit']

export async function resolveDefaultImageModel(apiKey: string): Promise<string> {
  const models = await listModels('image', apiKey)
  const muse = models.find((m) => /muse/i.test(m.id) || /muse/i.test(m.name))
  if (muse) return muse.id
  const grok = models.find((m) => m.id === GROK_IMAGE_MODEL) || models.find((m) => /grok/i.test(m.id))
  if (grok) return grok.id
  return GROK_IMAGE_MODEL
}

/** The edit model used when Automatic: a Muse edit model if listed, else Grok's. */
export async function resolveDefaultEditModel(apiKey: string): Promise<string> {
  const models = await listModels('inpaint', apiKey)
  const muse = models.find((m) => /muse/i.test(m.id) || /muse/i.test(m.name))
  if (muse) return muse.id
  return GROK_EDIT_MODEL
}

/* ─────────────────────────────── Images ───────────────────────────────── */

export interface ImageResult {
  /** A complete data URL, ready to store or show. */
  dataUrl: string
}

const ASPECTS: [string, number][] = [
  ['1:1', 1], ['3:2', 1.5], ['2:3', 0.667], ['16:9', 1.778], ['9:16', 0.5625], ['4:3', 1.333], ['3:4', 0.75],
]

/** The nearest of the ratios the image API accepts. */
export function closestAspect(width: number, height: number): string {
  const target = width / height
  return ASPECTS.reduce((best, o) => (Math.abs(o[1] - target) < Math.abs(best[1] - target) ? o : best))[0]
}

export interface GenerateImageOptions {
  prompt: string
  model: string
  width: number
  height: number
  seed?: number
  negativePrompt?: string
  maxAttempts?: number
}

/**
 * Text to image. Older models want width and height, newer ones refuse them
 * and want aspect_ratio, and a few refuse negative_prompt or cfg_scale. Each
 * refusal arrives as a 400 naming the field, so the request is reshaped and
 * sent again rather than giving up on the page.
 */
export async function generateImage(apiKey: string, opts: GenerateImageOptions): Promise<ImageResult | null> {
  const { prompt, model, width, height, seed, negativePrompt, maxAttempts = 3 } = opts
  let useAspect = /grok|nano-banana|gpt-image|muse|seedream|imagen/i.test(model)
  let sendNegative = !!negativePrompt
  let sendTuning = true

  for (let attempt = 1; attempt <= maxAttempts + 2; attempt++) {
    try {
      const body: Record<string, unknown> = {
        model,
        prompt,
        format: 'webp',
        hide_watermark: true,
        safe_mode: true,
        ...(useAspect ? { aspect_ratio: closestAspect(width, height) } : { width, height }),
        ...(seed !== undefined ? { seed } : {}),
        ...(sendNegative ? { negative_prompt: negativePrompt } : {}),
        ...(sendTuning ? { cfg_scale: 7, steps: 20 } : {}),
      }
      const res = await fetchWithTimeout(
        `${VENICE_BASE}/image/generate`,
        { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) },
        120_000,
      )
      if (res.ok) {
        const data = await res.json()
        const img = data.images?.[0]
        if (img) return { dataUrl: img.startsWith('data:') ? img : `data:image/webp;base64,${img}` }
      } else {
        const text = (await res.text()).slice(0, 300)
        console.error(`[venice] image/generate ${model} ${res.status}: ${text.slice(0, 160)}`)
        if (res.status === 400) {
          if (!useAspect && /width|height|aspect/i.test(text)) { useAspect = true; continue }
          if (useAspect && /aspect/i.test(text)) { useAspect = false; continue }
          if (sendNegative && /negative/i.test(text)) { sendNegative = false; continue }
          if (sendTuning && /cfg|steps/i.test(text)) { sendTuning = false; continue }
          return null
        }
        if (res.status === 401 || res.status === 402 || res.status === 422) return null
      }
    } catch (err: any) {
      console.error(`[venice] image/generate ${model} exception: ${err?.name || 'error'}`)
    }
    if (attempt < maxAttempts) await sleep(attempt * 2000)
    else break
  }
  return null
}

async function readImageResponse(res: Response): Promise<ImageResult | null> {
  const type = (res.headers.get('content-type') || '').split(';')[0]
  if (type.startsWith('image/')) {
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) return null
    return { dataUrl: `data:${type};base64,${buf.toString('base64')}` }
  }
  // Some models answer in JSON with base64 images inside.
  const data = await res.json().catch(() => null)
  const img = data?.images?.[0] || data?.image
  if (typeof img === 'string') return { dataUrl: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
  return null
}

function stripDataUrl(image: string): string {
  return image.replace(/^data:[^;]+;base64,/, '')
}

const EDIT_ASPECTS = ['1:1', '3:2', '16:9', '21:9', '9:16', '2:3', '3:4', '4:5']

export interface EditImageOptions {
  /** The reference: a data URL, raw base64, or https URL. */
  image: string
  prompt: string
  model?: string
  aspectRatio?: string
  maxAttempts?: number
  /** Models to try in turn if the first one refuses. */
  fallbacks?: string[]
}

/**
 * Image to image. This is how the hero gets into every page: the approved
 * character sheet goes in as the reference and the page brief as the prompt.
 * If the chosen edit model refuses, the next in the fallback list is tried, so
 * a model being retired does not take every page down with it.
 */
export async function editImage(apiKey: string, opts: EditImageOptions): Promise<ImageResult | null> {
  const { image, prompt, aspectRatio, maxAttempts = 2 } = opts
  const models = Array.from(new Set([opts.model || GROK_EDIT_MODEL, ...(opts.fallbacks || [])]))
  const ref = /^https?:/.test(image) ? image : stripDataUrl(image)
  const aspect = aspectRatio && EDIT_ASPECTS.includes(aspectRatio) ? aspectRatio : undefined

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetchWithTimeout(
          `${VENICE_BASE}/image/edit`,
          {
            method: 'POST',
            headers: headers(apiKey),
            body: JSON.stringify({
              model,
              prompt,
              image: ref,
              ...(aspect ? { aspect_ratio: aspect } : {}),
              output_format: 'webp',
              safe_mode: true,
            }),
          },
          120_000,
        )
        if (res.ok) {
          const out = await readImageResponse(res)
          if (out) return out
        } else {
          const text = (await res.text()).slice(0, 200)
          console.error(`[venice] image/edit ${model} ${res.status}: ${text.slice(0, 160)}`)
          if (res.status === 401 || res.status === 402) return null
          // A 400 or 422 will not change on a retry with this model; move on.
          if (res.status === 400 || res.status === 422 || res.status === 404) break
        }
      } catch (err: any) {
        console.error(`[venice] image/edit ${model} exception: ${err?.name || 'error'}`)
      }
      if (attempt < maxAttempts) await sleep(attempt * 2000)
    }
  }
  return null
}

/**
 * Compose up to three images. Used to put two saved heroes into one picture,
 * or the hero into an existing page when a parent asks for a change.
 */
export async function multiEditImage(
  apiKey: string,
  opts: { images: string[]; prompt: string; model?: string; aspectRatio?: string },
): Promise<ImageResult | null> {
  try {
    const res = await fetchWithTimeout(
      `${VENICE_BASE}/image/multi-edit`,
      {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          modelId: opts.model || GROK_EDIT_MODEL,
          prompt: opts.prompt,
          images: opts.images.slice(0, 3).map((i) => (/^https?:/.test(i) ? i : stripDataUrl(i))),
          ...(opts.aspectRatio && EDIT_ASPECTS.includes(opts.aspectRatio) ? { aspect_ratio: opts.aspectRatio } : {}),
          output_format: 'webp',
          safe_mode: true,
        }),
      },
      120_000,
    )
    if (!res.ok) {
      console.error(`[venice] image/multi-edit ${res.status}`)
      return null
    }
    return await readImageResponse(res)
  } catch {
    return null
  }
}

/** Sharpen and enlarge a finished page for print. Returns null rather than throwing. */
export async function upscaleImage(apiKey: string, image: string, scale = 2): Promise<ImageResult | null> {
  try {
    const res = await fetchWithTimeout(
      `${VENICE_BASE}/image/upscale`,
      {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({ image: stripDataUrl(image), scale, enhance: true, enhanceCreativity: 0.15 }),
      },
      120_000,
    )
    if (!res.ok) return null
    return await readImageResponse(res)
  } catch {
    return null
  }
}

/* ─────────────────────────────── Text ─────────────────────────────────── */

/** The writers, in the order they are tried. */
export const STORY_MODELS = ['gemini-3-flash-preview', 'venice-uncensored', 'nvidia-nemotron-3-nano-30b-a3b']

/** Pulls the first complete JSON object out of a model's answer. */
export function parseModelJSON(raw: string): any {
  const s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const first = s.indexOf('{')
  if (first === -1) throw new Error('No JSON object found')
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = first; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return JSON.parse(s.substring(first, i + 1).replace(/,(\s*[}\]])/g, '$1'))
    }
  }
  // Truncated: close whatever is still open and hope the pages survived.
  const stack: string[] = []
  inStr = false
  escape = false
  let body = s.substring(first)
  for (const ch of body) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }
  if (inStr) body += '"'
  body = body.replace(/,\s*$/, '')
  for (let i = stack.length - 1; i >= 0; i--) body += stack[i] === '{' ? '}' : ']'
  return JSON.parse(body.replace(/,(\s*[}\]])/g, '$1'))
}

export interface ChatOptions {
  system: string
  user: string | any[]
  json?: boolean
  temperature?: number
  maxTokens?: number
  models?: string[]
  timeoutMs?: number
}

/**
 * One chat completion, trying each writer in turn and backing off on 429.
 * Returns the message text, or throws an Error whose message is safe to show.
 */
export async function chat(apiKey: string, opts: ChatOptions): Promise<string> {
  const models = opts.models || STORY_MODELS
  let lastStatus = 0
  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let res: Response
      try {
        res = await fetchWithTimeout(
          `${VENICE_BASE}/chat/completions`,
          {
            method: 'POST',
            headers: headers(apiKey),
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content: opts.user },
              ],
              temperature: opts.temperature ?? 0.8,
              max_tokens: opts.maxTokens ?? 2000,
              ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
              venice_parameters: { include_venice_system_prompt: false },
            }),
          },
          opts.timeoutMs ?? 120_000,
        )
      } catch {
        lastStatus = 504
        break
      }
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const content = data?.choices?.[0]?.message?.content
        if (typeof content === 'string' && content.trim()) return content.trim()
        break
      }
      lastStatus = res.status
      await res.text().catch(() => '')
      if (res.status === 401 || res.status === 402) throw new Error(friendlyVeniceError(res.status, ''))
      if (res.status === 429 && attempt < 3) { await sleep(attempt * 4000); continue }
      break
    }
  }
  throw new Error(friendlyVeniceError(lastStatus, 'The story writer did not answer. Please try again.'))
}

/* ─────────────────────────────── Speech ───────────────────────────────── */

import { getNarrator, NARRATORS, type Narrator } from './narrators'
export { getNarrator, NARRATORS, type Narrator }

/** Kokoro voices speak one language each, so other languages go to a multilingual model. */
const MULTILINGUAL: Narrator = {
  value: 'multi', label: 'Storyteller', description: '', model: 'tts-minimax-speech-02-hd', voice: 'WiseWoman',
}

/**
 * Speak one passage. Returns an mp3 data URL, or null. If the premium voice
 * refuses, the passage is spoken again by the house Kokoro voice, so a read
 * aloud never comes back silent because one provider was down.
 */
export async function speak(
  apiKey: string,
  text: string,
  opts: { narrator?: string; language?: string; speed?: number } = {},
): Promise<string | null> {
  const english = !opts.language || /^english$/i.test(opts.language)
  const chosen = english ? getNarrator(opts.narrator) : MULTILINGUAL
  const attempts: Narrator[] = chosen.model === 'tts-kokoro' ? [chosen] : [chosen, NARRATORS[0]]
  const input = text.length > 4096 ? text.slice(0, 4093) + '...' : text

  for (const n of attempts) {
    try {
      const res = await fetchWithTimeout(
        `${VENICE_BASE}/audio/speech`,
        {
          method: 'POST',
          headers: headers(apiKey),
          body: JSON.stringify({
            model: n.model,
            voice: n.voice,
            input,
            response_format: 'mp3',
            speed: opts.speed ?? 0.95,
            streaming: false,
            ...(!english && opts.language ? { language: opts.language } : {}),
          }),
        },
        90_000,
      )
      if (!res.ok) {
        console.error(`[venice] audio/speech ${n.model} ${res.status}`)
        await res.text().catch(() => '')
        if (res.status === 401 || res.status === 402) return null
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length) return `data:audio/mpeg;base64,${buf.toString('base64')}`
    } catch {
      // try the next voice
    }
  }
  return null
}

/* ─────────────────────────────── Music ────────────────────────────────── */

export const SONG_MODEL = 'minimax-music-v26'
export const INSTRUMENTAL_MODELS = ['elevenlabs-music', SONG_MODEL]

/** Queue a piece of music. Returns the queue id and the model that accepted it. */
export async function queueMusic(
  apiKey: string,
  opts: { prompt: string; lyrics?: string; instrumental?: boolean; durationSeconds?: number },
): Promise<{ queueId: string; model: string } | { error: string; status: number }> {
  const models = opts.instrumental ? INSTRUMENTAL_MODELS : [SONG_MODEL]
  let last = { error: 'The music studio did not answer. Please try again.', status: 502 }
  for (const model of models) {
    const body: Record<string, unknown> = { model, prompt: opts.prompt.slice(0, 300) }
    if (opts.lyrics && !opts.instrumental) body.lyrics_prompt = opts.lyrics.slice(0, 1000)
    if (opts.instrumental && model !== SONG_MODEL) {
      body.force_instrumental = true
      if (opts.durationSeconds) body.duration_seconds = opts.durationSeconds
    }
    if (opts.instrumental && model === SONG_MODEL) {
      body.prompt = `${opts.prompt} Instrumental only, no vocals, no singing.`.slice(0, 300)
    }
    try {
      const res = await fetchWithTimeout(
        `${VENICE_BASE}/audio/queue`,
        { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) },
        30_000,
      )
      if (res.ok) {
        const data = await res.json()
        const queueId = data.queue_id || data.id
        if (queueId) return { queueId, model: data.model || model }
      } else {
        await res.text().catch(() => '')
        last = { error: friendlyVeniceError(res.status, 'The music studio could not start this song.'), status: res.status }
        if (res.status === 401 || res.status === 402) return last
      }
    } catch {
      // try the next model
    }
  }
  return last
}

/** Poll a queued piece of music. */
export async function retrieveMusic(
  apiKey: string,
  queueId: string,
  model?: string,
): Promise<{ status: 'complete'; dataUrl: string } | { status: 'processing'; elapsed: number; averageTime: number } | { status: 'error'; error: string }> {
  try {
    const res = await fetchWithTimeout(
      `${VENICE_BASE}/audio/retrieve`,
      { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ queue_id: queueId, ...(model ? { model } : {}) }) },
      60_000,
    )
    if (res.status === 404) return { status: 'processing', elapsed: 0, averageTime: 60000 }
    if (!res.ok) {
      await res.text().catch(() => '')
      return { status: 'error', error: friendlyVeniceError(res.status, 'The song could not be finished.') }
    }
    const type = (res.headers.get('content-type') || '').split(';')[0]
    if (type.startsWith('audio/')) {
      const buf = Buffer.from(await res.arrayBuffer())
      return { status: 'complete', dataUrl: `data:${type};base64,${buf.toString('base64')}` }
    }
    const data = await res.json().catch(() => ({}))
    if (data.status === 'FAILED' || data.status === 'ERROR') {
      return { status: 'error', error: 'The song could not be finished.' }
    }
    // Some models hand back a URL or base64 inside JSON once complete.
    const url = data.audio_url || data.url || data.audio
    if (typeof url === 'string' && url) {
      if (url.startsWith('data:')) return { status: 'complete', dataUrl: url }
      if (/^https?:/.test(url)) {
        const audio = await fetchWithTimeout(url, {}, 60_000)
        if (audio.ok) {
          const t = (audio.headers.get('content-type') || 'audio/mpeg').split(';')[0]
          const buf = Buffer.from(await audio.arrayBuffer())
          return { status: 'complete', dataUrl: `data:${t};base64,${buf.toString('base64')}` }
        }
      }
    }
    return {
      status: 'processing',
      elapsed: data.execution_duration ?? 0,
      averageTime: data.average_execution_time ?? 60000,
    }
  } catch {
    return { status: 'processing', elapsed: 0, averageTime: 60000 }
  }
}

/** The key a request should use: the parent's own first, then the site's. */
export function resolveApiKey(userKey?: unknown): string | undefined {
  const k = typeof userKey === 'string' ? userKey.trim() : ''
  return k || process.env.VENICE_API_KEY || undefined
}
