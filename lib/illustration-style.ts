/**
 * The illustration system, in one place.
 *
 * Two different things live here, and keeping them apart is the whole point:
 *
 *  1. HOUSE RULES — what makes any KinderQuill picture recognisable as ours no
 *     matter which style a parent picked: one clear thing to look at, one warm
 *     light source, a child-safe scene, a consistent character, no lettering
 *     baked into the art (the cover is the one exception: it letters the
 *     book's own title into the painting), and a painting that fills the
 *     whole canvas.
 *
 *  2. STYLES — the medium: gouache, watercolour, collage, clay, comic, and so
 *     on. Each style carries its own palette guidance, because a classic
 *     cartoon should look like a classic cartoon and not like the app's own
 *     night colours.
 *
 * 3. THE MODEL — which machine paints the medium. Measured per style.
 *
 * Before this file existed the medium was hard-coded to "thick gouache" for
 * every style, so choosing Retro Bold Comic still produced a gouache painting.
 * The house rules are now the constant and the style is the variable.
 */

export interface IllustrationStyle {
  /** Stored on the book and used in URLs. Never change one of these. */
  value: string
  label: string
  /** One line for the picker. */
  blurb: string
  /** What the picture is made of. This is the style. */
  medium: string
  /** Colour guidance for this style specifically. */
  palette: string
  /** Things that ruin this particular style. */
  avoid: string
  /**
   * The model that paints this style. Omitted means the house painter.
   *
   * One model for every style was the wrong shape: a fine-art painting model
   * cannot assemble a picture out of torn paper, and a graphic model cannot
   * leave gouache matte. Each of these was chosen by painting the same scene
   * with each candidate and looking at the result, never by reputation.
   */
  model?: string
}

/**
 * Order matters: it is the order a parent sees in the picker and the order the
 * styles appear on the gallery, so the app's own painted look leads.
 */
