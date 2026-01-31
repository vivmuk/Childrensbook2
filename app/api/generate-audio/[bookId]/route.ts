import { NextRequest, NextResponse } from 'next/server'
import { getBook, setBook } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    // Check API key
    const apiKey = process.env.VENICE_API_KEY
    
    if (!apiKey) {
      console.error('VENICE_API_KEY is not set')
      return NextResponse.json(
        { error: 'Audio generation requires API key configuration' },
        { status: 500 }
      )
    }
    
    console.log('Starting audio generation...')

    const book = await getBook(params.bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.status !== 'completed') {
      return NextResponse.json(
        { error: 'Book is not ready yet' },
        { status: 400 }
      )
    }

    // Combine all page texts into a single narrative
    const fullText = book.pages
      .map((page: any) => page.text)
      .join(' ')
      .trim()

    if (!fullText) {
      return NextResponse.json(
        { error: 'No text content found' },
        { status: 400 }
      )
    }

    // Venice API has a 4096 character limit, so truncate if necessary
    const textToUse = fullText.length > 4096 
      ? fullText.substring(0, 4093) + '...' 
      : fullText

    console.log(`Generating audio for book ${params.bookId}, text length: ${textToUse.length}`)

    // Map narrator voice to Venice voice
    const voiceMap: Record<string, string> = {
      'default': 'af_sky',
      'nova': 'af_sky',
      'alloy': 'am_onyx',
      'echo': 'af_bella',
      'fable': 'am_echo',
      'onyx': 'am_onyx',
      'shimmer': 'af_bella',
    }
    
    const voice = voiceMap[book.narratorVoice || 'default'] || 'af_sky'

    // Generate audio using Venice API
    const audioResponse = await fetch(
      'https://api.venice.ai/api/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: textToUse,
          model: 'tts-kokoro',
          voice: voice,
          response_format: 'mp3',
          speed: 1.0,
          streaming: false,
        }),
      }
    )

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text()
      console.error('Audio generation error:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        error: errorText,
      })
      return NextResponse.json(
        { 
          error: `Audio generation failed: ${audioResponse.statusText}`,
          details: errorText 
        },
        { status: audioResponse.status }
      )
    }

    // Convert audio to base64
    const audioBuffer = await audioResponse.arrayBuffer()
    
    if (audioBuffer.byteLength === 0) {
      console.error('Received empty audio buffer')
      return NextResponse.json(
        { error: 'Received empty audio response' },
        { status: 500 }
      )
    }

    const audioBase64 = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    // Update book with audio URL
    book.audioUrl = audioUrl
    await setBook(params.bookId, book)

    console.log(`Successfully generated audio for book ${params.bookId}, size: ${audioBuffer.byteLength} bytes`)

    return NextResponse.json({ audioUrl })
  } catch (error: any) {
    console.error('Error generating audio:', {
      message: error.message,
      stack: error.stack,
      bookId: params.bookId,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate audio',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

