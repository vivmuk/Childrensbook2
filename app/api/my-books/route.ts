import { NextRequest, NextResponse } from 'next/server'
import { getUserBooks } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const LOCAL_USER_ID = 'local-user'

export async function GET(request: NextRequest) {
  try {
    const books = await getUserBooks(LOCAL_USER_ID)
    return NextResponse.json({ books })
  } catch (error: any) {
    console.error('Error fetching user books:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch books' },
      { status: 500 }
    )
  }
}
