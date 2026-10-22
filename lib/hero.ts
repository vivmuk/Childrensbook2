import { buildCharacterFromPhotoPrompt, buildCharacterSheetPrompt } from './illustration-style'
import { chat, editImage, EDIT_MODEL_FALLBACKS, generateImage, parseModelJSON, resolveDefaultEditModel, resolveDefaultImageModel } from './venice'

/**
 * The hero, made first.
 *
 * A book with a real child in it used to paint every page straight from the
 * photo, which is why the hero drifted: each page was the model's fresh guess
 * at a photograph. Now the photo (or a parent's description) becomes one
 * painted character sheet in the book's own style, the parent looks at it and
 * approves it, and only then are the pages painted around that one picture.
 */

export interface HeroInfo {
  ageGroup: 'child' | 'teen' | 'adult'
  isAdult: boolean
  /** A reusable visual lock: hair, eyes, skin tone, outfit, build. */
  description: string
  suggestedName: string
}

/** Look at the photo and write the hero down in words the painter can reuse. */
export async function describeHeroPhoto(imageDataUrl: string, apiKey: string): Promise<HeroInfo | null> {
  try {
    const raw = await chat(apiKey, {
      system:
        'You help cast the hero of a wholesome children’s picture book. Look at the photo of one person and answer with ONLY a JSON object of this exact shape:\n' +
        '{"ageGroup":"child|teen|adult","description":"one precise sentence an illustrator can reuse on every page: apparent age, skin tone, hair colour and style, eye colour, build, and what they are wearing with colours (no names, no guesses about identity)","suggestedName":"one cheerful first name that fits them"}\n' +
        'Judge ageGroup honestly from the photo. Kind, respectful and family friendly.',
      user: [
        { type: 'text', text: 'Describe this person as a picture book hero.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
      json: true,
      temperature: 0.4,
      maxTokens: 300,
      timeoutMs: 45_000,
      models: ['gemini-3-flash-preview'],
    })
    const parsed = parseModelJSON(raw)
    const ageGroup: HeroInfo['ageGroup'] =
      parsed.ageGroup === 'adult' || parsed.ageGroup === 'teen' ? parsed.ageGroup : 'child'
    return {
      ageGroup,
      isAdult: ageGroup === 'adult',
      description: String(parsed.description || '').slice(0, 400),
      suggestedName: String(parsed.suggestedName || '').replace(/[^\p{L}'\- ]/gu, '').trim().slice(0, 24),
    }
  } catch {
    return null
  }
}

export interface CreateHeroInput {
  photo?: string
  description?: string
  name?: string
  isAdult?: boolean
  style: string
  /** A parent's note on the last attempt, e.g. "give her the red scarf". */
  tweak?: string
}

export interface CreateHeroResult {
  characterImage: string
  hero: HeroInfo
}

/**
 * Paint the hero sheet. With a photo, the photo is repainted in the book's
 * medium and described at the same time. With words only, the sheet is
 * painted from the description by the house painter.
 */
export async function createHero(input: CreateHeroInput, apiKey: string): Promise<CreateHeroResult> {
  const tweak = input.tweak?.trim() ? ` ${input.tweak.trim().replace(/\.?$/, '.')}` : ''

  if (input.photo) {
    const photo = input.photo.startsWith('data:') ? input.photo : `data:image/jpeg;base64,${input.photo}`
    const editModel = await resolveDefaultEditModel(apiKey)
    const [sheet, described] = await Promise.all([
      editImage(apiKey, {
        image: photo,
        prompt: buildCharacterFromPhotoPrompt(input.style, { isAdult: input.isAdult, name: input.name }) + tweak,
        model: editModel,
        fallbacks: EDIT_MODEL_FALLBACKS,
        aspectRatio: '3:4',
      }),
      describeHeroPhoto(photo, apiKey),
    ])

    const hero: HeroInfo = described || {
      ageGroup: input.isAdult ? 'adult' : 'child',
      isAdult: !!input.isAdult,
      description: input.description || '',
      suggestedName: '',
    }
    if (input.isAdult !== undefined) {
      hero.isAdult = input.isAdult
      hero.ageGroup = input.isAdult ? 'adult' : hero.ageGroup === 'adult' ? 'child' : hero.ageGroup
    }
    if (input.description?.trim()) hero.description = input.description.trim()

    if (sheet) return { characterImage: sheet.dataUrl, hero }

    // The edit models all refused the photo. Paint from the description instead,
    // so the parent still gets a hero to approve rather than an error.
    if (hero.description) {
      const painted = await paintFromWords(input.style, hero.description + tweak, apiKey)
      if (painted) return { characterImage: painted, hero }
    }
    throw new Error('We could not paint a character from that photo. A clear, well lit portrait works best.')
  }

  const description = input.description?.trim()
  if (!description) throw new Error('Add a photo or a few words about the hero.')
  const painted = await paintFromWords(input.style, description + tweak, apiKey)
  if (!painted) throw new Error('The painter could not make this hero just now. Please try again.')
  return {
    characterImage: painted,
    hero: {
      ageGroup: input.isAdult ? 'adult' : 'child',
      isAdult: !!input.isAdult,
      description,
      suggestedName: input.name || '',
    },
  }
}

async function paintFromWords(style: string, description: string, apiKey: string): Promise<string | null> {
  const model = await resolveDefaultImageModel(apiKey)
  const img = await generateImage(apiKey, {
    prompt: buildCharacterSheetPrompt(style, description),
    model,
    width: 768,
    height: 1024,
  })
  return img?.dataUrl || null
}
