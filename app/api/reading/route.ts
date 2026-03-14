import { NextRequest, NextResponse } from 'next/server'
import { recordReadingInSQLite, getReadingStatsFromSQLite } from '@/lib/sqlite-storage'

const LOCAL_USER_ID = 'local-user'

export async function POST(request: NextRequest) {
  try {
    const { bookId, durationSeconds = 0, completed = true } = await request.json()

    await recordReadingInSQLite(LOCAL_USER_ID, bookId, durationSeconds, completed)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error recording reading:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record reading' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getReadingStatsFromSQLite(LOCAL_USER_ID)
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Error getting reading stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get reading stats' },
      { status: 500 }
    )
  }
}
