import { NextRequest, NextResponse } from 'next/server'
import { getBook, setBook } from '@/lib/storage'

// Polls Venice for a queued theme song (POST /audio/retrieve). While the song is
// still rendering it returns { status: 'processing' }; once ready it persists the
// audio onto the book and returns { status: 'complete', songUrl }.
export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } },
) {
  try {
    const { queueId, model, userApiKey } = await request.json()

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key available' }, { status: 500 })
    }
    if (!queueId) {
      return NextResponse.json({ error: 'Missing queueId' }, { status: 400 })
    }

    // Already saved on a prior poll? Return it.
    const existing = await getBook(params.bookId)
    if (existing?.songUrl) {
      return NextResponse.json({ status: 'complete', songUrl: existing.songUrl })
    }

    const retrieveRes = await fetch('https://api.venice.ai/api/v1/audio/retrieve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId, ...(model && { model }) }),
    })

    if (!retrieveRes.ok) {
      const errText = await retrieveRes.text()
      // 404 typically means the job isn't ready yet — treat as still processing.
      if (retrieveRes.status === 404) {
        return NextResponse.json({ status: 'processing', averageTime: 30000, elapsed: 0 })
      }
      console.error('Venice audio retrieve error:', retrieveRes.status, errText.slice(0, 200))
      return NextResponse.json(
        { error: `Failed to retrieve song: ${errText || retrieveRes.statusText}` },
        { status: retrieveRes.status },
      )
    }

    const contentType = retrieveRes.headers.get('Content-Type') || ''

    if (contentType.startsWith('audio/')) {
      const audioBuffer = await retrieveRes.arrayBuffer()
      const base64 = Buffer.from(audioBuffer).toString('base64')
      const songUrl = `data:${contentType.split(';')[0]};base64,${base64}`

      // Persist onto the book so it only has to be generated once.
      const book = await getBook(params.bookId)
      if (book) {
        book.songUrl = songUrl
        await setBook(params.bookId, book)
      }

      return NextResponse.json({ status: 'complete', songUrl })
    }

    // Still processing — surface timing estimates for the progress UI.
    const data = await retrieveRes.json().catch(() => ({}))
    return NextResponse.json({
      status: 'processing',
      averageTime: data.average_execution_time ?? 30000,
      elapsed: data.execution_duration ?? 0,
    })
  } catch (err: any) {
    console.error('song-retrieve error:', err)
    return NextResponse.json({ error: err.message || 'Failed to retrieve song' }, { status: 500 })
  }
}
