import { NextRequest, NextResponse } from 'next/server'
import { setBook, getBook, type Book, getUserBooks } from '@/lib/storage'

const LOCAL_USER_ID = 'local-user'

const AGE_TO_COMPLEXITY: Record<string, string> = {
  kindergarten: 'very simple, with short sentences (3–5 words each) and basic vocabulary — think Dr. Seuss level',
  '1st': 'simple, with short clear sentences and easy, familiar words — think early reader books',
  '2nd': 'moderate, with clear sentences and age-appropriate vocabulary — think Magic Tree House level',
  '3rd': 'moderate, with varied sentence structure and expanding vocabulary — think Roald Dahl level',
  '4th': 'more complex, with descriptive language, metaphors, and varied vocabulary — think Diary of a Wimpy Kid level',
  '5th': 'complex, with rich vocabulary, sophisticated sentence structure, and nuanced emotions — think Harry Potter level',
}

// Improved story prompt that encourages better educational content and AI literacy
function buildStoryPrompt(
  storyIdea: string,
  ageRange: string,
  illustrationStyle: string,
  pageCount: number,
): string {
  const complexity = AGE_TO_COMPLEXITY[ageRange] || AGE_TO_COMPLEXITY['2nd']

  return `You are an award-winning children's book author celebrated for creating stories that are both magical and educational. Your books have won the Caldecott Medal and the Newbery Medal. Create a masterpiece children's storybook based on this idea:

"${storyIdea}"

STORY REQUIREMENTS:
- Reading level: ${ageRange} grade — language complexity should be ${complexity}
- Exactly ${pageCount} pages — no more, no less
- Each page: 6–8 complete, beautifully crafted sentences (never just 2–4 sentences)
- Write at publication quality — every sentence should delight, teach, or move the reader

WRITING CRAFT GUIDELINES:
- Use vivid sensory details: what do characters see, hear, feel, smell?
- Vary sentence length for rhythm — short punchy sentences mixed with longer flowing ones
- Create memorable characters with distinct voices and personalities
- Build emotional resonance — let readers feel the joy, wonder, fear, and triumph
- Include natural-sounding dialogue that feels real and age-appropriate
- Weave life lessons gently — never preachy, always through story and character
- Every page should end with something that makes the reader want to turn to the next page

NARRATIVE STRUCTURE:
- Pages 1–2: Introduce world and main character in a captivating way
- Pages 3–${Math.ceil(pageCount * 0.6)}: Rising action — challenge, adventure, discovery
- Pages ${Math.ceil(pageCount * 0.6) + 1}–${pageCount - 1}: Climax and emotional peak
- Page ${pageCount}: Satisfying resolution with a lasting lesson or warm feeling

CHARACTER CONSISTENCY FOR ILLUSTRATIONS:
- Give your main character distinctive, memorable visual features (color, clothing, size, expression)
- In each imageDescription, always restate these features so illustrations stay consistent
- Describe secondary characters the same way in every imageDescription they appear in

ILLUSTRATION DESCRIPTIONS:
- Each imageDescription should be vivid and specific (up to 800 characters)
- Describe the exact scene, mood, lighting, and action
- Always include: character appearance, setting details, color palette, emotional tone
- Style: ${illustrationStyle}

Respond with ONLY valid JSON — no markdown, no code blocks, no extra text:

{
  "title": "The Story Title",
  "characters": {
    "main": "Detailed description of main character including name, appearance, clothing, distinctive features",
    "others": ["Description of other character 1", "Description of other character 2"]
  },
  "pages": [
    {
      "pageNumber": 1,
      "text": "6–8 sentences of beautiful, publication-quality children's book prose...",
      "imageDescription": "Detailed scene description including characters (with their appearance), setting, lighting, action, mood, and style notes. Up to 800 characters."
    }
  ]
}`
}

