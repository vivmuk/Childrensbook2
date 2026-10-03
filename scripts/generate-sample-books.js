// This is a Node.js script to generate sample books
// Run with: node scripts/generate-sample-books.js

const { writeFile, mkdir } = require('fs/promises')
const { existsSync } = require('fs')
const path = require('path')

const SAMPLE_BOOKS = [
  {
    id: 'sample_forest_adventure',
    title: 'The Brave Little Squirrel',
    ageRange: '2nd',
    illustrationStyle: 'Whimsical anime art style',
    description: 'Join a brave little squirrel as they explore the magical forest and make new friends.',
    category: 'Adventure',
    heroType: 'animal',
    setting: 'Forest',
    expectedPages: 6,
  },
  {
    id: 'sample_ocean_explorer',
    title: 'Maya\'s Underwater Discovery',
    ageRange: '1st',
    illustrationStyle: 'Japanese animation style',
    description: 'A young girl discovers a hidden underwater world full of colorful sea creatures.',
    category: 'Exploration',
    heroType: 'person',
    setting: 'Ocean',
    expectedPages: 7,
  },
  {
    id: 'sample_space_journey',
    title: 'Cosmic the Space Cat',
    ageRange: '3rd',
    illustrationStyle: 'Vintage American cartoon',
    description: 'A curious cat travels through space, visiting planets and meeting alien friends.',
    category: 'Space',
    heroType: 'animal',
    setting: 'Space',
    expectedPages: 8,
  },
  {
    id: 'sample_garden_magic',
    title: 'The Secret Garden of Wonders',
    ageRange: 'kindergarten',
    illustrationStyle: 'Whimsical anime art style',
    description: 'A magical garden where flowers sing and plants tell stories to a young explorer.',
    category: 'Magic',
    heroType: 'person',
    setting: 'Garden',
    expectedPages: 6,
  },
  {
    id: 'sample_dragon_friend',
    title: 'Luna and the Friendly Dragon',
    ageRange: '2nd',
    illustrationStyle: 'Japanese animation style',
    description: 'A young girl befriends a gentle dragon and learns that friendship comes in all shapes and sizes.',
    category: 'Friendship',
    heroType: 'fantasy',
    setting: 'Fantasy Land',
    expectedPages: 7,
  },
  {
    id: 'sample_penguin_dance',
    title: 'Pip the Dancing Penguin',
    ageRange: '1st',
    illustrationStyle: 'Vintage American cartoon',
    description: 'A little penguin who loves to dance finds their own unique way to express themselves.',
    category: 'Self-Expression',
    heroType: 'animal',
    setting: 'Antarctica',
    expectedPages: 6,
  },
  {
    id: 'sample_knight_courage',
    title: 'Sir Timmy and the Dark Castle',
    ageRange: '3rd',
    illustrationStyle: 'Classic adventure comic style',
    description: 'A young knight faces their fear of the dark to save the kingdom from shadows.',
    category: 'Courage',
    heroType: 'person',
    setting: 'Medieval Kingdom',
    expectedPages: 8,
  },
  {
    id: 'sample_robot_friends',
    title: 'Zippy Makes Friends',
    ageRange: '2nd',
    illustrationStyle: 'Indian comic book art',
    description: 'A shy robot learns to make friends by sharing their amazing inventions.',
    category: 'Friendship',
    heroType: 'fantasy',
    setting: 'Future City',
    expectedPages: 7,
  },
  {
    id: 'sample_butterfly_seasons',
    title: 'Bella\'s Journey Through Seasons',
    ageRange: '1st',
    illustrationStyle: 'Whimsical anime art style',
    description: 'A brave butterfly travels through all four seasons, discovering the beauty of change.',
    category: 'Nature',
    heroType: 'animal',
    setting: 'Nature',
    expectedPages: 6,
  },
  {
    id: 'sample_wizard_apprentice',
    title: 'The Magic Paintbrush',
    ageRange: '4th',
    illustrationStyle: 'Japanese animation style',
    description: 'A young artist discovers a magical paintbrush that brings their drawings to life.',
    category: 'Magic',
    heroType: 'person',
    setting: 'Magical Studio',
    expectedPages: 8,
  },
]

