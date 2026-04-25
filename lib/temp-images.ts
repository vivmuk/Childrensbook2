// In-memory store for temporary images that need to be served as HTTP URLs
// (used by Venice video API which requires real HTTP URLs, not base64 data URIs)

interface TempImage {
  data: Buffer
  contentType: string
  expiresAt: number
}

const store = new Map<string, TempImage>()
const TTL_MS = 30 * 60 * 1000 // 30 minutes

function cleanup() {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id)
  }
}

export function storeTempImage(data: Buffer, contentType: string): string {
  cleanup()
  const id = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  store.set(id, { data, contentType, expiresAt: Date.now() + TTL_MS })
  return id
}

export function getTempImage(id: string): { data: Buffer; contentType: string } | null {
  const entry = store.get(id)
  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(id)
    return null
  }
  return { data: entry.data, contentType: entry.contentType }
}
