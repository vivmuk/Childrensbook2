import { NextRequest, NextResponse } from 'next/server'
import { getTempImage } from '@/lib/temp-images'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const image = getTempImage(params.id)
  if (!image) {
    return NextResponse.json({ error: 'Image not found or expired' }, { status: 404 })
  }
  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
