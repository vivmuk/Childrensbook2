import { NextRequest, NextResponse } from 'next/server'
import { listModels, resolveApiKey, resolveDefaultImageModel } from '@/lib/venice'

/**
 * The image models Venice offers today, for the advanced picker, and which
 * one Automatic would use. Read live so a new model (Muse, say) shows up the
 * day Venice ships it, with no change here.
 */
export async function POST(request: NextRequest) {
  const { userApiKey } = await request.json().catch(() => ({}))
  const apiKey = resolveApiKey(userApiKey)
  const models = await listModels('image', apiKey)
  const automatic = apiKey ? await resolveDefaultImageModel(apiKey) : 'grok-imagine-image'
  return NextResponse.json({
    automatic,
    models: models
      .filter(m => !/upscale|inpaint|edit/i.test(m.id))
      .map(m => ({ id: m.id, name: m.name, traits: m.traits }))
      .slice(0, 40),
  })
}
