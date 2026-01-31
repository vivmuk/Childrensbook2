import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'
import { toggleFavoriteInSQLite } from '@/lib/sqlite-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
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
    const bookId = params.bookId

    // Toggle favorite
    const isFavorite = await toggleFavoriteInSQLite(userId, bookId)

    return NextResponse.json({ isFavorite })
  } catch (error: any) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
