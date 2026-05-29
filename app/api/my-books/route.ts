import { NextRequest, NextResponse } from 'next/server'
import { getUserBookSummaries } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const LOCAL_USER_ID = 'local-user'

export async function GET(request: NextRequest) {
  try {
    // Summaries only (cover + metadata, no page images) — keeps the list payload small.
    const books = await getUserBookSummaries(LOCAL_USER_ID)
    return NextResponse.json({ books })
  } catch (error: any) {
    console.error('Error fetching user books:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch books' },
      { status: 500 }
    )
  }
}
