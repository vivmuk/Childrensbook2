import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

// Serves a book's page image as a real HTTP response so external services
// (like Venice AI video API) can fetch it by URL.
// /api/book-image/[bookId]/title     → cover/title page image
// /api/book-image/[bookId]/[0-N]     → content page at that index
export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string; page: string } },
) {
  try {
    const book = await getBook(params.bookId)
    if (!book) {
      return new NextResponse('Book not found', { status: 404 })
    }

    let imageDataUrl: string | undefined
    if (params.page === 'title') {
      imageDataUrl = book.titlePage?.image
    } else {
      const pageIndex = parseInt(params.page, 10)
      if (!Number.isNaN(pageIndex)) {
        imageDataUrl = book.pages?.[pageIndex]?.image
      }
    }

    if (!imageDataUrl) {
      return new NextResponse('Image not found', { status: 404 })
    }

    // Parse "data:<type>;base64,<data>"
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) {
      return new NextResponse('Invalid image data', { status: 500 })
    }

    const contentType = match[1]
    const imageBuffer = Buffer.from(match[2], 'base64')

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(imageBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('book-image error:', err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