export const ILLUSTRATION_STYLES: IllustrationStyle[] = [
  {
    value: 'gouache',
    label: 'Painted Gouache',
    blurb: 'Thick paint at dusk, one warm lamp',
    medium:
      'Hand painted gouache on textured paper. Flat opaque planes of colour laid in side by side ' +
      'with hard edges where shapes meet, visible brush strokes, dry-brush scumbling in the ' +
      'shadows, paper tooth showing through. No airbrush, no soft gradients, no vector edges.',
    palette:
      'Deep indigo and deep plum for everything in shade, warm lamp cream for lit surfaces, ' +
      'moon white for the brightest highlights, and one warm amber light source.',
    avoid: 'neon, pure black, airbrushed gradients, digital smoothing, 3D render',
  },
  {
    value: 'ghibli',
    label: 'Anime Watercolour',
    blurb: 'Soft painted skies, dreamy detail',
    medium:
      'Drawn in the hand of a Japanese animated film: soft watercolour backgrounds with visible ' +
      'paper grain, clean delicate ink lines over the paint, expressive simple faces, enormous ' +
      'luminous skies, small charming background detail everywhere.',
    palette:
      'Luminous skies in cerulean and pale gold, soft greens, warm lamplight, gentle pastel ' +
      'shadows rather than black. Keep the hour the scene describes: if the scene is at dusk or ' +
      'night, the sky stays dusk or night, however bright the style usually is.',
    avoid: 'heavy black outlines, harsh contrast, digital cel shading, photorealism',
  },
  {
    value: 'watercolor',
    label: 'Whimsical Watercolour',
    blurb: 'Gentle washes, light as air',
    medium:
      'Loose transparent watercolour: wet-on-wet blooms, visible brush edges where a stroke ' +
      'stopped, pigment granulating in the paper, white of the paper left for light, fine pen ' +
      'line only where it is needed.',
    palette:
      'Pale sage, dusty rose, soft ochre, washed indigo, and a great deal of unpainted pale paper.',
    avoid: 'opaque flat fills, hard edges everywhere, black outlines, heavy shading',
  },
  {
    value: 'american-classic',
    label: 'Classic Cartoon',
    blurb: 'Bold outlines, cheerful and bright',
    medium:
      'Classic mid-century American animation drawing: confident ink outlines of even weight, ' +
      'flat bright fills, rounded appealing shapes, expressive movement, warm painted ' +
      'backgrounds under simple flat characters.',
    palette:
      'Sunny primary colours, warm cream, soft sky blue, tomato red, with clean bright fills.',
    avoid: 'muddy colour, sketchy lines, grim or dark scenes, photographic texture',
  },
  {
    value: 'tintin',
    label: 'European Comic',
    blurb: 'Clean lines, precise and adventurous',
    medium:
      'Ligne claire: crisp even outlines of a single weight, flat unmodulated colour, precise ' +
      'detail in costume and architecture, no hatching, every object clearly drawn and readable.',
    palette:
      'Clear flat colour: warm cream, brick red, cobalt, mustard, sage, with black used only as line.',
    avoid: 'hatching, shading gradients, sketchy edges, loose painterly brushwork',
  },
  {
    value: 'amar-chitra',
    label: 'Indian Illustrated',
    blurb: 'Rich panels, bold ink, vivid colour',
    medium:
      'Indian comic book illustration of the classic era, as printed on cheap newsprint: heavy ' +
      'black ink keylines of varying thickness that hold every shape shut, colour printed slightly ' +
      'out of register so it slips a little outside the line, dense traditional detail in clothing, ' +
      'jewellery and ornament, richly patterned textiles and carved architecture in the background, ' +
      'faces drawn with large expressive eyes. Poster-flat colour inside the lines, no shading ' +
      'except a hard-edged ink shadow. Dense, decorated and slightly gaudy rather than clean.',
    palette:
      'Marigold, vermilion, deep peacock blue, leaf green, earth ochre, with strong black line.',
    avoid:
      'clean modern flat vector cartoon, minimal or empty backgrounds, soft shading, muted washed ' +
      'colour, sketchy or vague linework, western cartoon proportions',
    model: 'qwen-image-3',
  },
  {
    value: 'chacha-chaudhary',
    label: 'Retro Bold Comic',
    blurb: 'Simple lines, big laughs',
    medium:
      'Retro Indian comic strip cartooning from a cheap weekly: a thick, slightly wobbly black ' +
      'brush outline around everything, flat unshaded poster colour, characters built from very ' +
      'simple round shapes with big expressive faces, and a busy hand-lettered-looking background ' +
      'of walls, crowds and small comic detail. Rough printed feel, slightly uneven inking, ' +
      'as if printed quickly on cheap paper.',
    palette:
      'Bright flat primaries and secondaries: yellow, red, blue, green, with heavy black line.',
    avoid:
      'smooth clean vector cartoon, soft rounded preschool style, realistic proportions, subtle ' +
      'colour, detailed rendering, shading',
    model: 'qwen-image-3',
  },
  {
    value: 'papercut',
    label: 'Torn Paper Collage',
    blurb: 'Torn paper, painted texture, bold shapes',
    medium:
      'A flat paper collage, and nothing else: the ENTIRE picture is built from pieces of ' +
      'hand-painted paper torn out and glued down, so the child, the animal, the stump, the light ' +
      'and even the sky are each their own torn paper shape. Every edge in the picture is a torn, ' +
      'ragged, slightly fibrous paper edge. Each layer casts a small soft shadow onto the layer ' +
      'underneath, so the picture has real depth made of stacked paper. The painted texture of the ' +
      'paper is visible inside each shape. There is no painted scene underneath and no drawn lines.',
    palette: 'Bold simple colour fields: sunflower, scarlet, deep blue, leaf green, cream paper.',
    avoid:
      'an ordinary painting placed inside a torn paper border, a paper frame or mat around the ' +
      'picture, smooth digital shapes, gradient fills, drawn outlines, photographic texture',
    model: 'gpt-image-2-5-flare',
  },
  {
    value: 'crayon',
    label: 'Crayon and Pencil',
    blurb: 'Waxy crayon, soft pencil, warm paper',
    medium:
      'Drawn with wax crayon and coloured pencil on warm tinted paper: visible waxy grain, uneven ' +
      'pressure, colour that skips, soft pencil shading, and the paper tone left showing as the ' +
      'middle value everywhere.',
    palette:
      'Waxy ochre, brick, olive, dusty blue and warm brown over a cream or kraft paper ground.',
    avoid: 'perfectly flat colour, digital smoothness, hard clean edges, glossy finish',
  },
  {
    value: 'clay',
    label: 'Clay and Felt',
    blurb: 'Stop-motion set, soft and touchable',
    medium:
      'A photographed stop-motion set: characters modelled from soft clay and wool felt with ' +
      'visible thumbprints and fibre, miniature cloth costumes with real weave, a hand-built ' +
      'diorama set, shallow depth of field, gentle studio lighting.',
    palette: 'Warm earthy clay tones, soft wool pastels, muted greens and ochres, cosy lamplight.',
    avoid: 'drawn linework, flat illustration, cel shading, harsh studio light, glossy plastic',
  },
  {
    value: 'nordic',
    label: 'Nordic Flat',
    blurb: 'Calm, minimal, beautifully restrained',
    medium:
      'Modern Scandinavian picture-book art: very simple geometric shapes, generous empty space, ' +
      'clean flat colour with only two or three tones per element, a few charming small details, ' +
      'nothing crowded. The shapes are cut-out simple, never drawn loosely.',
    palette: 'Muted dusty pastels: sage, clay, pale mustard, soft charcoal, chalky off white.',
    avoid: 'busy detail, texture, gradients, bright saturated colour, clutter',
  },
  {
    value: 'silhouette',
    label: 'Night Silhouette',
    blurb: 'Dark shapes, glowing windows and stars',
    medium:
      'Cut-paper silhouette scenes at night: near-black shapes with clean edges, layered depth, ' +
      'and warm light glowing through windows, lanterns and gaps, with stars and gentle weather ' +
      'in the sky.',
    palette:
      'Midnight blue and ink black for the shapes, warm amber and honey cream for every light, ' +
      'pale silver for the moon and stars.',
    avoid: 'daylight, bright colour, mid-tones, detailed rendering inside the dark shapes',
  },
]

