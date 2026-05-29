import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

// Queues an original theme song for a book using Venice's music generation API
// (POST /audio/queue, model `elevenlabs-music`). Returns a queue_id the client
// polls via /api/song-retrieve.
export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } },
) {
  try {
    const { userApiKey } = await request.json().catch(() => ({}))

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Venice API key available. Please provide your Venice AI API key.' },
        { status: 500 },
      )
    }

    const book = await getBook(params.bookId)
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // If a song already exists, hand it straight back.
    if (book.songUrl) {
      return NextResponse.json({ status: 'complete', songUrl: book.songUrl })
    }

    // Craft a warm, kid-friendly instrumental theme tailored to the book.
    const moodByStyle: Record<string, string> = {
      ghibli: 'dreamy, gentle, and nostalgic',
      miyazaki: 'sweeping, wondrous, and heartfelt',
      watercolor: 'soft, delicate, and soothing',
      pixar: 'playful, bright, and adventurous',
      anime: 'energetic, bright, and heroic',
    }
    const mood = moodByStyle[book.illustrationStyle] || 'cheerful and magical'

    const musicPrompt =
      `An original ${mood} theme song for a children's picture book titled "${book.title}". ` +
      'Whimsical and uplifting, with twinkling glockenspiel, soft warm strings, playful woodwinds, ' +
      'and a gentle melody a young child would hum. Instrumental, wholesome, storybook soundtrack.'

    const model = 'elevenlabs-music'
    const queueRes = await fetch('https://api.venice.ai/api/v1/audio/queue', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: musicPrompt,
        duration_seconds: 30,
        force_instrumental: true,
      }),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      console.error('Venice audio queue error:', queueRes.status, errText.slice(0, 300))
      let userMessage = 'Failed to start the theme song. Please try again.'
      if (queueRes.status === 401) userMessage = 'Invalid API key. Please check your Venice AI key.'
      else if (queueRes.status === 429) userMessage = 'AI service is busy. Please try again in a moment.'
      else if (queueRes.status === 402) userMessage = 'Insufficient Venice balance to generate music.'
      return NextResponse.json({ error: userMessage }, { status: queueRes.status })
    }

    const queueData = await queueRes.json()
    const queueId = queueData.queue_id || queueData.id
    if (!queueId) {
      return NextResponse.json({ error: 'No queue ID returned from music service' }, { status: 500 })
    }

    return NextResponse.json({ status: 'processing', queueId, model })
  } catch (err: any) {
    console.error('generate-song error:', err)
    return NextResponse.json({ error: err.message || 'Failed to start theme song' }, { status: 500 })
  }
}
