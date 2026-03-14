import { NextRequest, NextResponse } from 'next/server'
import { getParentSettingsFromSQLite, setParentSettingsInSQLite } from '@/lib/sqlite-storage'

const LOCAL_USER_ID = 'local-user'

export async function GET(request: NextRequest) {
  try {
    const settings = await getParentSettingsFromSQLite(LOCAL_USER_ID)
    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Error getting parent settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    await setParentSettingsInSQLite(LOCAL_USER_ID, settings)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving parent settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}
