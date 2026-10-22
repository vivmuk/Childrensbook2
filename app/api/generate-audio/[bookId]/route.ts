import { NextRequest, NextResponse } from 'next/server'
import { getBook, setBook } from '@/lib/storage'
import { narrateWholeBook } from '@/lib/narration'
import { resolveApiKey } from '@/lib/venice'

export const maxDuration = 300

/**
 * The whole book as one MP3: the cover and every page, spoken by the book's
 * narrator. Pages already spoken in the reader are reused, so this costs only
 * the pages nobody has listened to yet.
 */
export async function POST(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { userApiKey, narrator } = await request.json().catch(() => ({}))
    const apiKey = resolveApiKey(userApiKey)
    if (!apiKey) {
      return NextResponse.json({ error: 'Add your Venice API key to make the audiobook.' }, { status: 400 })
    }

    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    if (book.status !== 'completed') return NextResponse.json({ error: 'Book is not ready yet' }, { status: 400 })

    const audioUrl = await narrateWholeBook(params.bookId, apiKey, typeof narrator === 'string' ? narrator : undefined)
    if (!audioUrl) return NextResponse.json({ error: 'The narrator could not read this book just now.' }, { status: 502 })

    const fresh = (await getBook(params.bookId)) || book
    if (!fresh.isSample) {
      fresh.audioUrl = audioUrl
      await setBook(params.bookId, fresh)
    }
    return NextResponse.json({ audioUrl })
  } catch (error: any) {
    console.error('Error generating audio:', error?.message)
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}
