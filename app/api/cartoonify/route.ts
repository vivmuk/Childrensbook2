// The old name for painting a hero from a photo. The work now lives in
// /api/create-character, which paints the hero in the book's own style; this
// route stays so anything still calling it keeps working.
export { POST } from '../create-character/route'

export const maxDuration = 120