export async function POST(request: NextRequest) {
  try {
    const userId = LOCAL_USER_ID

    // Enforce per-user book limit
    const userBooks = await getUserBooks(userId)
    if (userBooks.length >= 100) {
      return NextResponse.json(
        { error: 'You have reached the limit of 100 books. Please delete some old books.' },
        { status: 403 },
      )
    }

    const {
      storyIdea,
      ageRange,
      illustrationStyle,
      storyLength = 8,
      narratorVoice = 'default',
      character,
      userVeniceApiKey,
    } = await request.json()

    if (!storyIdea || !ageRange || !illustrationStyle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine which API key to use: user-provided takes precedence over server key
    const serverApiKey = process.env.VENICE_API_KEY
    const apiKey = userVeniceApiKey || serverApiKey

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Venice API key available. Please provide your Venice AI API key.' },
        { status: 500 },
      )
    }

    const pageCount = Math.min(Math.max(parseInt(storyLength) || 8, 5), 12)
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storyPrompt = buildStoryPrompt(storyIdea, ageRange, illustrationStyle, pageCount)

    console.log(`[${bookId}] Generating story (${pageCount} pages, ${ageRange} grade)...`)

    // ── Story generation with model fallback ────────────────────────────────
    const models = ['gemini-3-flash-preview', 'nvidia-nemotron-3-nano-30b-a3b']
    let completionResponse: Response | null = null
    let lastError = ''
    let modelUsed = ''
    const maxRetries = 3

    for (const model of models) {
      modelUsed = model
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        completionResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  "You are an award-winning children's book author. CRITICAL: Respond with ONLY valid JSON. No markdown code blocks, no explanations, no text outside the JSON object.",
              },
              { role: 'user', content: storyPrompt },
            ],
            temperature: 0.85,
            max_tokens: 16000,
            response_format: { type: 'json_object' },
          }),
        })

        if (completionResponse.ok) break

        if (completionResponse.status === 429 && attempt < maxRetries) {
          const wait = attempt * 5000
          console.log(`Rate limited on ${model} (attempt ${attempt}), waiting ${wait / 1000}s...`)
          await new Promise(r => setTimeout(r, wait))
          continue
        }

        lastError = await completionResponse.text()
        console.error(`[${bookId}] Error with ${model}:`, completionResponse.status, lastError.slice(0, 200))
        break
      }
      if (completionResponse?.ok) break
    }

    if (!completionResponse?.ok) {
      let msg = 'Story generation failed. Please try again.'
      if (completionResponse?.status === 429) msg = 'AI service is busy. Please try again in a few minutes.'
      else if (completionResponse?.status === 401) msg = 'Invalid Venice API key. Please check your key and try again.'
      else if (lastError) {
        try { msg = JSON.parse(lastError).error || msg } catch { msg = lastError.slice(0, 200) || msg }
      }
      return NextResponse.json({ error: msg }, { status: completionResponse?.status === 429 ? 503 : 502 })
    }

    console.log(`[${bookId}] Story generated using model: ${modelUsed}`)

    // ── Parse JSON response ─────────────────────────────────────────────────
    let completion
    try {
      completion = await completionResponse.json()
    } catch {
      return NextResponse.json({ error: 'Invalid response from AI. Please try again.' }, { status: 502 })
    }

    const storyContent = completion.choices?.[0]?.message?.content
    if (!storyContent) {
      return NextResponse.json({ error: 'No story content generated. Please try again.' }, { status: 500 })
    }

    const cleanJSON = (raw: string): string => {
      let s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      const first = s.indexOf('{')
      if (first === -1) throw new Error('No JSON object found')
      let depth = 0, last = first
      for (let i = first; i < s.length; i++) {
        if (s[i] === '{') depth++
        if (s[i] === '}') { depth--; if (depth === 0) { last = i; break } }
      }
      s = s.substring(first, last + 1)
      s = s.replace(/,(\s*[}\]])/g, '$1') // remove trailing commas
      // If JSON is truncated (depth never reached 0), close open structures
      if (depth !== 0) {
        s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '')
        s = s.substring(first)
        // Remove incomplete last entry and close all open braces/brackets
        const stack: string[] = []
        let inStr = false, escape = false
        for (const ch of s) {
          if (escape) { escape = false; continue }
          if (ch === '\\' && inStr) { escape = true; continue }
          if (ch === '"') { inStr = !inStr; continue }
          if (!inStr) {
            if (ch === '{' || ch === '[') stack.push(ch)
            else if (ch === '}' || ch === ']') stack.pop()
          }
        }
        // Close remaining open structures
        let closing = ''
        for (let i = stack.length - 1; i >= 0; i--) {
          closing += stack[i] === '{' ? '}' : ']'
        }
        s = s.replace(/,\s*$/, '').replace(/,(\s*[}\]])$/g, '$1') + closing
      }
      s = s.replace(/,(\s*[}\]])/g, '$1')
      return s
    }

    let storyData: any
    try {
      storyData = JSON.parse(cleanJSON(storyContent))
    } catch {
      try {
        const f = storyContent.indexOf('{')
        const l = storyContent.lastIndexOf('}')
        if (f !== -1 && l > f) storyData = JSON.parse(cleanJSON(storyContent.substring(f, l + 1)))
        else throw new Error('No JSON found')
      } catch (e2: any) {
        console.error('JSON parse failed:', e2.message, storyContent.slice(0, 300))
        return NextResponse.json({ error: 'Failed to parse story. Please try again.' }, { status: 500 })
      }
    }

    // ── Store book and start async image generation ──────────────────────────
    const book: Book = {
      id: bookId,
      title: storyData.title || 'My Story',
      pages: [],
      ageRange,
      illustrationStyle,
      status: 'generating',
      createdAt: new Date().toISOString(),
      expectedPages: storyData.pages?.length || pageCount,
      generationProgress: 10,
      narratorVoice,
      character,
      prompts: { story: storyPrompt, images: [] },
      ...(userId && { ownerId: userId }),
    }

    await setBook(bookId, book)

    // Fire-and-forget image generation (pass the resolved API key)
    generateBookImages(bookId, storyData.pages, illustrationStyle, storyData.characters, apiKey).catch(
      async err => {
        console.error(`[${bookId}] Image generation error:`, err)
        const b = await getBook(bookId)
        if (b) { b.status = 'error'; await setBook(bookId, b) }
      },
    )

    return NextResponse.json({ bookId, status: 'generating' })
  } catch (err: any) {
    console.error('generate-book error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to generate book', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) },
      { status: 500 },
    )
  }
}