async function generateSampleBook(bookData) {
  const apiKey = process.env.VENICE_API_KEY
  if (!apiKey) {
    throw new Error(
      'VENICE_API_KEY is not set. This repository must never carry a hardcoded key fallback.'
    )
  }
  
  console.log(`Generating book: ${bookData.title}...`)

  const storyPrompt = `Create a magical, engaging children's storybook with these specifications:
- Title: "${bookData.title}"
- Age range: ${bookData.ageRange} grade
- Hero type: ${bookData.heroType}
- Setting: ${bookData.setting}
- Illustration style: ${bookData.illustrationStyle}
- Create a story with ${bookData.expectedPages} pages
- Each page should have 6-8 complete, engaging sentences
- Make it publication-quality children's literature

Format the response as JSON with this structure:
{
  "title": "${bookData.title}",
  "characters": {
    "main": "Character name and brief description",
    "others": ["Other character names and descriptions"]
  },
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page text here with 6-8 complete, engaging sentences...",
      "imageDescription": "Detailed visual description of the illustration. Must be in ${bookData.illustrationStyle} style. Keep under 200 characters."
    }
  ]
}

Respond with ONLY valid JSON, no markdown, no explanations.`

  try {
    // Generate story
    const storyResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'venice-uncensored',
        messages: [
          {
            role: 'system',
            content: 'You are an award-winning expert children\'s book author. Always respond with valid JSON only, no additional text.',
          },
          { role: 'user', content: storyPrompt },
        ],
        temperature: 0.9,
        max_completion_tokens: 4000,
        response_format: { type: 'json_object' },
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    })

    if (!storyResponse.ok) {
      throw new Error(`Story generation failed: ${storyResponse.statusText}`)
    }

    const storyData = await storyResponse.json()
    const storyContent = storyData.choices?.[0]?.message?.content
    if (!storyContent) {
      throw new Error('No story content generated')
    }

    // Parse story JSON
    let parsedStory
    try {
      parsedStory = JSON.parse(storyContent)
    } catch (e) {
      const jsonMatch = storyContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedStory = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse story JSON')
      }
    }

    // Generate title page
    console.log(`  Generating title page for ${bookData.title}...`)
    const titlePagePrompt = `A beautiful children's book cover illustration with the title "${parsedStory.title || bookData.title}" prominently displayed. ${bookData.illustrationStyle} style, children's book cover, colorful, whimsical, high quality, detailed, charming, inviting, magical. The title text should be part of the illustration design.`
    
    const titlePageResponse = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nano-banana-pro',
        prompt: titlePagePrompt,
        width: 1280,
        height: 720,
        format: 'webp',
        steps: 1,
      }),
    })

    let titlePageImage = null
    if (titlePageResponse.ok) {
      const titlePageData = await titlePageResponse.json()
      titlePageImage = titlePageData.images?.[0]
    }

    // Generate pages
    const pages = []
    for (let i = 0; i < parsedStory.pages.length; i++) {
      const page = parsedStory.pages[i]
      console.log(`  Generating page ${i + 1}/${parsedStory.pages.length}...`)
      
      const imagePrompt = `${page.imageDescription || page.text.substring(0, 150)}, ${bookData.illustrationStyle} style, children's book illustration, colorful, whimsical, high quality, detailed, charming`
      
      const imageResponse = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-image',
          prompt: imagePrompt.substring(0, 1500),
          width: 1024,
          height: 768,
          format: 'webp',
          steps: 8,
        }),
      })

      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.statusText}`)
      }

      const imageData = await imageResponse.json()
      const imageBase64 = imageData.images?.[0]

      if (!imageBase64) {
        throw new Error('No image data returned')
      }

      pages.push({
        pageNumber: i + 1,
        text: page.text,
        image: `data:image/webp;base64,${imageBase64}`,
      })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const completeBook = {
      ...bookData,
      title: parsedStory.title || bookData.title,
      titlePage: titlePageImage ? {
        image: `data:image/webp;base64,${titlePageImage}`,
        title: parsedStory.title || bookData.title,
      } : undefined,
      pages,
      status: 'completed',
      createdAt: new Date().toISOString(),
    }

    return completeBook
  } catch (error) {
    console.error(`Error generating book ${bookData.title}:`, error)
    throw error
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'data', 'sample-books')
  
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  console.log('Starting sample book generation...')
  console.log(`Will generate ${SAMPLE_BOOKS.length} books`)
  console.log('')

  const generatedBooks = []

  for (let i = 0; i < SAMPLE_BOOKS.length; i++) {
    const bookData = SAMPLE_BOOKS[i]
    console.log(`[${i + 1}/${SAMPLE_BOOKS.length}] Processing: ${bookData.title}`)
    
    try {
      const book = await generateSampleBook(bookData)
      generatedBooks.push(book)
      
      const bookPath = path.join(outputDir, `${book.id}.json`)
      await writeFile(bookPath, JSON.stringify(book, null, 2))
      console.log(`  ✓ Saved to ${bookPath}`)
      console.log('')
    } catch (error) {
      console.error(`  ✗ Failed to generate ${bookData.title}:`, error)
      console.log('')
    }
  }

  const indexPath = path.join(outputDir, 'index.json')
  await writeFile(indexPath, JSON.stringify(generatedBooks, null, 2))
  console.log(`✓ Saved index to ${indexPath}`)
  console.log(`\nGenerated ${generatedBooks.length} books successfully!`)
}

main().catch(console.error)

