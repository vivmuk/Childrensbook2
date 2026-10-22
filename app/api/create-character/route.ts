import { NextRequest, NextResponse } from 'next/server'
import { createHero } from '@/lib/hero'
import { getStyle } from '@/lib/illustration-style'
import { resolveApiKey } from '@/lib/venice'

// Painting a hero sheet can take most of a minute on a busy day.
export const maxDuration = 120

/**
 * Step one of a book with a hero in it: paint the hero on their own, in the
 * book's style, so the parent can approve them before any page is painted.
 * Takes a photo, or a description, or both.
 */
export async function POST(request: NextRequest) {
  try {
    const { photo, image, description, name, isAdult, style, tweak, userApiKey } = await request.json()
    const apiKey = resolveApiKey(userApiKey)
    if (!apiKey) {
      return NextResponse.json({ error: 'Add your Venice API key to paint a hero.' }, { status: 400 })
    }
    const picture = photo || image
    if (!picture && !description) {
      return NextResponse.json({ error: 'Add a photo or a few words about the hero.' }, { status: 400 })
    }

    const result = await createHero(
      {
        photo: picture || undefined,
        description: description ? String(description).slice(0, 500) : undefined,
        name: name ? String(name).slice(0, 40) : undefined,
        isAdult: typeof isAdult === 'boolean' ? isAdult : undefined,
        style: getStyle(style).value,
        tweak: tweak ? String(tweak).slice(0, 200) : undefined,
      },
      apiKey,
    )

    // `cartoonImage` is the name older clients read.
    return NextResponse.json({ characterImage: result.characterImage, cartoonImage: result.characterImage, hero: result.hero })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'We could not paint the hero. Please try again.' }, { status: 502 })
  }
}
