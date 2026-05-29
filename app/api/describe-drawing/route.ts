import { NextRequest, NextResponse } from 'next/server'

// Draw-to-Story: the child uploads a drawing and a vision model "looks" at it and
// turns it into a story idea, which the client drops into the normal book pipeline.
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

    // Ensure a proper data URI for the vision model.
    const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    let res: Response
    try {
      res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
        model: 'gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              "You are a warm children's book author. A child has drawn a picture. Look closely at what they drew — the characters, creatures, places, and mood — and invent a delightful, age-appropriate story idea inspired by it. Respond with ONLY 1–2 vivid sentences describing the story idea (no preamble, no quotes, no lists).",
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: "Here is my drawing. What story could we make from it?" },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.9,
        max_tokens: 300,
      }),
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('Venice vision error:', res.status, errText.slice(0, 300))
      let userMessage = 'Could not read the drawing. Please try another picture.'
      if (res.status === 401) userMessage = 'Invalid API key. Please check your Venice AI key.'
      else if (res.status === 429) userMessage = 'AI service is busy. Please try again in a moment.'
      return NextResponse.json({ error: userMessage }, { status: res.status })
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) {
      return NextResponse.json({ error: 'Could not interpret the drawing. Please try again.' }, { status: 502 })
    }

    // Strip wrapping quotes / markdown the model sometimes adds despite instructions.
    const storyIdea = raw
      .replace(/^["'`*\s]+|["'`*\s]+$/g, '')
      .replace(/^(story idea|idea)\s*[:\-]\s*/i, '')
      .trim()

    return NextResponse.json({ storyIdea })
  } catch (err: any) {
    console.error('describe-drawing error:', err)
    return NextResponse.json({ error: err.message || 'Failed to describe drawing' }, { status: 500 })
  }
}
