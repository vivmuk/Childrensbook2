import { NextRequest, NextResponse } from 'next/server'
import { setBook, getBook, type Book, getUserBooks } from '@/lib/storage'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'

const AGE_TO_COMPLEXITY: Record<string, string> = {
  kindergarten: 'very simple, with short sentences and basic words',
  '1st': 'simple, with short sentences and easy words',
  '2nd': 'moderate, with clear sentences and age-appropriate vocabulary',
  '3rd': 'moderate, with varied sentence structure and expanding vocabulary',
  '4th': 'more complex, with descriptive language and varied vocabulary',
  '5th': 'complex, with rich vocabulary and sophisticated sentence structure',
}

export async function POST(request: NextRequest) {
  try {
    let userId: string | undefined

    // Check for Auth Token
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]
      try {
        const app = getAdminApp()
        if (app) {
          const decodedToken = await getAuth(app).verifyIdToken(token)
          userId = decodedToken.uid
        }
      } catch (e) {
        console.warn('Invalid auth token provided', e)
      }
    }

    if (userId) {
      // Check 100 book limit
      const userBooks = await getUserBooks(userId)
      if (userBooks.length >= 100) {
        return NextResponse.json(
          { error: 'You have reached the limit of 100 books. Please contact support or delete some old books.' },
          { status: 403 }
        )
      }
    }

    const { storyIdea, ageRange, illustrationStyle } = await request.json()

    if (!storyIdea || !ageRange || !illustrationStyle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const complexity = AGE_TO_COMPLEXITY[ageRange] || AGE_TO_COMPLEXITY['2nd']

    // Generate book story structure with expert children's book writing
    const storyPrompt = `You are an award-winning expert children's book author with decades of experience. Create a magical, engaging children's storybook based on this idea: "${storyIdea}"

CRITICAL REQUIREMENTS:
- Age range: ${ageRange} grade (${complexity})
- Create a story with 6-8 pages
- Each page MUST have 6-8 complete, well-crafted sentences (not just 2-4)
- Write at an expert professional level - this should be publication-quality children's literature
- Use rich, age-appropriate vocabulary that expands young minds
- Include vivid sensory details (sights, sounds, feelings, smells when appropriate)
- Create memorable, well-developed characters with distinct personalities
- Build emotional connection and wonder in every sentence
- Include descriptive language that paints pictures with words
- Make it engaging, educational, emotionally resonant, and genuinely fun
- Include a clear narrative arc: beginning (setup), middle (adventure/challenge), end (resolution)
- Each page should flow naturally to the next
- The story should teach gentle life lessons or values naturally woven into the narrative
- Use varied sentence structure and rhythm that's pleasing when read aloud
- Include moments of wonder, discovery, and joy
- Make the dialogue (if any) natural and age-appropriate
- Ensure cultural sensitivity and positive representation

CHARACTER CONSISTENCY REQUIREMENTS:
- Identify the main characters in the story (names, appearance, distinctive features)
- For image generation: maintain character consistency by describing the SAME characters the same way across all pages
- Include character descriptions in image prompts to ensure visual consistency
- Note: Character details must be included in imageDescription but keep total prompt under 1600 characters

Format the response as JSON with this structure:
{
  "title": "Story Title",
  "characters": {
    "main": "Character name and brief description",
    "others": ["Other character names and descriptions"]
  },
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page text here with 6-8 complete, engaging sentences that tell the story beautifully...",
      "imageDescription": "Extremely detailed visual description of the illustration. Include specific details about the setting, lighting, mood, and action. Describe characters in detail (outfit, colors, features) to ensure consistency. Must be in ${illustrationStyle} style. You can use up to 800 characters."
    },
    ...
  ]
}

Remember: Each page's text should be 6-8 sentences of expert-quality children's book writing that captivates and delights young readers.`

    // Generate story text using Venice API directly
    const apiKey = process.env.VENICE_API_KEY
    if (!apiKey) {
      console.error('VENICE_API_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error: API key not configured' },
        { status: 500 }
      )
    }

    console.log('Generating story with Venice API...')
    
    // Retry logic for Venice API (handles 429 rate limits)
    let completionResponse: Response | null = null
    let lastError = ''
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      completionResponse = await fetch(
        'https://api.venice.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content:
                  'You are an award-winning expert children\'s book author with decades of experience creating magical, engaging stories. You write at a professional publication-quality level. CRITICAL: You MUST respond with ONLY valid JSON. No markdown code blocks, no explanations, no additional text. Just pure, valid JSON that can be parsed directly.',
              },
              { role: 'user', content: storyPrompt },
            ],
            temperature: 0.9,
            max_tokens: 4000,
          }),
        }
      )

      if (completionResponse.ok) {
        break // Success!
      }
      
      // Check if it's a rate limit error (429)
      if (completionResponse.status === 429 && attempt < maxRetries) {
        const waitTime = attempt * 5000 // 5s, 10s, 15s
        console.log(`Venice API rate limited (attempt ${attempt}/${maxRetries}). Waiting ${waitTime/1000}s...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For other errors, capture and break
      lastError = await completionResponse.text()
      console.error('Venice API error:', completionResponse.status, lastError)
      break
    }

    if (!completionResponse || !completionResponse.ok) {
      let errorMessage = 'Story generation failed. Please try again.'
      
      if (completionResponse?.status === 429) {
        errorMessage = 'AI service is busy. Please try again in a few minutes.'
      } else if (lastError) {
        // Try to parse the error message
        try {
          const errorData = JSON.parse(lastError)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = lastError.substring(0, 200) || errorMessage
        }
      }
      
      console.error('Final Venice API error:', completionResponse?.status, errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: completionResponse?.status === 429 ? 503 : 502 }
      )
    }

    console.log('Venice API response received, parsing...')
    const completion = await completionResponse.json()
    console.log('Venice API completion:', JSON.stringify(completion).substring(0, 500))

    const storyContent = completion.choices?.[0]?.message?.content
    if (!storyContent) {
      console.error('No story content in response:', completion)
      return NextResponse.json(
        { error: 'No story content generated' },
        { status: 500 }
      )
    }
    console.log('Story content received, length:', storyContent.length)

    // Helper function to clean and repair JSON
    const cleanJSON = (jsonString: string): string => {
      // Remove markdown code blocks if present
      let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '')

      // Extract JSON object (find first { and matching })
      const firstBrace = cleaned.indexOf('{')
      if (firstBrace === -1) {
        throw new Error('No JSON object found')
      }

      let braceCount = 0
      let lastBrace = firstBrace
      for (let i = firstBrace; i < cleaned.length; i++) {
        if (cleaned[i] === '{') braceCount++
        if (cleaned[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            lastBrace = i
            break
          }
        }
      }

      cleaned = cleaned.substring(firstBrace, lastBrace + 1)

      // Fix common JSON issues
      // Remove trailing commas before } or ]
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

      // Fix unescaped quotes in strings (basic fix)
      // This is a simple approach - for production, consider a proper JSON repair library
      cleaned = cleaned.replace(/([^\\])"/g, (match, p1) => {
        // Don't fix if it's already escaped or part of a key/value structure
        return match
      })

      return cleaned
    }

    // Parse JSON from response with improved error handling
    let storyData
    try {
      const cleanedJSON = cleanJSON(storyContent)
      storyData = JSON.parse(cleanedJSON)
    } catch (e: any) {
      console.error('JSON parsing error:', e.message)
      console.error('Story content (first 500 chars):', storyContent.substring(0, 500))

      // Try alternative extraction methods
      try {
        // Try to find JSON between first { and last }
        const firstBrace = storyContent.indexOf('{')
        const lastBrace = storyContent.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const extracted = storyContent.substring(firstBrace, lastBrace + 1)
          const cleaned = cleanJSON(extracted)
          storyData = JSON.parse(cleaned)
        } else {
          throw new Error('Could not extract JSON from response')
        }
      } catch (e2: any) {
        console.error('Fallback JSON parsing also failed:', e2.message)
        throw new Error(`Failed to parse story JSON: ${e.message}. Please try generating the book again.`)
      }
    }

    // Store book with status "generating"
    const book: Book = {
      id: bookId,
      title: storyData.title || 'My Story',
      pages: [],
      ageRange,
      illustrationStyle,
      status: 'generating',
      createdAt: new Date().toISOString(),
      expectedPages: storyData.pages?.length || 8,
      prompts: {
        story: storyPrompt,
        images: []
      }
    }

    await setBook(bookId, book)

    // Generate images for each page asynchronously with character consistency
    generateBookImages(
      bookId,
      storyData.pages,
      illustrationStyle,
      storyData.characters
    ).catch(
      async (error) => {
        console.error('Error generating images:', error)
        const book = await getBook(bookId)
        if (book) {
          book.status = 'error'
          await setBook(bookId, book)
        }
      }
    )

    return NextResponse.json({ bookId, status: 'generating' })
  } catch (error: any) {
    console.error('Error generating book:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate book' },
      { status: 500 }
    )
  }
}

async function generateBookImages(
  bookId: string,
  pages: any[],
  illustrationStyle: string,
  characters?: { main?: string; others?: string[] }
) {
  const book = await getBook(bookId)
  if (!book) return

  // Extract character consistency information
  const characterDescriptions: string[] = []
  if (characters?.main) {
    characterDescriptions.push(characters.main)
  }
  if (characters?.others && characters.others.length > 0) {
    characterDescriptions.push(...characters.others.slice(0, 3)) // Increased limit for detailed prompts
  }
  const characterConsistency = characterDescriptions.length > 0
    ? `Characters: ${characterDescriptions.join(', ')}. Maintain consistent character appearance throughout. `
    : ''

  try {

    // Collect all image prompts to save later
    const imagePrompts: Array<{ pageNumber: number | 'cover'; prompt: string }> = []

    // 1. Prepare Title Page Promise
    const titlePagePromise = (async () => {
      const titlePagePrompt = `A beautiful children's book cover illustration with the title "${book.title}" prominently displayed. ${illustrationStyle} style, children's book cover, colorful, whimsical, high quality, detailed, charming, inviting, magical. The title text should be part of the illustration design. Scene details: ${pages[0]?.imageDescription || 'A magical scene'}`

      imagePrompts.push({ pageNumber: 'cover', prompt: titlePagePrompt })

      const img = await generateImage(titlePagePrompt, 'nano-banana-pro', 1280, 720, 1) // Using nano-banana-pro for title (better text)
      if (img) {
        return {
          image: `data:image/webp;base64,${img}`,
          title: book.title,
        }
      }
      return undefined
    })()

    // 2. Prepare Pages Promises
    const pagePromises = pages.map(async (page, i) => {
      let imageDescription = page.imageDescription || page.text.substring(0, 300)
      const basePrompt = `${imageDescription}, ${illustrationStyle} style, children's book illustration, colorful, whimsical, high quality, detailed, charming, masterpiece, trending on artstation, vivid colors`

      const fullPrompt = characterConsistency
        ? `${characterConsistency}${basePrompt}`.substring(0, 2800) // Increased limit to 2800 for Flux Pro
        : basePrompt.substring(0, 2800)

      imagePrompts.push({ pageNumber: i + 1, prompt: fullPrompt })

      const img = await generateImage(fullPrompt, 'flux-2-pro', 1024, 768, 30) // Using flux-2-pro for pages with higher steps
      if (!img) throw new Error(`Failed to generate image for page ${i + 1}`)

      return {
        pageNumber: i + 1,
        text: page.text,
        image: `data:image/webp;base64,${img}`,
      }
    })

    // 3. Execute All in Parallel
    const [titlePageResult, ...pageResults] = await Promise.all([
      titlePagePromise,
      ...pagePromises
    ])

    // 4. Update Book Object
    if (titlePageResult) {
      book.titlePage = titlePageResult
    }

    // Sort pages just in case Promise.all implementation varies (it shouldn't, but good practice)
    // Actually Promise.all preserves order of input, so pageResults[0] corresponds to pages[0].

    book.pages = pageResults as any[]
    book.status = 'completed'

    // Save prompts
    if (book.prompts) {
      book.prompts.images = imagePrompts
    } else {
      book.prompts = {
        story: '', // Should have been set in POST, but fallback just in case
        images: imagePrompts
      }
    }

    // 5. Save Once
    await setBook(bookId, book)

  } catch (error) {
    console.error('Error in generateBookImages:', error)
    book.status = 'error'
    await setBook(bookId, book)
    // We don't rethrow here because the main response has already been sent
  }
}

// Helper for Venice API calls
async function generateImage(prompt: string, model: string, width: number, height: number, steps: number) {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) {
    console.error('VENICE_API_KEY not set for image generation')
    return null
  }

  try {
    const response = await fetch(
      'https://api.venice.ai/api/v1/image/generate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          width,
          height,
          format: 'webp',
          steps,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Image generation failed: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    return data.images?.[0]
  } catch (error) {
    console.error('Image generation error:', error)
    return null
  }
}

