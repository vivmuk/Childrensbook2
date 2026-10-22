import { NextRequest, NextResponse } from 'next/server'
import { getBook, setBook } from '@/lib/storage'

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
        { error: 'Book is still being generated' },
        { status: 202 }
      )
    }

    // Return book without internal status
    const { status, ...bookData } = book
    return NextResponse.json(bookData)
  } catch (error: any) {
    console.error('Error getting book:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get book' },
      { status: 500 }
    )
  }
}


/**
 * Save the studio's draft of a book.
 *
 * Pages arrive in their new order. A page that kept its picture says which old
 * page it came `from`, so a reorder or a text edit never has to send megabytes
 * of pictures back; only a page with a new picture carries its `image`.
 * Narration follows its page, and is dropped when the words change, so a read
 * aloud never says something the page no longer does.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    if (book.isSample) return NextResponse.json({ error: 'Sample books cannot be changed. Make your own to edit it.' }, { status: 403 })
    if (book.status !== 'completed') return NextResponse.json({ error: 'This book is still being made.' }, { status: 409 })

    const body = await request.json()
    const meta = book.meta || {}

    if (typeof body.title === 'string' && body.title.trim()) {
      book.title = body.title.trim().slice(0, 120)
      if (book.titlePage) book.titlePage.title = book.title
    }
    if (typeof body.coverImage === 'string' && body.coverImage.startsWith('data:image/')) {
      book.titlePage = { image: body.coverImage, title: book.title }
      meta.coverNarration = undefined
    }
    if (typeof body.dedication === 'string') meta.dedication = body.dedication.trim().slice(0, 200) || undefined
    if (typeof body.author === 'string') meta.author = body.author.trim().slice(0, 80) || undefined

    if (Array.isArray(body.pages)) {
      if (body.pages.length < 1 || body.pages.length > 24) {
        return NextResponse.json({ error: 'A book needs between 1 and 24 pages.' }, { status: 400 })
      }
      const oldPages = book.pages
      const oldScenes = meta.scenes || []
      const oldNarration = meta.narration || []
      const pages: typeof book.pages = []
      const scenes: NonNullable<typeof meta.scenes> = []
      const narration: NonNullable<typeof meta.narration> = []

      for (const [i, p] of body.pages.entries()) {
        const from = Number.isInteger(p?.from) && p.from >= 0 && p.from < oldPages.length ? p.from : -1
        const text = typeof p?.text === 'string' ? p.text.trim().slice(0, 3000) : from >= 0 ? oldPages[from].text : ''
        const image =
          typeof p?.image === 'string' && p.image.startsWith('data:image/')
            ? p.image
            : from >= 0 ? oldPages[from].image : ''
        if (!text || !image) {
          return NextResponse.json({ error: `Page ${i + 1} needs both words and a picture.` }, { status: 400 })
        }
        pages.push({ pageNumber: i + 1, text, image })
        scenes.push(
          typeof p?.scene === 'string' && p.scene.trim()
            ? { imageDescription: p.scene.trim().slice(0, 1200) }
            : from >= 0 ? oldScenes[from] || {} : {},
        )
        const spoken = from >= 0 ? oldNarration[from] : null
        narration.push(spoken && spoken.text === text ? spoken : null)
      }
      book.pages = pages
      book.expectedPages = pages.length
      meta.scenes = scenes
      meta.narration = narration
    }

    book.meta = meta
    await setBook(book.id, book)
    const { status, ...bookData } = book
    return NextResponse.json(bookData)
  } catch (error: any) {
    console.error('Error saving book:', error?.message)
    return NextResponse.json({ error: 'The book could not be saved. Please try again.' }, { status: 500 })
  }
}