const BY_VALUE: Record<string, IllustrationStyle> = Object.fromEntries(
  ILLUSTRATION_STYLES.map((s) => [s.value, s]),
)

/**
 * Unknown values fall back to the app's own painted look rather than throwing:
 * books made before the style list existed stored a full prompt string here.
 */
export function getStyle(value: string | undefined): IllustrationStyle {
  if (!value) return ILLUSTRATION_STYLES[0]
  if (BY_VALUE[value]) return BY_VALUE[value]
  const lower = value.toLowerCase()
  const byLabel = ILLUSTRATION_STYLES.find((s) => s.label.toLowerCase() === lower)
  if (byLabel) return byLabel
  const byPrompt = ILLUSTRATION_STYLES.find((s) => value.includes(s.medium.slice(0, 24)))
  return byPrompt || ILLUSTRATION_STYLES[0]
}

/**
 * The model that paints when a parent leaves the picker on Automatic.
 *
 * Grok Imagine is the house painter, and Muse takes over whenever Venice lists
 * it (lib/venice.ts resolveDefaultImageModel reads the live list, because a
 * model's id is Venice's to publish, not ours to guess). Both were chosen by
 * Vivek on 2026-10-22 as the default for every style.
 *
 * A style's own `model` is the specialist measured to win that medium against
 * flux-2-max. It is no longer the default; it is what "Style specialist" in
 * the advanced picker means.
 */
