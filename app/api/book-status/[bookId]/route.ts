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

    // Calculate progress: if generationProgress is set, use it; otherwise estimate from pages
    const estimatedProgress = book.generationProgress ?? 
      (book.status === 'completed' ? 100 : 
        Math.round(((book.pages?.length || 0) / (book.expectedPages || 8)) * 100))
    
    return NextResponse.json({
      status: book.status,
      progress: estimatedProgress,
      pagesCompleted: book.pages?.length || 0,
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

