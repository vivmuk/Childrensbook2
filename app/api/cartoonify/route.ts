import { NextRequest, NextResponse } from 'next/server'

// Turns a real photo into a cartoon "hero" for a storybook.
//
// The subject can be a CHILD or a GROWN-UP. We deliberately do NOT force a
// child look — we preserve the person's apparent age, features, and expression
// so an adult stays an adult and a child stays a child. Alongside the cartoon
// we run a quick vision pass to describe the hero, so the story can genuinely
// be *about that person* (and stay positive + inspiring regardless of age).

interface HeroInfo {
  ageGroup: 'child' | 'teen' | 'adult'
  isAdult: boolean
  description: string
  suggestedName: string
}

async function describeHero(imageUrl: string, apiKey: string): Promise<HeroInfo | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'You help cast the hero of a wholesome children\'s storybook. Look at the photo of one person and respond with ONLY a JSON object — no markdown, no extra text — using this exact shape:\n' +
              '{"ageGroup":"child|teen|adult","description":"one warm, vivid sentence describing their look: hair, eyes, clothing colors, and a friendly expression (no names, no guesses about identity)","suggestedName":"a single cheerful first name that fits them"}\n' +
              'Judge ageGroup honestly from the photo. Keep everything kind, respectful, and family-friendly.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this person as a storybook hero.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.5,
        max_tokens: 250,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content
    if (!raw) return null
    const parsed = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
    const ageGroup: HeroInfo['ageGroup'] =
      parsed.ageGroup === 'adult' || parsed.ageGroup === 'teen' ? parsed.ageGroup : 'child'
    return {
      ageGroup,
      isAdult: ageGroup === 'adult',
      description: String(parsed.description || '').slice(0, 400),
      suggestedName: String(parsed.suggestedName || '').replace(/[^a-zA-Z'\- ]/g, '').trim().slice(0, 24),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

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
    const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`

    // Subject-agnostic cartoon prompt: preserve apparent age, not just "child".
    const cartoonPrompt =
      'Transform this photo of a person into a warm, colorful cartoon character for a children\'s picture book. ' +
      'Keep their distinctive facial features, hairstyle, skin tone, and friendly expression clearly recognizable, ' +
      'and PRESERVE their apparent age — if they look like a grown-up, keep them a grown-up; if they look like a child, keep them a child. ' +
      'Render them as a lovable, expressive storybook hero with clean lines, bright cheerful colors, and a kind, approachable look. ' +
      'Soft studio lighting, simple uncluttered background, high quality children\'s book illustration style.'

    // Run the cartoon edit and the hero description together to keep it fast.
    const [editRes, heroInfo] = await Promise.all([
      fetch('https://api.venice.ai/api/v1/image/edit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-imagine-edit',
          prompt: cartoonPrompt,
          image: base64Data,
          aspect_ratio: '1:1',
          safe_mode: true,
        }),
      }),
      describeHero(imageUrl, apiKey),
    ])

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

    return NextResponse.json({ cartoonImage: dataUrl, hero: heroInfo })
  } catch (err: any) {
    console.error('cartoonify error:', err)
    return NextResponse.json({ error: err.message || 'Failed to cartoonify image' }, { status: 500 })
  }
}
