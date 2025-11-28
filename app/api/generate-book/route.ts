import { NextRequest, NextResponse } from 'next/server'
import { setBook, getBook, type Book } from '@/lib/storage'

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
      "imageDescription": "Detailed visual description of the illustration including character appearances (maintain consistency), setting, mood, and action. Must be in ${illustrationStyle} style. Keep under 200 characters."
    },
    ...
  ]
}

Remember: Each page's text should be 6-8 sentences of expert-quality children's book writing that captivates and delights young readers.`

    // Generate story text using Venice API directly
    const completionResponse = await fetch(
      'https://api.venice.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VENICE_API_KEY || 'lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [
            {
              role: 'system',
              content:
                'You are an award-winning expert children\'s book author with decades of experience creating magical, engaging stories. You write at a professional publication-quality level. Always respond with valid JSON only, no additional text or explanations.', 
            },
            { role: 'user', content: storyPrompt },
          ],
          temperature: 0.9,
          max_completion_tokens: 4000,
          venice_parameters: {
            include_venice_system_prompt: false,
          },
        }),
      }
    )

    if (!completionResponse.ok) {
      throw new Error(
        `Venice API error: ${completionResponse.statusText}`
      )
    }

    const completion = await completionResponse.json()

    const storyContent = completion.choices?.[0]?.message?.content
    if (!storyContent) {
      throw new Error('No story content generated')
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let storyData
    try {
      const jsonMatch = storyContent.match(/```json\s*([\s\S]*?)\s*```/) || storyContent.match(/\{[\s\S]*\}/)
      storyData = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : storyContent)
    } catch (e) {
      // Fallback: try to extract JSON from the response
      const jsonMatch = storyContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse story JSON')
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
    }

    setBook(bookId, book)

    // Generate images for each page asynchronously with character consistency
    generateBookImages(
      bookId, 
      storyData.pages, 
      illustrationStyle,
      storyData.characters
    ).catch(
      (error) => {
        console.error('Error generating images:', error)
        const book = getBook(bookId)
        if (book) {
          book.status = 'error'
          setBook(bookId, book)
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
  const book = getBook(bookId)
  if (!book) return

  // Extract character consistency information
  const characterDescriptions: string[] = []
  if (characters?.main) {
    characterDescriptions.push(characters.main)
  }
  if (characters?.others && characters.others.length > 0) {
    characterDescriptions.push(...characters.others.slice(0, 2)) // Limit to keep prompt short
  }
  const characterConsistency = characterDescriptions.length > 0 
    ? `Characters: ${characterDescriptions.join(', ')}. Maintain consistent character appearance throughout. ` 
    : ''

  try {
    // Generate title page image first using nano-banana-pro model
    const titlePagePrompt = `A beautiful children's book cover illustration for "${book.title}". ${illustrationStyle} style, children's book cover, colorful, whimsical, high quality, detailed, charming, inviting, magical`
    
    const titlePageResponse = await fetch(
      'https://api.venice.ai/api/v1/image/generate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VENICE_API_KEY || 'lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt: titlePagePrompt,
          width: 1024,
          height: 768,
          format: 'webp',
          steps: 1,
        }),
      }
    )

    if (titlePageResponse.ok) {
      const titlePageData = await titlePageResponse.json()
      const titlePageBase64 = titlePageData.images?.[0]
      if (titlePageBase64) {
        book.titlePage = {
          image: `data:image/webp;base64,${titlePageBase64}`,
          title: book.title,
        }
        setBook(bookId, book)
      }
    }
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      // Build prompt with character consistency, keeping under 1600 characters
      let imageDescription = page.imageDescription || page.text.substring(0, 150)
      const basePrompt = `${imageDescription}, ${illustrationStyle} style, children's book illustration, colorful, whimsical, high quality, detailed, charming`
      
      // Add character consistency info if we have it
      const fullPrompt = characterConsistency 
        ? `${characterConsistency}${basePrompt}`.substring(0, 1500) // Ensure under 1600
        : basePrompt.substring(0, 1500)

      // Generate image using Venice API
      const imageResponse = await fetch(
        'https://api.venice.ai/api/v1/image/generate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VENICE_API_KEY || 'lnWNeSg0pA_rQUooNpbfpPDBaj2vJnWol5WqKWrIEF'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen-image',
            prompt: fullPrompt,
            width: 1024,
            height: 768,
            format: 'webp',
            steps: 8,
          }),
        }
      )

      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.statusText}`)
      }

      const imageData = await imageResponse.json()
      const imageBase64 = imageData.images?.[0]

      if (!imageBase64) {
        throw new Error('No image data returned')
      }

      // Convert base64 to data URL
      const imageUrl = `data:image/webp;base64,${imageBase64}`

      book.pages.push({
        pageNumber: i + 1,
        text: page.text,
        image: imageUrl,
      })

      setBook(bookId, book)
    }

    // Mark as completed
    book.status = 'completed'
    setBook(bookId, book)
  } catch (error) {
    console.error('Error in generateBookImages:', error)
    book.status = 'error'
    setBook(bookId, book)
    throw error
  }
}

