'use client'

/**
 * The book as the browser sees it, and the little helpers every screen that
 * shows one needs. Kept in one place so the reader, the studio and the share
 * page agree on what a book is.
 */

export interface ClientPage {
  pageNumber?: number
  text: string
  image: string
}

export interface ClientSong {
  kind: 'theme' | 'story' | 'lullaby' | 'background'
  title: string
  url: string
  lyrics?: string
  createdAt?: string
}

export interface ClientBook {
  id: string
  title: string
  titlePage?: { image: string; title: string }
  pages: ClientPage[]
  ageRange: string
  illustrationStyle: string
  audioUrl?: string
  songUrl?: string
  narratorVoice?: string
  isSample?: boolean
  meta?: {
    heroImage?: string
    heroName?: string
    heroDescription?: string
    scenes?: Array<{ imageDescription?: string; shotType?: string }>
    language?: string
    narration?: Array<{ text: string; url: string; narrator: string } | null>
    coverNarration?: { text: string; url: string; narrator: string }
    songs?: ClientSong[]
    dedication?: string
    author?: string
  }
}

export const LS_API_KEY = 'kinderquill_venice_api_key'
export const LS_NARRATOR = 'kinderquill_narrator'

export function readApiKey(): string {
  try { return localStorage.getItem(LS_API_KEY) || '' } catch { return '' }
}

/** The songs a book has, including a theme song made before songs had kinds. */
export function bookSongs(book: ClientBook): ClientSong[] {
  const songs = [...(book.meta?.songs || [])]
  if (book.songUrl && !songs.some(s => s.kind === 'theme')) {
    songs.push({ kind: 'theme', title: 'Theme song', url: book.songUrl })
  }
  return songs
}

/** Words with the spaces after them, so highlighting never reflows the line. */
export function splitWords(text: string): string[] {
  return text.match(/\S+\s*/g) || [text]
}

/**
 * Which word is being spoken, from how far through the audio we are. Speech
 * is close enough to even across characters that weighting each word by its
 * length lands within a word of the voice, which is what a child needs to
 * follow along. Short pauses at full stops are allowed for.
 */
export function wordAtFraction(words: string[], fraction: number): number {
  const weights = words.map(w => w.trim().length + (/[.!?]$/.test(w.trim()) ? 4 : /[,;:]$/.test(w.trim()) ? 2 : 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let target = Math.max(0, Math.min(1, fraction)) * total
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i]
    if (target <= 0) return i
  }
  return words.length - 1
}
