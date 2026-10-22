import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import { musicPrompt, SONG_KINDS, writeLyrics, type SongKind } from '@/lib/songs'
import { queueMusic, resolveApiKey } from '@/lib/venice'

export const maxDuration = 120

/**
 * Start a song for a book. The words are written from the book's own pages,
 * then the music is queued with Venice; the reader polls /api/song-retrieve
 * until it is ready. A song that already exists is handed straight back.
 */
export async function POST(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { userApiKey, kind: rawKind } = await request.json().catch(() => ({}))
    const kind: SongKind = rawKind && rawKind in SONG_KINDS ? rawKind : 'theme'

    const apiKey = resolveApiKey(userApiKey)
    if (!apiKey) {
      return NextResponse.json({ error: 'Add your Venice API key to make a song.' }, { status: 400 })
    }

    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const existing = book.meta?.songs?.find(s => s.kind === kind)
    if (existing) return NextResponse.json({ status: 'complete', song: existing, songUrl: existing.url })
    if (kind === 'theme' && book.songUrl) {
      return NextResponse.json({
        status: 'complete',
        songUrl: book.songUrl,
        song: { kind, title: SONG_KINDS.theme.label, url: book.songUrl, createdAt: book.createdAt },
      })
    }

    let title: string = SONG_KINDS[kind].label
    let lyrics: string | undefined
    if (!SONG_KINDS[kind].instrumental) {
      try {
        const written = await writeLyrics(book, kind, apiKey)
        title = written.title
        lyrics = written.lyrics
      } catch {
        // The music model can still sing from the prompt alone.
      }
    }

    const queued = await queueMusic(apiKey, {
      prompt: musicPrompt(book, kind),
      lyrics,
      instrumental: SONG_KINDS[kind].instrumental,
      durationSeconds: kind === 'background' ? 120 : undefined,
    })
    if ('error' in queued) return NextResponse.json({ error: queued.error }, { status: queued.status })

    return NextResponse.json({ status: 'processing', queueId: queued.queueId, model: queued.model, kind, title, lyrics })
  } catch (err: any) {
    console.error('generate-song error:', err?.message)
    return NextResponse.json({ error: 'Failed to start the song. Please try again.' }, { status: 500 })
  }
}
