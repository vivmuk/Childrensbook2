import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'
import { recordReadingInSQLite, getReadingStatsFromSQLite } from '@/lib/sqlite-storage'

// POST: Record a reading session
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

    const { durationSeconds = 0, completed = true } = await request.json()

    // Record reading
    await recordReadingInSQLite(userId, bookId, durationSeconds, completed)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error recording reading:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record reading' },
      { status: 500 }
    )
  }
}

// GET: Get reading stats for a user
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

    // Get stats
    const stats = await getReadingStatsFromSQLite(userId)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error getting reading stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get reading stats' },
      { status: 500 }
    )
  }
}
