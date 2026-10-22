import { NextRequest, NextResponse } from 'next/server'
import { setBook, getBook, type Book, type BookMeta, countUserBooks } from '@/lib/storage'
import {
  buildStoryStyleBrief,
  buildIllustrationPrompt,
  buildCoverIllustrationPrompt,
  buildCharacterSheetPrompt,
  buildSceneWithHeroPrompt,
  getStyle,
  styleModel,
  KQ_COVER_NEGATIVE,
} from '@/lib/illustration-style'
import {
  chat,
  editImage,
  generateImage,
  parseModelJSON,
  resolveApiKey,
  resolveDefaultEditModel,
  resolveDefaultImageModel,
  runWithConcurrency,
  EDIT_MODEL_FALLBACKS,
} from '@/lib/venice'

// The story is written inside the request; the pictures are painted after it
// returns. Give the writer room on a slow day.
export const maxDuration = 300

const LOCAL_USER_ID = 'local-user'

const AGE_TO_COMPLEXITY: Record<string, string> = {
  kindergarten: 'very simple, with short sentences (3–5 words each) and basic vocabulary — think Dr. Seuss level',
  '1st': 'simple, with short clear sentences and easy, familiar words — think early reader books',
  '2nd': 'moderate, with clear sentences and age-appropriate vocabulary — think Magic Tree House level',
  '3rd': 'moderate, with varied sentence structure and expanding vocabulary — think Roald Dahl level',
  '4th': 'more complex, with descriptive language, metaphors, and varied vocabulary — think Diary of a Wimpy Kid level',
  '5th': 'complex, with rich vocabulary, sophisticated sentence structure, and nuanced emotions — think Harry Potter level',
}

// How much text belongs on a page at each reading level. The old prompt asked
// for "6–8 sentences" at every grade, which fought the kindergarten rule of
// "3–5 word sentences" — so we scale length to the age instead.
const AGE_TO_PAGELEN: Record<string, string> = {
  kindergarten: '2–3 very short sentences (about 3–6 words each)',
  '1st': '3–4 short, simple sentences',
  '2nd': '4–5 clear, easy-to-follow sentences',
  '3rd': '5–6 sentences with a little variety in length',
  '4th': '6–7 descriptive, well-crafted sentences',
  '5th': '6–8 rich, varied, vivid sentences',
}

// Younger readers love a repeated refrain they can chant along with.
const AGE_WANTS_REFRAIN: Record<string, boolean> = {
  kindergarten: true, '1st': true, '2nd': true, '3rd': false, '4th': false, '5th': false,
}

interface HeroContext {
  description?: string
  isAdult?: boolean
  name?: string
}

