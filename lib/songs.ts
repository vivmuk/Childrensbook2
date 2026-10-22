import type { Book, BookSong } from './storage'
import { chat, parseModelJSON } from './venice'

/**
 * The music a book can have. Each kind is a different job:
 *
 *   theme       a short sing-along about the book, for the car
 *   story       the whole story retold in verses, so it can be sung through
 *   lullaby     the story's world, slowed down for lights out
 *   background  a quiet instrumental bed to play under the read-aloud
 */
export type SongKind = BookSong['kind']

export const SONG_KINDS: Record<SongKind, { label: string; sound: string; instrumental?: boolean }> = {
  theme: {
    label: 'Theme song',
    sound: 'Upbeat, joyful children’s sing-along pop with warm clear vocals, hand claps, ukulele and glockenspiel, an easy catchy chorus a child can sing.',
  },
  story: {
    label: 'Story song',
    sound: 'Warm storytelling folk song for children, gentle acoustic guitar and soft percussion, clear friendly vocals that tell a story verse by verse, a singable chorus.',
  },
  lullaby: {
    label: 'Lullaby',
    sound: 'A soft, slow lullaby for bedtime, gentle humming vocals, music box, harp and warm strings, calm and dreamy, very quiet.',
  },
  background: {
    label: 'Reading music',
    sound: 'Gentle instrumental background music for reading a picture book aloud: soft piano, celesta and warm strings, calm, magical, unobtrusive, steady and even, no vocals.',
    instrumental: true,
  },
}

/** Write the words for a song, from the book itself. */
export async function writeLyrics(book: Book, kind: SongKind, apiKey: string): Promise<{ title: string; lyrics: string }> {
  const story = book.pages.map((p, i) => `Page ${i + 1}: ${p.text}`).join('\n').slice(0, 6000)
  const language = book.meta?.language || 'English'
  const brief: Record<Exclude<SongKind, 'background'>, string> = {
    theme:
      'A short, catchy theme song about the book and its hero. Structure: [Verse] of 4 short lines, [Chorus] of 4 short lines, [Verse] of 4 short lines, [Chorus] again.',
    story:
      'A story song that retells the whole story in order, so a child can follow the book by singing it. Structure: [Verse 1], [Chorus], [Verse 2], [Chorus], [Verse 3], [Chorus]. Each verse 4 short lines; the chorus names the hero and is easy to repeat.',
    lullaby:
      'A gentle lullaby set in the book’s world, where the hero settles down to sleep. Structure: [Verse], [Chorus], [Verse], [Chorus]. Soft words, slow rhythm, sleepy images.',
  }
  const raw = await chat(apiKey, {
    system:
      'You write joyful, wholesome song lyrics for young children: easy rhymes, short lines, vivid and kind, nothing frightening. ' +
      `Write the lyrics in ${language}. The whole lyrics must stay under 900 characters including the section tags. ` +
      'Answer with ONLY a JSON object: {"title":"a short song title","lyrics":"the lyrics, one line per line, with [Verse] and [Chorus] tags on their own lines"}.',
    user: `${brief[kind as Exclude<SongKind, 'background'>]}\n\nThe book is "${book.title}".\n\n${story}`,
    json: true,
    temperature: 0.9,
    maxTokens: 700,
    timeoutMs: 60_000,
  })
  const parsed = parseModelJSON(raw)
  let lyrics = String(parsed.lyrics || '').trim()
  if (lyrics.length > 1000) {
    lyrics = lyrics.slice(0, 1000)
    const cut = lyrics.lastIndexOf('\n')
    if (cut > 300) lyrics = lyrics.slice(0, cut)
  }
  if (!lyrics) throw new Error('The songwriter came back empty. Please try again.')
  return { title: String(parsed.title || `${book.title} song`).slice(0, 80), lyrics }
}

/** The sound of the song, under the music model's 300 character limit. */
export function musicPrompt(book: Book, kind: SongKind): string {
  return `${SONG_KINDS[kind].sound} For the picture book "${book.title}".`.slice(0, 300)
}
