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
      // Only send lightweight page text during polling — never the base64 images.
      // The client doesn't render page images on the generating screen, and shipping
      // them on every 2s poll wasted megabytes of bandwidth per generation.
      pages: (book.pages || []).map(p => ({ pageNumber: p.pageNumber, text: p.text })),
      // Include metadata for client-side localStorage saving
      title: book.title,
      ageRange: book.ageRange,
      illustrationStyle: book.illustrationStyle,
      createdAt: book.createdAt,
      titlePageImage: book.titlePage?.image ?? null,
    })
  } catch (error: any) {
    console.error('Error getting book status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get book status' },
      { status: 500 }
    )
  }
}