export const HOUSE_IMAGE_MODEL = 'grok-imagine-image'

/** The specialist for a style, or the house painter when it has none. */
export function styleModel(value: string | undefined): string {
  return getStyle(value).model || HOUSE_IMAGE_MODEL
}

/** One painted example of each style, made by scripts/generate-style-plates.mjs. */
export function stylePlate(value: string): string {
  return `/styles/${getStyle(value).value}.webp`
}

/* ─────────────────────────────── House rules ───────────────────────────────
   True for every style. These are the lines that make a picture ours, and the
   lines that stop image models doing the things they like to do. */

/**
 * Hard ceiling on every prompt we assemble.
 *
 * flux-2-max rejects anything over 3000 characters, and it does it with a 400
 * in the middle of a book, which is exactly how the Nimbu the Night Bus sample
 * lost its paintings: the torn-paper recipe pushed the assembled prompt over the
 * line. Every image model here allows at least this much, so one number keeps us
 * inside all of them with room to spare.
 */
export const PROMPT_LIMIT = 2800

const HOUSE_COMPOSITION =
  'Clear single focal point the eye lands on first, generous calm space around it, strong ' +
  'silhouette that reads at thumbnail size, gentle depth so the eye can rest.'

const HOUSE_LIGHT =
  'Lighting: one single warm light source in the picture, close and low, throwing a soft pool of ' +
  'light and long gentle shadows. The rest of the scene falls away. Never two competing light ' +
  'sources, never flat even lighting.'

const HOUSE_FULL_BLEED =
  'The picture fills the whole canvas edge to edge: no paper margin, no white border, no frame ' +
  'and no vignette down the sides.'

const HOUSE_CLEAN =
  'Never include text, letters, words, numbers, lettering, signage, shop signs, street signs, ' +
  'billboards, posters, book titles, watermarks or an artist signature anywhere in the picture.'

const HOUSE_CHILD_SAFE =
  'Warm, gentle and age appropriate: nothing frightening, no weapons, no distress, no adult ' +
  'themes. Cosy and magical rather than busy or spectacular.'

export const KQ_NEGATIVE_EXTRA =
  'text, letters, words, numbers, lettering, signage, shop signs, street signs, billboards, ' +
  'posters, book titles, gibberish writing, watermark, signature, artist name, logo, border, ' +
  'frame, vignette, neon, lens flare, pure black, 3D render, photograph, manga screencap'

export interface IllustrationParts {
  /** A value from ILLUSTRATION_STYLES, e.g. 'papercut'. */
  style: string
  /** The character lock from the story's visual bible. */
  characters?: string
  /** The colour palette the story locked, if any. */
  palette?: string
  /** Shot type, e.g. "wide establishing shot". */
  shot?: string
  /** What the page shows. */
  scene: string
}

/**
 * Assemble one illustration prompt. Order matters to image models, and this was
 * measured rather than guessed: the medium leads, because the medium is what the
 * parent chose. It was tried third behind a generic "picture book illustration"
 * line and the medium lost to it every time, which is how torn paper collage kept
 * coming back as a smooth digital painting wearing a torn paper border.
 */
export function buildIllustrationPrompt(parts: IllustrationParts): string {
  const style = getStyle(parts.style)
  const { characters, palette, shot, scene } = parts

  return [
    style.medium,
    characters ? `${characters}.` : '',
    'Hand made children\u2019s picture book illustration.',
    `Palette: ${style.palette}`,
    palette ? `Continue the book\u2019s own palette: ${palette}.` : '',
    scene,
    shot ? `Shot: ${shot}.` : '',
    HOUSE_LIGHT,
    HOUSE_COMPOSITION,
    HOUSE_CHILD_SAFE,
    HOUSE_FULL_BLEED,
    `Avoid: ${style.avoid}.`,
    // The medium is repeated as the last instruction. A long page brief in the
    // middle was drowning it: the same collage clause produced a real collage on
    // its own and a smooth painting inside a book, purely because the book prompt
    // is longer and the scene fills the space between.
    `Remember: the whole picture is made as ${style.medium.split('.')[0]}.`,
    HOUSE_CLEAN,
  ]
    .filter(Boolean)
    .join(' ')
    .substring(0, PROMPT_LIMIT)
}

