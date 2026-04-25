import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { image, userApiKey } = await request.json()

    if (!image) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Venice API key available. Please provide your Venice AI API key.' },
        { status: 500 },
      )
    }

    // Strip data URI prefix if present — Venice /image/edit accepts raw base64
    const base64Data = image.replace(/^data:[^;]+;base64,/, '')

    const cartoonPrompt =
      'Transform this photo into a cute, colorful cartoon character for a children\'s picture book. ' +
      'Keep the child\'s distinctive facial features, hairstyle, and expression recognizable. ' +
      'Make them look like a friendly, expressive children\'s book illustration character with ' +
      'big bright eyes, warm colors, and a cheerful appearance. ' +
      'Children\'s book illustration style, high quality, vibrant colors.'

    const editRes = await fetch('https://api.venice.ai/api/v1/image/edit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-imagine-edit',
        prompt: cartoonPrompt,
        image: base64Data,
        aspect_ratio: '1:1',
        safe_mode: true,
      }),
    })

    if (!editRes.ok) {
      const errText = await editRes.text()
      console.error('Venice /image/edit error:', editRes.status, errText.slice(0, 300))
      let userMessage = 'Failed to cartoonify image. Please try again.'
      if (editRes.status === 401) userMessage = 'Invalid API key. Please check your Venice AI key.'
      else if (editRes.status === 429) userMessage = 'AI service is busy. Please try again in a moment.'
      return NextResponse.json({ error: userMessage }, { status: editRes.status })
    }

    // /image/edit returns binary PNG
    const pngBuffer = await editRes.arrayBuffer()
    const base64Png = Buffer.from(pngBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64Png}`

    return NextResponse.json({ cartoonImage: dataUrl })
  } catch (err: any) {
    console.error('cartoonify error:', err)
    return NextResponse.json({ error: err.message || 'Failed to cartoonify image' }, { status: 500 })
  }
}
