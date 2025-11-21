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

    // Generate book story structure
    const storyPrompt = `Create a children's book story based on this idea: "${storyIdea}"

Requirements:
- Age range: ${ageRange} grade (${complexity})
- The story should be appropriate for this age group
- Create a story with 6-8 pages
- Each page should have 2-4 sentences
- Make it engaging, educational, and fun
- Include a clear beginning, middle, and end

Format the response as JSON with this structure:
{
  "title": "Story Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page text here...",
      "imageDescription": "Detailed description of what should be in the illustration for this page, in ${illustrationStyle} style"
    },
    ...
  ]
}`

    // Generate story text using Venice API directly
    const completionResponse = await fetch(
      'https://api.venice.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [
            {
              role: 'system',
              content:
                'You are a creative children\'s book author. Always respond with valid JSON only, no additional text.',
            },
            { role: 'user', content: storyPrompt },
          ],
          temperature: 0.8,
          max_completion_tokens: 2000,
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

    // Generate images for each page asynchronously
    generateBookImages(bookId, storyData.pages, illustrationStyle).catch(
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
  illustrationStyle: string
) {
  const book = getBook(bookId)
  if (!book) return

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const imagePrompt = `${page.imageDescription || page.text}, ${illustrationStyle} style, children's book illustration, colorful, whimsical, high quality`

      // Generate image using Venice API
      const imageResponse = await fetch(
        'https://api.venice.ai/api/v1/image/generate',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen-image',
            prompt: imagePrompt,
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