// Improved story prompt that encourages better educational content and AI literacy
function buildStoryPrompt(
  storyIdea: string,
  ageRange: string,
  illustrationStyle: string,
  pageCount: number,
  opts: { language?: string; hero?: HeroContext } = {},
): string {
  const complexity = AGE_TO_COMPLEXITY[ageRange] || AGE_TO_COMPLEXITY['2nd']
  const pageLen = AGE_TO_PAGELEN[ageRange] || AGE_TO_PAGELEN['2nd']
  const wantsRefrain = AGE_WANTS_REFRAIN[ageRange] ?? false
  const refrainBlock = wantsRefrain
    ? '\n- Include ONE short, fun refrain (a repeated rhythmic line) that comes back on several pages so the child can chant along.'
    : ''

  const language = (opts.language || 'English').trim()
  const languageBlock =
    language && language.toLowerCase() !== 'english'
      ? `\nLANGUAGE:
- Write the title and ALL page text entirely in ${language}, with natural, native-sounding phrasing a ${language}-speaking parent would happily read aloud.
- Keep every "imageDescription" in ENGLISH (the illustration model reads English best).\n`
      : ''

  // When the hero comes from a real photo we describe them so the story is
  // genuinely about that person. A grown-up hero stays a grown-up — but the
  // tale is still wholesome, positive and inspiring for the child reading it.
  const hero = opts.hero
  let heroBlock = ''
  if (hero?.description || hero?.name) {
    const heroName = hero.name ? `, named ${hero.name},` : ''
    const looks = hero.description || 'as shown in the painted character sheet the illustrator already has'
    heroBlock = hero.isAdult
      ? `\nREAL-LIFE HERO (GROWN-UP):
- The main character is a real grown-up${heroName} who looks like this: ${looks}
- Use that description, word for word, as visualBible.mainCharacter.
- This is a child's beloved grown-up (a parent, grandparent, teacher, or hero they look up to). Make the story ABOUT this grown-up and their kindness, courage, talents, and big heart.
- Keep it 100% wholesome, warm, uplifting and INSPIRING — show the grown-up doing something brave, caring, creative, or adventurous that makes the child reader proud and hopeful.
- Keep the grown-up an adult in every page and imageDescription (do NOT turn them into a child). Surround them with gentle, age-appropriate wonder.\n`
      : `\nREAL-LIFE HERO (CHILD):
- The main character is a real child${heroName} who looks like this: ${looks}
- Use that description, word for word, as visualBible.mainCharacter.
- Make the story ABOUT this child being brave, curious, and kind. Keep them a child in every page and imageDescription.\n`
  }

  return `You are an award-winning children's book author celebrated for creating stories that are both magical and educational. Your books have won the Caldecott Medal and the Newbery Medal. Create a masterpiece children's storybook based on this idea:

"${storyIdea}"
${heroBlock}${languageBlock}
STORY REQUIREMENTS:
- Reading level: ${ageRange} grade — language complexity should be ${complexity}
- Exactly ${pageCount} pages — no more, no less
- Each page: ${pageLen}. Match this length to the reading level — do NOT overload young readers.
- Always positive, hopeful and inspiring — gentle stakes, no scary or sad endings; every story leaves the reader uplifted
- Write at publication quality — every sentence should delight, teach, or move the reader${refrainBlock}
- Page 1 must open on something happening: a sound, a movement, a question in the air. Never open on weather, scenery, or a slow introduction.
- The LAST page must close with one short, warm, open question the grown-up can ask the child. One sentence only. Do not label it, number it, or explain it.

TITLE:
- Short, evocative and memorable — 6 words or fewer. No "Once upon a time", no generic titles.

WRITING CRAFT GUIDELINES:
- Use vivid sensory details: what do characters see, hear, feel, smell?
- Vary sentence length for rhythm — short punchy sentences mixed with longer flowing ones
- Create memorable characters with distinct voices and personalities
- Build emotional resonance — let readers feel the joy, wonder, fear, and triumph
- Include natural-sounding dialogue that feels real and age-appropriate
- Weave life lessons gently — never preachy, always through story and character
- Avoid clichés and tired openings; surprise and delight the reader
- Every page should end with something that makes the reader want to turn to the next page

NARRATIVE STRUCTURE:
- Pages 1–2: Introduce world and main character in a captivating way
- Pages 3–${Math.ceil(pageCount * 0.6)}: Rising action — challenge, adventure, discovery
- Pages ${Math.ceil(pageCount * 0.6) + 1}–${pageCount - 1}: Climax and emotional peak
- Page ${pageCount}: Satisfying resolution with a lasting lesson or warm feeling

${buildStoryStyleBrief(illustrationStyle)}
VISUAL BIBLE (critical for consistent illustrations):
- First lock a "visualBible": a precise, reusable description of the MAIN CHARACTER (species/age, hair, eyes, skin tone, exact outfit + colors, size, signature accessory) and a "colorPalette" of 3–5 colors that define the whole book's look.
- In EVERY imageDescription, paste the main character description from the visualBible VERBATIM (do not rephrase it) so the character looks identical on every page. Do the same for any recurring side character.
- Keep the colorPalette consistent across all pages.

ILLUSTRATION DESCRIPTIONS:
- Each imageDescription should be vivid and specific (up to 800 characters), in ENGLISH.
- Start with the verbatim main-character description, then the setting, lighting, action, mood, and the colorPalette.
- Vary the camera framing across pages for visual rhythm: use a mix of wide establishing shots, medium shots, and emotional close-ups. State the shot type.
- Style: ${getStyle(illustrationStyle).label} — ${getStyle(illustrationStyle).medium}

Respond with ONLY valid JSON — no markdown, no code blocks, no extra text:

{
  "title": "The Story Title (≤6 words)",
  "visualBible": {
    "mainCharacter": "Precise reusable visual description: species/age, hair, eyes, skin tone, exact outfit and colors, size, signature accessory",
    "colorPalette": "3–5 defining colors for the whole book"
  },
  "characters": {
    "main": "Same as visualBible.mainCharacter — the verbatim string to reuse",
    "others": ["Description of other character 1", "Description of other character 2"]
  },
  "pages": [
    {
      "pageNumber": 1,
      "shotType": "wide establishing shot | medium shot | close-up",
      "text": "Beautiful, publication-quality children's book prose matching the required page length...",
      "imageDescription": "Begin with the VERBATIM mainCharacter description, then setting, lighting, action, mood, shot type, and colorPalette. English. Up to 800 characters."
    }
  ]
}`
}

