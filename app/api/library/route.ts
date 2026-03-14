import { NextRequest, NextResponse } from 'next/server'
import { getUserBooksFromSQLite, getFavoritesFromSQLite } from '@/lib/sqlite-storage'

const LOCAL_USER_ID = 'local-user'

export async function GET(request: NextRequest) {
  try {
    const books = await getUserBooksFromSQLite(LOCAL_USER_ID)
    const favorites = await getFavoritesFromSQLite(LOCAL_USER_ID)
    return NextResponse.json({ books, favorites })
  } catch (error: any) {
    console.error('Error fetching library:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library' },
      { status: 500 }
    )
  }
}
