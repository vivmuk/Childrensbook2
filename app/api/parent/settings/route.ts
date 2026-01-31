import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'
import { getParentSettingsFromSQLite, setParentSettingsInSQLite } from '@/lib/sqlite-storage'

// GET: Get parent settings
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

    // Get settings
    const settings = await getParentSettingsFromSQLite(userId)

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error getting parent settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// POST: Update parent settings
export async function POST(request: NextRequest) {
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

    const settings = await request.json()

    // Save settings
    await setParentSettingsInSQLite(userId, settings)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving parent settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}
