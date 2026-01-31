import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'
import { getUserBooksFromSQLite, getFavoritesFromSQLite, toggleFavoriteInSQLite, getReadingStatsFromSQLite } from '@/lib/sqlite-storage'

export async function GET(request: NextRequest) {
  try {
    // Check Auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const app = getAdminApp()
    if (!app) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
    }

    const decodedToken = await getAuth(app).verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's books from SQLite
    const books = await getUserBooksFromSQLite(userId)
    const favorites = await getFavoritesFromSQLite(userId)

    return NextResponse.json({ books, favorites })
  } catch (error: any) {
    console.error('Error fetching library:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library' },
      { status: 500 }
    )
  }
}
