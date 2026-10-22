import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const book = await getBook(params.bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (!book.audioUrl) {
      return NextResponse.json(
        { error: 'Audio not generated yet' },
        { status: 404 }
      )
    }

    // Extract base64 data from data URL
    const base64Data = book.audioUrl.replace(/^data:audio\/[^;]+;base64,/, '')
    const audioBuffer = Buffer.from(base64Data, 'base64')

    // Return audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3"`,
        'Content-Length': audioBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Error downloading audio:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download audio' },
      { status: 500 }
    )
  }
}

