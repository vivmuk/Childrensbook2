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

    // Verify the image actually exists before sending to Venice
    if (pageIndex === -1) {
      if (!book.titlePage?.image) {
        return NextResponse.json({ error: 'No title page image found' }, { status: 400 })
      }
    } else {
      if (!book.pages?.[pageIndex]?.image) {
        return NextResponse.json({ error: 'No image found for this page' }, { status: 400 })
      }
    }

    // Construct a publicly accessible URL for this image so Venice can fetch it.
    // Venice's video API requires a real HTTP URL — it cannot accept base64 data URLs.
    const host = request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const pageParam = pageIndex === -1 ? 'title' : String(pageIndex)
    const imageUrl = `${proto}://${host}/api/book-image/${bookId}/${pageParam}`

    // Build a gentle animation prompt suited for children's book illustrations
    const pageLabel = pageIndex === -1 ? 'book cover' : `page ${pageIndex + 1}`
    const animatePrompt =
      `Gently animate this children's book illustration (${pageLabel}), bringing it to life ` +
      `with soft, magical movement. Keep the art style exactly the same. Add subtle breathing, ` +
      `gentle swaying, sparkles, or light effects appropriate for a children's story.`

    const videoModel = 'wan-i2v-480p'

    const queueRes = await fetch('https://api.venice.ai/api/v1/video/queue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: videoModel,
        prompt: animatePrompt,
        image_url: imageUrl,
        duration: '5s',
        resolution: '480p',
      }),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      console.error('Venice video queue error:', queueRes.status, errText)
      return NextResponse.json(
        { error: `Failed to start animation: ${errText || queueRes.statusText}` },
        { status: queueRes.status },
      )
    }

    const queueData = await queueRes.json()
    const queue_id = queueData.queue_id || queueData.id
    if (!queue_id) {
      console.error('Venice video queue: no queue_id in response', queueData)
      return NextResponse.json({ error: 'No queue ID returned from animation service' }, { status: 500 })
    }
    return NextResponse.json({ queueId: queue_id, model: videoModel })
  } catch (error: any) {
    console.error('animate-image error:', error)
    return NextResponse.json({ error: error.message || 'Failed to start animation' }, { status: 500 })
  }
}
