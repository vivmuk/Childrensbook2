/* Shared by the server (lib/venice.ts) and the pickers in the browser. */

/**
 * The narrators a parent can pick. Each one names the Venice model that owns
 * the voice, because voices are not portable between models. The old names
 * (default, nova, alloy, echo, fable, onyx, shimmer) are kept as aliases so a
 * book made before this list still has a voice.
 */
export interface Narrator {
  value: string
  label: string
  description: string
  model: string
  voice: string
}

export const NARRATORS: Narrator[] = [
  { value: 'heart',     label: 'Heart',     description: 'Warm and gentle',          model: 'tts-kokoro', voice: 'af_heart' },
  { value: 'emma',      label: 'Emma',      description: 'Soft British storyteller', model: 'tts-kokoro', voice: 'bf_emma' },
  { value: 'fable',     label: 'Fable',     description: 'Grandad by the fire',      model: 'tts-kokoro', voice: 'bm_fable' },
  { value: 'bella',     label: 'Bella',     description: 'Bright and playful',       model: 'tts-kokoro', voice: 'af_bella' },
  { value: 'echo',      label: 'Echo',      description: 'Calm and steady',          model: 'tts-kokoro', voice: 'am_echo' },
  { value: 'wise',      label: 'Wise',      description: 'Grandma at bedtime',       model: 'tts-minimax-speech-02-hd', voice: 'WiseWoman' },
  { value: 'sweet',     label: 'Sweet',     description: 'Lively young voice',       model: 'tts-minimax-speech-02-hd', voice: 'SweetGirl' },
  { value: 'charlotte', label: 'Charlotte', description: 'Expressive and theatrical', model: 'tts-elevenlabs-turbo-v2-5', voice: 'Charlotte' },
]

const NARRATOR_ALIASES: Record<string, string> = {
  default: 'heart', nova: 'heart', alloy: 'echo', onyx: 'echo', shimmer: 'bella',
}

export function getNarrator(value: string | undefined): Narrator {
  const key = NARRATOR_ALIASES[value || ''] || value || 'heart'
  return NARRATORS.find((n) => n.value === key) || NARRATORS[0]
}
