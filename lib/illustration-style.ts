/**
 * The painted world, in one place.
 *
 * Every illustration KinderQuill asks Venice for is assembled here, so a book
 * made a year from now still looks like it belongs beside the books made today.
 * The app's own screens use the same palette (see DESIGN.md), which is why a
 * finished book sits inside the interface without clashing.
 *
 * The look: hand painted gouache, dusk, deep indigo and plum, one warm amber
 * light doing all the work, moon white highlights, plenty of quiet space.
 */

/** The medium. Describes the hand, not the subject. */
export const KQ_MEDIUM =
  'Hand painted children\u2019s picture book illustration. Thick opaque gouache on textured paper. ' +
  'Flat opaque planes of colour laid in side by side with hard edges where shapes meet, visible ' +
  'brush strokes, uneven painted edges, dry-brush scumbling in the shadows, paper tooth showing ' +
  'through. No airbrush, no soft gradient blending, no digital smoothing, no vector edges, no 3D ' +
  'render. The work of a human illustrator with a favourite brush.'

/** The palette. Fixed, so every book shares the app's world. */
export const KQ_PALETTE =
  'Locked palette: deep indigo (#1B1D3A) and deep plum (#3A2340) for everything in shade, ' +
  'warm lamp cream (#F6E7C9) for lit surfaces and paper, soft moon white (#F4F2EC) for the ' +
  'brightest highlights and the moon, and one warm amber (#E0A046) for the single source of ' +
  'warm light in the scene. No neon, no pure black, no saturated primary colours.'

/** The light. One source, always warm, always from the lamp side. */
export const KQ_LIGHT =
  'Lighting rule: exactly one warm amber light source in the picture, low and close, throwing a ' +
  'soft pool of light and long gentle shadows. The rest of the scene falls away into indigo and ' +
  'plum dusk. Never two competing light sources, never flat even lighting.'

/** The craft. Composition, calm and legibility at small size. */
export const KQ_QUALITY =
  'Publication quality children\u2019s book art. Clear single focal point, generous calm space, ' +
  'strong silhouette, readable at thumbnail size, gentle depth so the eye can rest. ' +
  'Cosy and magical rather than busy or spectacular. The painting fills the whole canvas edge ' +
  'to edge: no paper margin, no white border, no frame and no vignette down the sides.'

/** What must never appear. */
export const KQ_NEGATIVE_EXTRA =
  'text, letters, words, numbers, lettering, signage, shop signs, street signs, billboards, ' +
  'posters, destination boards, gibberish writing, watermark, signature, artist name, logo, ' +
  'border, frame, neon, glow, lens flare, pure black, 3D render, photograph, manga, anime screenshot'

/** Composition rule for a cover, so a title can be set over it. */
export const KQ_COVER_RULE =
  'Cover composition: a single hero moment, the main character large and unmistakably the ' +
  'subject, placed low or to one side, leaving the upper third quiet and uncluttered so a ' +
  'title can be set over it.'

export interface IllustrationParts {
  /** The character lock from the story's visual bible. */
  characters?: string
  /** The colour palette the story locked, if any. */
  palette?: string
  /** The user's chosen art style, e.g. "soft watercolour". */
  style?: string
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
  const { characters, palette, style, shot, scene } = parts

  return [
    characters ? `${characters}.` : '',
    KQ_MEDIUM,
    style ? `Drawn in a ${style} idiom, while keeping the painted gouache handling above.` : '',
    scene,
    shot ? `Shot: ${shot}.` : '',
    KQ_PALETTE,
    palette ? `Continue the book\u2019s own palette: ${palette}.` : '',
    KQ_LIGHT,
    KQ_QUALITY,
    'No text, no letters, no words, no numbers, no watermark and no signature anywhere in the picture.',
  ]
    .filter(Boolean)
    .join(' ')
    .substring(0, 2800)
}

/** Assemble the cover prompt, which adds the title space rule. */
export function buildCoverIllustrationPrompt(parts: IllustrationParts & { title: string }): string {
  const base = buildIllustrationPrompt(parts)
  return [
    'Front cover illustration for a picture book. The title will be set separately in real type, ' +
      'so leave the upper third as quiet, empty painted sky.',
    KQ_COVER_RULE,
    base,
  ]
    .join(' ')
    .substring(0, 2800)
}

/**
 * Injected into the story prompt so the colour palette the writer locks for the
 * book belongs to this world instead of inventing a clashing one.
 */
export const KQ_STORY_WORLD_BRIEF = `
ART DIRECTION (the illustrator has already been booked, and this is their world):
- Every picture is hand painted gouache at dusk: deep indigo, deep plum, warm lamp cream, moon white, and one warm amber light.
- The "colorPalette" you lock must be 3 to 5 colours drawn from that family. Name them as paint colours, not as brand colours.
- Exactly one warm light source in every scene, close and low, with the rest of the picture falling into dusk.
- Quiet and magical, never busy. A child should be able to point at the main thing straight away.
`
