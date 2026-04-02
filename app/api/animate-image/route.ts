import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, pageIndex, userApiKey } = body

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key available. Add your Venice AI API key to animate images.' },
        { status: 500 },
      )
    }

    const book = await getBook(bookId)
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // pageIndex === -1 means title page, 0+ means content pages
    let imageDataUrl: string
    if (pageIndex === -1) {
      if (!book.titlePage?.image) {
        return NextResponse.json({ error: 'No title page image found' }, { status: 400 })
      }
      imageDataUrl = book.titlePage.image
    } else {
      const page = book.pages[pageIndex]
      if (!page?.image) {
        return NextResponse.json({ error: 'No image found for this page' }, { status: 400 })
      }
      imageDataUrl = page.image
    }

    // Build a gentle animation prompt suited for children's book illustrations
    const pageLabel = pageIndex === -1 ? 'book cover' : `page ${pageIndex + 1}`
    const animatePrompt =
      `Gently animate this children's book illustration (${pageLabel}), bringing it to life ` +
      `with soft, magical movement. Keep the art style exactly the same. Add subtle breathing, ` +
      `gentle swaying, sparkles, or light effects appropriate for a children's story.`

    const queueRes = await fetch('https://api.venice.ai/api/v1/video/queue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-imagine-image-to-video',
        prompt: animatePrompt,
        image_url: imageDataUrl,
        duration: 5,
        resolution: '480p',
      }),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      console.error('Venice video queue error:', errText)
      return NextResponse.json(
        { error: `Failed to start animation: ${queueRes.statusText}` },
        { status: queueRes.status },
      )
    }

    const { queue_id } = await queueRes.json()
    return NextResponse.json({ queueId: queue_id })
  } catch (error: any) {
    console.error('animate-image error:', error)
    return NextResponse.json({ error: error.message || 'Failed to start animation' }, { status: 500 })
  }
}
