import { NextRequest, NextResponse } from 'next/server'
import { getUserBooks } from '@/lib/storage'
import { getAuth } from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split('Bearer ')[1]
        const app = getAdminApp()
        const decodedToken = await getAuth(app).verifyIdToken(token)
        const userId = decodedToken.uid

        const books = await getUserBooks(userId)

        return NextResponse.json({ books })
    } catch (error: any) {
        console.error('Error fetching user books:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch books' },
            { status: 500 }
        )
    }
}
