import { NextRequest, NextResponse } from 'next/server'
import { storeTempImage } from '@/lib/temp-images'

export async function POST(request: NextRequest) {
  try {
    const { imageData, prompt, userApiKey } = await request.json()

    if (!imageData || !prompt?.trim()) {
      return NextResponse.json({ error: 'Missing image or prompt' }, { status: 400 })
    }

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Venice API key available. Please provide your Venice AI API key.' },
        { status: 500 },
      )
    }

    // Store the image as a temp HTTP-accessible resource so Venice can fetch it
    const base64Data = imageData.replace(/^data:[^;]+;base64,/, '')
    const contentTypeMatch = imageData.match(/^data:([^;]+);base64,/)
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png'
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const tempId = storeTempImage(imageBuffer, contentType)

    const host = request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const imageUrl = `${proto}://${host}/api/temp-image/${tempId}`

    const videoModel = 'wan-i2v-480p'

    const queueRes = await fetch('https://api.venice.ai/api/v1/video/queue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: videoModel,
        prompt: prompt.trim(),
        image_url: imageUrl,
        duration: '5s',
        resolution: '480p',
      }),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      console.error('Venice video queue error:', queueRes.status, errText.slice(0, 300))
      let userMessage = 'Failed to start video generation. Please try again.'
      if (queueRes.status === 401) userMessage = 'Invalid API key. Please check your Venice AI key.'
      else if (queueRes.status === 429) userMessage = 'AI service is busy. Please try again in a moment.'
      return NextResponse.json({ error: userMessage }, { status: queueRes.status })
    }

    const queueData = await queueRes.json()
    const queueId = queueData.queue_id || queueData.id
    if (!queueId) {
      return NextResponse.json({ error: 'No queue ID returned from video service' }, { status: 500 })
    }

    return NextResponse.json({ queueId, model: videoModel })
  } catch (err: any) {
    console.error('video-create error:', err)
    return NextResponse.json({ error: err.message || 'Failed to start video generation' }, { status: 500 })
  }
}