export async function POST(request: NextRequest) {
  try {
    const userId = LOCAL_USER_ID

    // Enforce per-user book limit (cheap COUNT, no page images loaded)
    const userBookCount = await countUserBooks(userId)
    if (userBookCount >= 100) {
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
      narratorVoice = 'heart',
      imageModel: requestedModel = '',
      character,
      userVeniceApiKey,
      cartoonHeroImage,
      language = 'English',
      hero,
      consistentHero = true,
      dedication,
    } = await request.json()

    if (!storyIdea || !ageRange || !illustrationStyle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // The parent's own key takes precedence over the site's.
    const apiKey = resolveApiKey(userVeniceApiKey)
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Venice API key available. Please provide your Venice AI API key.' },
        { status: 500 },
      )
    }

    const pageCount = Math.min(Math.max(parseInt(storyLength) || 8, 4), 12)
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // The approved hero sheet. `cartoonHeroImage` is what older clients send.
    const heroImage: string | undefined =
      (hero && typeof hero.image === 'string' && hero.image) || (typeof cartoonHeroImage === 'string' && cartoonHeroImage) || undefined
    const heroContext: HeroContext | undefined =
      hero && (hero.description || heroImage)
        ? {
            description: hero.description ? String(hero.description).slice(0, 500) : undefined,
            isAdult: !!hero.isAdult,
            name: hero.name ? String(hero.name).slice(0, 40) : undefined,
          }
        : undefined

    const storyPrompt = buildStoryPrompt(storyIdea, ageRange, illustrationStyle, pageCount, {
      language,
      hero: heroContext,
    })

    console.log(`[${bookId}] Writing story (${pageCount} pages, ${ageRange} grade)`)

    let storyData: any
    try {
      const content = await chat(apiKey, {
        system:
          "You are an award-winning children's book author. CRITICAL: Respond with ONLY valid JSON. No markdown code blocks, no explanations, no text outside the JSON object.",
        user: storyPrompt,
        json: true,
        temperature: 0.85,
        maxTokens: 16000,
      })
      storyData = parseModelJSON(content)
    } catch (err: any) {
      const msg = err?.message || 'Story generation failed. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const pages: any[] = Array.isArray(storyData.pages) ? storyData.pages.filter((p: any) => p && p.text) : []
    if (!pages.length) {
      return NextResponse.json({ error: 'The story came back empty. Please try again.' }, { status: 502 })
    }

    const meta: BookMeta = {
      heroImage,
      heroName: heroContext?.name,
      heroDescription: heroContext?.description || storyData.visualBible?.mainCharacter,
      heroIsAdult: heroContext?.isAdult,
      visualBible: storyData.visualBible,
      otherCharacters: Array.isArray(storyData.characters?.others) ? storyData.characters.others.slice(0, 3) : [],
      scenes: pages.map((p: any) => ({ imageDescription: p.imageDescription, shotType: p.shotType })),
      language,
      storyIdea: String(storyIdea).slice(0, 2000),
      ...(dedication ? { dedication: String(dedication).slice(0, 200) } : {}),
    }

    const book: Book = {
      id: bookId,
      title: storyData.title || 'My Story',
      pages: [],
      ageRange,
      illustrationStyle,
      status: 'generating',
      createdAt: new Date().toISOString(),
      expectedPages: pages.length,
      generationProgress: 10,
      narratorVoice,
      character,
      prompts: { story: storyPrompt, images: [] },
      meta,
      ...(userId && { ownerId: userId }),
    }

    await setBook(bookId, book)

    // Painting runs after the response, and the page polls for progress.
    paintBook(book, pages, {
      apiKey,
      requestedModel: String(requestedModel || ''),
      consistentHero: consistentHero !== false,
    }).catch(async err => {
      console.error(`[${bookId}] Painting failed:`, err?.message)
      const b = await getBook(bookId)
      if (b) { b.status = 'error'; await setBook(bookId, b) }
    })

    return NextResponse.json({ bookId, status: 'generating' })
  } catch (err: any) {
    console.error('generate-book error:', err?.message)
    return NextResponse.json({ error: 'Failed to generate book. Please try again.' }, { status: 500 })
  }
}

