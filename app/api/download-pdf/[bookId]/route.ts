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

    if (book.status !== 'completed') {
      return NextResponse.json(
        { error: 'Book is not ready yet' },
        { status: 400 }
      )
    }

    // Redirect to PDF view page with download flag - browser will handle print-to-PDF
    return NextResponse.redirect(new URL(`/pdf/${params.bookId}?download=true`, request.url))
  } catch (error: any) {
    console.error('Error with PDF download:', error)
    return NextResponse.redirect(new URL(`/pdf/${params.bookId}`, request.url))
  }
}

