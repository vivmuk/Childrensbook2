import { NextRequest, NextResponse } from 'next/server'
import { narratePage } from '@/lib/narration'
import { resolveApiKey } from '@/lib/venice'

export const maxDuration = 120

/** Speak one page (or the cover) of a book, cached on the book. */
export async function POST(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { page, narrator, userApiKey } = await request.json()
    const apiKey = resolveApiKey(userApiKey)
    if (!apiKey) return NextResponse.json({ error: 'Add your Venice API key to hear the book read aloud.' }, { status: 400 })
    const which = page === 'cover' ? 'cover' : Number(page)
    if (which !== 'cover' && (!Number.isInteger(which) || which < 0)) {
      return NextResponse.json({ error: 'Which page should be read?' }, { status: 400 })
    }
    const url = await narratePage(params.bookId, which, apiKey, typeof narrator === 'string' ? narrator : undefined)
    if (!url) return NextResponse.json({ error: 'The narrator could not read this page just now.' }, { status: 502 })
    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: 'The narrator could not read this page just now.' }, { status: 500 })
  }
}
