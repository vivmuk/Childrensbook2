import { NextRequest, NextResponse } from 'next/server'
import { getBook, setBook, type BookSong } from '@/lib/storage'
import { SONG_KINDS, type SongKind } from '@/lib/songs'
import { resolveApiKey, retrieveMusic } from '@/lib/venice'

export const maxDuration = 90

/**
 * Poll a queued song. While it renders this answers { status: 'processing' };
 * once it is ready the song is kept on the book (with its words, so the
 * reader can show them) and returned.
 */
export async function POST(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { queueId, model, userApiKey, kind: rawKind, title, lyrics } = await request.json()
    const kind: SongKind = rawKind && rawKind in SONG_KINDS ? rawKind : 'theme'
    const apiKey = resolveApiKey(userApiKey)
    if (!apiKey) return NextResponse.json({ error: 'No API key available' }, { status: 400 })
    if (!queueId) return NextResponse.json({ error: 'Missing queueId' }, { status: 400 })

    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    const already = book.meta?.songs?.find(s => s.kind === kind)
    if (already) return NextResponse.json({ status: 'complete', song: already, songUrl: already.url })

    const result = await retrieveMusic(apiKey, String(queueId), model ? String(model) : undefined)
    if (result.status === 'processing') {
      return NextResponse.json({ status: 'processing', elapsed: result.elapsed, averageTime: result.averageTime })
    }
    if (result.status === 'error') return NextResponse.json({ error: result.error }, { status: 502 })

    const song: BookSong = {
      kind,
      title: typeof title === 'string' && title ? title.slice(0, 80) : SONG_KINDS[kind].label,
      url: result.dataUrl,
      ...(typeof lyrics === 'string' && lyrics ? { lyrics: lyrics.slice(0, 1200) } : {}),
      createdAt: new Date().toISOString(),
    }

    if (!book.isSample) {
      const fresh = (await getBook(params.bookId)) || book
      const meta = fresh.meta || {}
      meta.songs = [...(meta.songs || []).filter(s => s.kind !== kind), song]
      fresh.meta = meta
      if (kind === 'theme') fresh.songUrl = song.url
      await setBook(params.bookId, fresh)
    }

    return NextResponse.json({ status: 'complete', song, songUrl: song.url })
  } catch (err: any) {
    console.error('song-retrieve error:', err?.message)
    return NextResponse.json({ error: 'Failed to retrieve the song' }, { status: 500 })
  }
}