// ── Painting ─────────────────────────────────────────────────────────────────

/** The painter for this book: Automatic, the style's specialist, or a named model. */
async function resolvePainter(requested: string, style: string, apiKey: string): Promise<string> {
  if (!requested || requested === 'auto') return resolveDefaultImageModel(apiKey)
  if (requested === 'specialist') return styleModel(style)
  return requested
}

/**
 * Paint the book, hero first.
 *
 *  1. The hero sheet. A parent's approved sheet is used as is; otherwise one is
 *     painted from the story's own description of its main character.
 *  2. The cover and every page, each painted around that sheet, so the hero is
 *     the same on every page. The cover letters the book's title into the art.
 *  3. Any page the reference painter refuses is painted from words instead, so
 *     one refusal never leaves a hole in the book.
 */
async function paintBook(
  book: Book,
  pages: any[],
  opts: { apiKey: string; requestedModel: string; consistentHero: boolean },
) {
  const { apiKey } = opts
  const bookId = book.id
  const style = book.illustrationStyle
  const meta = book.meta || {}
  const painter = await resolvePainter(opts.requestedModel, style, apiKey)
  const editModel = await resolveDefaultEditModel(apiKey)
  meta.imageModel = painter

  // One fixed seed for the whole book keeps the look steady across pages.
  const bookSeed = Math.abs(Array.from(bookId).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 999_999_999

  const others = meta.otherCharacters?.length ? meta.otherCharacters.join('; ') : ''
  const mainCharacter = meta.heroDescription || meta.visualBible?.mainCharacter || ''
  const heroAgeNote = meta.heroIsAdult
    ? `The hero is a grown-up${meta.heroName ? ` named ${meta.heroName}` : ''}; always paint them as a fully grown adult, never as a child. `
    : meta.heroName
      ? `The hero is ${meta.heroName}. `
      : ''
  const textLock = `${heroAgeNote}${mainCharacter ? `Main character: ${mainCharacter}. ` : ''}${others ? `Other characters: ${others}. ` : ''}Keep every character identical on every page.`
  const palette = meta.visualBible?.colorPalette || undefined

  const totalImages = pages.length + 1 + (meta.heroImage || !opts.consistentHero ? 0 : 1)
  let done = 0
  const tick = async () => {
    done++
    book.generationProgress = Math.min(99, 10 + Math.round((done / totalImages) * 89))
    await setBook(bookId, book)
  }

  // 1. The hero sheet.
  let heroSheet = meta.heroImage
  if (!heroSheet && opts.consistentHero && mainCharacter) {
    const sheet = await generateImage(apiKey, {
      prompt: buildCharacterSheetPrompt(style, mainCharacter),
      model: painter,
      width: 768,
      height: 1024,
      seed: bookSeed,
    })
    if (sheet) {
      heroSheet = sheet.dataUrl
      meta.heroImage = heroSheet
    }
    await tick()
  }

  const imagePrompts: Array<{ pageNumber: number | 'cover'; prompt: string }> = []

  // 2. One task per picture, cover first.
  const paintOne = async (which: number | 'cover'): Promise<string | null> => {
    const isCover = which === 'cover'
    const page = isCover ? pages[0] : pages[which as number]
    const scene = page?.imageDescription || String(page?.text || '').slice(0, 400) || 'A magical moment'
    const shot = isCover ? undefined : page?.shotType

    if (heroSheet) {
      const prompt = buildSceneWithHeroPrompt({
        style,
        scene,
        shot,
        palette,
        characters: others || undefined,
        heroName: meta.heroName,
        cover: isCover,
        title: isCover ? book.title : undefined,
      })
      imagePrompts.push({ pageNumber: which, prompt })
      const img = await editImage(apiKey, {
        image: heroSheet,
        prompt,
        model: editModel,
        fallbacks: EDIT_MODEL_FALLBACKS,
        aspectRatio: '3:2',
      })
      if (img) return img.dataUrl
      console.warn(`[${bookId}] Reference painting refused for ${which}; painting from words`)
    }

    const prompt = isCover
      ? buildCoverIllustrationPrompt({ style, scene, palette, characters: textLock, title: book.title })
      : buildIllustrationPrompt({ style, scene, shot, palette, characters: textLock })
    if (!heroSheet) imagePrompts.push({ pageNumber: which, prompt })
    const img = await generateImage(apiKey, {
      prompt,
      model: painter,
      width: 1248,
      height: 832,
      seed: isCover ? bookSeed : (bookSeed + (which as number) + 1) % 999_999_999,
      negativePrompt: isCover ? KQ_COVER_NEGATIVE : NEGATIVE_PROMPT,
    })
    return img?.dataUrl || null
  }

  const tasks: Array<() => Promise<string | null>> = [
    () => paintOne('cover'),
    ...pages.map((_, i) => () => paintOne(i)),
  ]
  const results = await runWithConcurrency(tasks, 4, tick)

  if (results[0]) book.titlePage = { image: results[0], title: book.title }

  let failed = 0
  book.pages = pages.map((p: any, i: number) => {
    const image = results[i + 1]
    if (!image) failed++
    return { pageNumber: i + 1, text: String(p.text), image: image || PLACEHOLDER_IMAGE }
  })
  if (failed) console.warn(`[${bookId}] Finished with ${failed} placeholder picture(s)`)

  book.status = 'completed'
  book.generationProgress = 100
  book.meta = meta
  if (book.prompts) book.prompts.images = imagePrompts
  await setBook(bookId, book)
  console.log(`[${bookId}] Book complete`)
}

// A calm, valid SVG used as a last-resort placeholder so a single failed
// picture never throws away an otherwise complete book. The studio can repaint it.
const PLACEHOLDER_IMAGE = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1248" height="832">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="rgb(58,35,64)"/><stop offset="100%" stop-color="rgb(27,29,58)"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="52%" font-family="Georgia, serif" font-size="40" fill="rgb(246,231,201)" text-anchor="middle" opacity="0.9">This picture is still to be painted</text>` +
    `</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
})()

// Things we never want in a page illustration. A dedicated negative prompt
// removes far more artifacts than baking "no text" into the positive one.
const NEGATIVE_PROMPT =
  'text, words, letters, captions, signature, watermark, logo, extra fingers, extra limbs, deformed hands, fused fingers, distorted face, mutated, disfigured, duplicate characters, cloned face, blurry, lowres, jpeg artifacts, grainy, scary, creepy, gore, horror, nsfw'
