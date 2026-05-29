import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

// MiniMax Music 2.6 — generates a full sung song from a style prompt + lyrics,
// which is exactly what we want for a children's sing-along theme.
// Per /models?type=music: supports_lyrics=true, supports_lyrics_optimizer=false,
// prompt ≤300 chars, lyrics ≤1000 chars, mp3 output.
const MUSIC_MODEL = 'minimax-music-v26'
const PROMPT_LIMIT = 300
const LYRICS_LIMIT = 1000

// Writes a short, cheerful, age-appropriate set of lyrics about the book.
// Kept well under MiniMax's 1000-character lyrics limit.
async function generateLyrics(
  title: string, ageRange: string, apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              "You write short, joyful, wholesome children's song lyrics. Output ONLY the lyrics — one [Verse] and one repeating [Chorus], 6–10 short lines total, easy rhymes, gentle and positive, suitable for young children. Keep it well under 1000 characters. No title, no explanation, no profanity.",
          },
          {
            role: 'user',
            content: `Write a short cheerful theme song for a children's picture book titled "${title}" for around ${ageRange} grade readers.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 350,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    let lyrics: string | undefined = data.choices?.[0]?.message?.content?.trim()
    if (!lyrics) return null
    // Hard-clamp to the model's lyrics limit (trim to a clean line break).
    if (lyrics.length > LYRICS_LIMIT) {
      lyrics = lyrics.slice(0, LYRICS_LIMIT)
      const lastBreak = lyrics.lastIndexOf('\n')
      if (lastBreak > 200) lyrics = lyrics.slice(0, lastBreak)
    }
    return lyrics
  } catch {
    return null
  }
}

// Queues an original SUNG theme song for a book using Venice's music API
// (POST /audio/queue). Returns a queue_id the client polls via /api/song-retrieve.
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

    // A style/mood prompt describing the sound we want.
    const moodByStyle: Record<string, string> = {
      ghibli: 'dreamy, gentle, and nostalgic',
      miyazaki: 'sweeping, wondrous, and heartfelt',
      watercolor: 'soft, delicate, and soothing',
      pixar: 'playful, bright, and adventurous',
      anime: 'energetic, bright, and heroic',
    }
    const mood = moodByStyle[book.illustrationStyle] || 'cheerful and magical'
    // Keep within MiniMax's 300-char prompt limit (title can be long).
    const musicPrompt = (
      `A ${mood} children's sing-along theme song for "${book.title}". ` +
      'Upbeat, wholesome, warm vocals a child can sing along to, playful kids pop/folk, light acoustic.'
    ).slice(0, PROMPT_LIMIT)

    // Write kid-friendly lyrics about the book for MiniMax to sing.
    // v26 does NOT support lyrics_optimizer, so if lyric generation fails we
    // send the prompt alone (lyrics are optional for this model).
    const lyrics = await generateLyrics(book.title, book.ageRange, apiKey)

    const body: Record<string, unknown> = { model: MUSIC_MODEL, prompt: musicPrompt }
    if (lyrics) body.lyrics_prompt = lyrics

    const queueRes = await fetch('https://api.venice.ai/api/v1/audio/queue', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

    console.log(`[${params.bookId}] Queued song with model ${MUSIC_MODEL} (lyrics: ${!!lyrics})`)
    return NextResponse.json({ status: 'processing', queueId, model: MUSIC_MODEL })
  } catch (err: any) {
    console.error('generate-song error:', err)
    return NextResponse.json({ error: err.message || 'Failed to start theme song' }, { status: 500 })
  }
}
