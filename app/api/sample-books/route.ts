import { NextResponse } from 'next/server'
import { getAllSampleBooks } from '@/lib/storage'

export async function GET() {
  try {
    const books = getAllSampleBooks()
    
    return NextResponse.json({ books })
  } catch (error: any) {
    console.error('Error fetching sample books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sample books' },
      { status: 500 }
    )
  }
}
