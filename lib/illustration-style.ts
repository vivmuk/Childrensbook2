/**
 * The illustration system, in one place.
 *
 * Two different things live here, and keeping them apart is the whole point:
 *
 *  1. HOUSE RULES — what makes any KinderQuill picture recognisable as ours no
 *     matter which style a parent picked: one clear thing to look at, one warm
 *     light source, a child-safe scene, a consistent character, no lettering
 *     baked into the art, and a painting that fills the whole canvas.
 *
 *  2. STYLES — the medium: gouache, watercolour, collage, clay, comic, and so
 *     on. Each style carries its own palette guidance, because a classic
 *     cartoon should look like a classic cartoon and not like the app's own
 *     night colours.
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
      'Luminous skies in cerulean and pale gold, soft greens, warm lamplight at dusk, gentle ' +
      'pastel shadows rather than black.',
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
      'Indian comic book illustration of the classic era: bold black ink outlines, rich saturated ' +
      'colour blocked in flat, careful traditional detail in clothing and ornament, expressive ' +
      'faces, decorative backgrounds.',
    palette:
      'Marigold, vermilion, deep peacock blue, leaf green, earth ochre, with strong black line.',
    avoid: 'muted washed colour, sketchy or vague linework, western cartoon proportions',
  },
  {
    value: 'chacha-chaudhary',
    label: 'Retro Bold Comic',
    blurb: 'Simple lines, big laughs',
    medium:
      'Retro Indian comic book cartooning: very simple bold outlines, flat bright colour, no ' +
      'shading, exaggerated funny expressions, loose energetic shapes, small visual jokes in the ' +
      'background.',
    palette:
      'Bright flat primaries and secondaries: yellow, red, blue, green, with heavy black line.',
    avoid: 'realistic proportions, subtle colour, detailed rendering, shading',
  },
  {
    value: 'papercut',
    label: 'Torn Paper Collage',
    blurb: 'Torn paper, painted texture, bold shapes',
    medium:
      'Collage: shapes torn from hand-painted paper and glued down. Every edge is a torn, ragged, ' +
      'slightly fibrous paper edge, every layer casts a small soft shadow onto the layer beneath, ' +
      'and the painted texture of the paper shows inside each flat shape.',
    palette: 'Bold simple colour fields: sunflower, scarlet, deep blue, leaf green, cream paper.',
    avoid: 'smooth digital shapes, gradient fills, drawn outlines, photographic texture',
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

/** One painted example of each style, made by scripts/generate-style-plates.mjs. */
export function stylePlate(value: string): string {
  return `/styles/${getStyle(value).value}.webp`
}

/* ─────────────────────────────── House rules ───────────────────────────────
   True for every style. These are the lines that make a picture ours, and the
   lines that stop image models doing the things they like to do. */

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
 * Assemble one illustration prompt. Order matters to image models: the medium
 * and the character come first, the scene in the middle, the rules last.
 */
export function buildIllustrationPrompt(parts: IllustrationParts): string {
  const style = getStyle(parts.style)
  const { characters, palette, shot, scene } = parts

  return [
    characters ? `${characters}.` : '',
    'Hand made children\u2019s picture book illustration.',
    style.medium,
    `Palette: ${style.palette}`,
    palette ? `Continue the book\u2019s own palette: ${palette}.` : '',
    scene,
    shot ? `Shot: ${shot}.` : '',
    HOUSE_LIGHT,
    HOUSE_COMPOSITION,
    HOUSE_CHILD_SAFE,
    HOUSE_FULL_BLEED,
    `Avoid: ${style.avoid}.`,
    HOUSE_CLEAN,
  ]
    .filter(Boolean)
    .join(' ')
    .substring(0, 3200)
}

/** Composition rule for a cover, so the title can be set over it in real type. */
export const KQ_COVER_RULE =
  'Cover composition: one hero moment, the main character large and unmistakably the subject, ' +
  'placed low or to one side, leaving the upper third quiet and uncluttered so the title can be ' +
  'set over it afterwards.'

/** Assemble the cover prompt, which adds the title space rule and the style. */
export function buildCoverIllustrationPrompt(parts: IllustrationParts): string {
  const style = getStyle(parts.style)
  return [
    'Front cover illustration for a picture book. The title is set separately in real type, so ' +
      'leave the upper third as quiet, empty painted space.',
    KQ_COVER_RULE,
    style.medium,
    buildIllustrationPrompt(parts),
  ]
    .join(' ')
    .substring(0, 3200)
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
