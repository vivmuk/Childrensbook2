import { getBook, setBook, type Book } from './storage'
import { getNarrator, speak } from './venice'

/**
 * Read-aloud, one page at a time.
 *
 * Each page is spoken on its own so the reader can highlight along with the
 * voice and turn the page when it stops, and so a long book never runs into
 * the 4096 character limit of one speech call. A page is spoken once per
 * narrator and kept on the book; it is spoken again only when its words
 * change or a different voice is chosen.
 */

/** What the cover says: the title, and the dedication if there is one. */
export function coverScript(book: Book): string {
  const dedication = book.meta?.dedication ? ` ${book.meta.dedication}` : ''
  return `${book.title}.${dedication}`
}

export async function narratePage(
  bookId: string,
  which: number | 'cover',
  apiKey: string,
  narratorValue?: string,
): Promise<string | null> {
  const book = await getBook(bookId)
  if (!book) return null
  const narrator = getNarrator(narratorValue || book.narratorVoice).value
  const meta = book.meta || {}
  const text = which === 'cover' ? coverScript(book) : book.pages[which]?.text
  if (!text) return null

  const cached = which === 'cover' ? meta.coverNarration : meta.narration?.[which]
  if (cached && cached.text === text && cached.narrator === narrator) return cached.url

  const url = await speak(apiKey, text, { narrator, language: meta.language })
  if (!url) return null

  // Sample books are read only; they are spoken fresh and not kept.
  if (book.isSample) return url

  // Re-read before writing, so two pages spoken close together do not undo each other.
  const fresh = (await getBook(bookId)) || book
  const freshMeta = fresh.meta || {}
  const entry = { text, url, narrator }
  if (which === 'cover') freshMeta.coverNarration = entry
  else {
    const list = freshMeta.narration ? [...freshMeta.narration] : []
    while (list.length < fresh.pages.length) list.push(null)
    if (fresh.pages[which]?.text === text) list[which] = entry
    freshMeta.narration = list
  }
  fresh.meta = freshMeta
  await setBook(bookId, fresh)
  return url
}

/** Every page, spoken and joined into one MP3, the way an audiobook is bought. */
export async function narrateWholeBook(bookId: string, apiKey: string, narratorValue?: string): Promise<string | null> {
  const book = await getBook(bookId)
  if (!book) return null
  const parts: Buffer[] = []
  const cover = await narratePage(bookId, 'cover', apiKey, narratorValue)
  if (cover) parts.push(dataUrlToBuffer(cover))
  for (let i = 0; i < book.pages.length; i++) {
    const url = await narratePage(bookId, i, apiKey, narratorValue)
    if (url) parts.push(dataUrlToBuffer(url))
  }
  if (!parts.length) return null
  // MP3 is a stream of frames, so spoken pages join end to end into one file.
  return `data:audio/mpeg;base64,${Buffer.concat(parts).toString('base64')}`
}

function dataUrlToBuffer(url: string): Buffer {
  return Buffer.from(url.replace(/^data:[^;]+;base64,/, ''), 'base64')
}
