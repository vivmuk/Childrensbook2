import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const book = getBook(params.bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: book.status,
      progress: book.pages?.length || 0,
      totalPages: book.expectedPages || 8,
      expectedPages: book.expectedPages || 8,
      pages: book.pages || [],
    })
  } catch (error: any) {
    console.error('Error getting book status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get book status' },
      { status: 500 }
    )
  }
}