// ── Async image generation ───────────────────────────────────────────────────

async function generateBookImages(
  bookId: string,
  pages: any[],
  illustrationStyle: string,
  characters: { main?: string; others?: string[] } | undefined,
  apiKey: string,
) {
  const book = await getBook(bookId)
  if (!book) return

  const charParts: string[] = []
  if (characters?.main) charParts.push(characters.main)
  if (characters?.others?.length) charParts.push(...characters.others.slice(0, 3))
  const charPrefix = charParts.length
    ? `Characters: ${charParts.join('; ')}. Maintain consistent character appearance. `
    : ''

  const totalPages = pages.length
  const progressPerPage = 78 / totalPages // 10% story + 12% cover + 78% pages = 100%

  const updateProgress = async (pct: number) => {
    book.generationProgress = Math.min(99, Math.round(pct))
    await setBook(bookId, book)
  }

  const imagePrompts: Array<{ pageNumber: number | 'cover'; prompt: string }> = []

  // 1. Cover image
  console.log(`[${bookId}] Generating cover...`)
  const coverPrompt = `Beautiful children's book cover for "${book.title}". ${illustrationStyle} style, children's book cover art, colorful, whimsical, high quality, inviting, magical, eye-catching. Scene: ${pages[0]?.imageDescription || 'A magical adventure scene'}`
  imagePrompts.push({ pageNumber: 'cover', prompt: coverPrompt })

  const coverImg = await generateImage(coverPrompt, 'nano-banana-pro', 1280, 720, 1, apiKey)
  if (coverImg) {
    book.titlePage = { image: `data:image/webp;base64,${coverImg}`, title: book.title }
  }
  await updateProgress(22) // 10% story + 12% cover

  // 2. Page images (sequential for accurate progress)
  book.pages = []
  for (let i = 0; i < pages.length; i++) {
    console.log(`[${bookId}] Generating page ${i + 1}/${totalPages}...`)
    const page = pages[i]

    const desc = page.imageDescription || page.text.substring(0, 300)
    const basePrompt = `${desc}, ${illustrationStyle} style, children's book illustration, colorful, whimsical, high quality, detailed, charming, vivid colors`
    const fullPrompt = charPrefix ? `${charPrefix}${basePrompt}`.substring(0, 2800) : basePrompt.substring(0, 2800)
    imagePrompts.push({ pageNumber: i + 1, prompt: fullPrompt })

    const img = await generateImage(fullPrompt, 'flux-2-pro', 1024, 768, 30, apiKey)
    if (!img) throw new Error(`Failed to generate image for page ${i + 1}`)

    book.pages.push({ pageNumber: i + 1, text: page.text, image: `data:image/webp;base64,${img}` })
    await updateProgress(22 + (i + 1) * progressPerPage)
  }

  // 3. Complete
  book.status = 'completed'
  book.generationProgress = 100
  if (book.prompts) book.prompts.images = imagePrompts
  await setBook(bookId, book)
  console.log(`[${bookId}] Book generation complete!`)
}

// ── Venice image API helper ──────────────────────────────────────────────────

async function generateImage(
  prompt: string,
  model: string,
  width: number,
  height: number,
  steps: number,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, width, height, format: 'webp', steps }),
    })

    if (!res.ok) {
      console.error(`Image generation error: ${res.status} — ${(await res.text()).slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    return data.images?.[0] ?? null
  } catch (err) {
    console.error('Image generation exception:', err)
    return null
  }
}