/**
 * The cover carries the book's name in the painting itself, lettered by the
 * image model as part of the art, the way a real picture book cover is drawn.
 * There is no type laid over it afterwards, and no plate or banner behind it.
 */
export function coverTitleRule(title: string): string {
  const t = title.replace(/["\u201c\u201d]/g, '').trim()
  return (
    `The book title "${t}" is hand lettered into the painting across the upper third, large, ` +
    `bold and joyful, spelled exactly "${t}", every letter correct and fully inside the picture. ` +
    'The lettering is painted in the same medium as the rest of the picture and belongs to the ' +
    'scene, with no banner, ribbon, plaque, sign, label, frame or box behind it. ' +
    'That title is the only writing anywhere in the picture: no author name, no subtitle, no other words.'
  )
}

export const KQ_COVER_RULE =
  'Cover composition: one hero moment, the main character large and unmistakably the subject, ' +
  'placed in the lower two thirds, with calm painted sky or space in the upper third where the ' +
  'title is lettered.'

/** Negative prompt for a cover: the house negatives, minus the ban on lettering. */
export const KQ_COVER_NEGATIVE =
  'misspelled title, extra words, subtitle, author name, gibberish writing, watermark, signature, ' +
  'logo, banner, ribbon, plaque, label, text box, border, frame, vignette, neon, lens flare, ' +
  'pure black, 3D render, photograph'

/**
 * Assemble the cover prompt: the medium, the title lettered into the art, the
 * composition, then the ordinary page brief without its "no text" rule.
 */
export function buildCoverIllustrationPrompt(parts: IllustrationParts & { title?: string }): string {
  const style = getStyle(parts.style)
  const title = parts.title?.trim()
  const page = buildIllustrationPrompt(parts).replace(HOUSE_CLEAN, '')
  return [
    style.medium,
    'Front cover illustration for a children\u2019s picture book.',
    title ? coverTitleRule(title) : 'Leave the upper third as quiet painted space.',
    KQ_COVER_RULE,
    page,
    title ? `Remember: the title "${title}" is lettered into the painting, spelled exactly.` : HOUSE_CLEAN,
  ]
    .join(' ')
    .substring(0, PROMPT_LIMIT)
}

/* ─────────────────────────── The hero, first ───────────────────────────
   When a parent brings a photo, or describes their hero, the character is
   painted on its own before any page is. That one approved picture is then
   the reference every page is painted around, which is what keeps the hero
   the same child on page one and page eight. */

/** Turn a photo into the book's hero, painted in the book's own medium. */
export function buildCharacterFromPhotoPrompt(styleValue: string, opts: { isAdult?: boolean; name?: string } = {}): string {
  const style = getStyle(styleValue)
  const who = opts.isAdult ? 'grown-up' : 'child'
  return [
    `Repaint the person in this photo as the hero of a children\u2019s picture book, as ${style.medium.split('.')[0].toLowerCase()}.`,
    `Keep them clearly recognisable: the same face shape, eyes, skin tone, hair colour and hairstyle, and their apparent age. They stay a ${who}; never make them older or younger.`,
    'Full body, standing, facing us in a relaxed friendly pose, the whole figure visible from head to toe with space around it.',
    'Plain soft single-colour background, no scenery, no props, no other people.',
    `Palette: ${style.palette}`,
    'Friendly, warm and expressive, the way a picture book hero looks.',
    HOUSE_CLEAN,
  ].join(' ').substring(0, PROMPT_LIMIT)
}

/** Paint a hero from words alone, when there is no photo. */
export function buildCharacterSheetPrompt(styleValue: string, description: string): string {
  const style = getStyle(styleValue)
  return [
    style.medium,
    'Character design for the hero of a children\u2019s picture book.',
    `The hero: ${description}.`,
    'Full body, standing, facing us in a relaxed friendly pose, the whole figure visible from head to toe with space around it.',
    'Plain soft single-colour background, no scenery, no props, no other characters.',
    `Palette: ${style.palette}`,
    `Avoid: ${style.avoid}.`,
    HOUSE_CHILD_SAFE,
    HOUSE_CLEAN,
  ].join(' ').substring(0, PROMPT_LIMIT)
}

/**
 * Paint a page around the approved hero. The reference image is the character
 * sheet; this prompt asks for a whole new picture with that character in it,
 * and says plainly not to copy the sheet's plain background or pose, which is
 * the mistake reference models make when nobody tells them.
 */
export function buildSceneWithHeroPrompt(parts: IllustrationParts & { heroName?: string; cover?: boolean; title?: string }): string {
  const style = getStyle(parts.style)
  const name = parts.heroName ? `${parts.heroName}, ` : ''
  return [
    `Paint a brand new, complete, full-page children\u2019s picture book illustration as ${style.medium.split('.')[0].toLowerCase()}.`,
    `The character in the reference image is the hero of the book (${name}the same character on every page): keep their face, hair, skin tone, body proportions and outfit exactly as in the reference.`,
    'Do not copy the reference picture: give the hero a new pose and expression that fits this moment, and paint the whole scene around them. No plain background.',
    parts.cover && parts.title ? coverTitleRule(parts.title) : '',
    parts.cover ? KQ_COVER_RULE : '',
    `The scene: ${parts.scene}`,
    parts.shot ? `Shot: ${parts.shot}.` : '',
    parts.characters ? `Other characters: ${parts.characters}` : '',
    `Palette: ${style.palette}`,
    parts.palette ? `Continue the book\u2019s own palette: ${parts.palette}.` : '',
    HOUSE_LIGHT,
    HOUSE_CHILD_SAFE,
    HOUSE_FULL_BLEED,
    `Avoid: ${style.avoid}.`,
    parts.cover && parts.title ? `Remember: the title "${parts.title}" is lettered into the painting, spelled exactly.` : HOUSE_CLEAN,
  ]
    .filter(Boolean)
    .join(' ')
    .substring(0, PROMPT_LIMIT)
}

/** A change a parent asked for, applied to a page that already exists. */
export function buildPageTouchUpPrompt(styleValue: string, instruction: string): string {
  const style = getStyle(styleValue)
  return [
    instruction.trim().replace(/\.?$/, '.'),
    `Keep everything else about the picture the same: the characters, their faces and outfits, the composition, and the medium (${style.medium.split('.')[0].toLowerCase()}).`,
    HOUSE_CHILD_SAFE,
  ].join(' ').substring(0, PROMPT_LIMIT)
}

/**
 * Injected into the story prompt so the colour palette the writer locks for the
 * book belongs to the chosen style instead of fighting it.
 */
export function buildStoryStyleBrief(styleValue: string): string {
  const style = getStyle(styleValue)
  return `
ART DIRECTION (the illustrator is already booked, and this is their brief):
- Every picture will be made as: ${style.medium}
- The colours available for this style are: ${style.palette}
- The "colorPalette" you lock must be 3 to 5 colours drawn from that description. Name them as paint colours, not as brand colours.
- One single warm light source in every scene, close and low, with the rest of the picture falling away.
- Cosy, gentle and age appropriate. Nothing frightening, and no weapons.
- Quiet and magical, never busy. A child should be able to point at the main thing straight away.
`
}

/** The app's own palette, kept for callers that want the house colours. */
export const KQ_PALETTE = ILLUSTRATION_STYLES[0].palette

/** The house brief without a style, for older callers. */
export const KQ_STORY_WORLD_BRIEF = buildStoryStyleBrief('gouache')
