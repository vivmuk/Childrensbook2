import { NextRequest, NextResponse } from 'next/server'
import { toggleFavoriteInSQLite } from '@/lib/sqlite-storage'

const LOCAL_USER_ID = 'local-user'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const bookId = params.bookId
    const isFavorite = await toggleFavoriteInSQLite(LOCAL_USER_ID, bookId)
    return NextResponse.json({ isFavorite })
  } catch (error: any) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
