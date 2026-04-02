import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { queueId, userApiKey } = await request.json()

    const apiKey = userApiKey || process.env.VENICE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key available' }, { status: 500 })
    }

    if (!queueId) {
      return NextResponse.json({ error: 'Missing queueId' }, { status: 400 })
    }

    const retrieveRes = await fetch('https://api.venice.ai/api/v1/video/retrieve', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queue_id: queueId,
        delete_media_on_completion: true,
      }),
    })

    if (!retrieveRes.ok) {
      const errText = await retrieveRes.text()
      console.error('Venice video retrieve error:', errText)
      return NextResponse.json(
        { error: `Failed to retrieve animation: ${retrieveRes.statusText}` },
        { status: retrieveRes.status },
      )
    }

    const contentType = retrieveRes.headers.get('Content-Type') || ''

    if (contentType.includes('video/mp4') || contentType.includes('video/')) {
      // Video is ready — convert binary to base64 data URL
      const videoBuffer = await retrieveRes.arrayBuffer()
      const videoBase64 = Buffer.from(videoBuffer).toString('base64')
      const videoUrl = `data:video/mp4;base64,${videoBase64}`
      return NextResponse.json({ status: 'complete', videoUrl })
    } else {
      // Still processing
      const data = await retrieveRes.json()
      return NextResponse.json({
        status: 'processing',
        averageTime: data.average_execution_time ?? 120000,
        elapsed: data.execution_duration ?? 0,
      })
    }
  } catch (error: any) {
    console.error('animate-retrieve error:', error)
    return NextResponse.json({ error: error.message || 'Failed to retrieve animation' }, { status: 500 })
  }
}
