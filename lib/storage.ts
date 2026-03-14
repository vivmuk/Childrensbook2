import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getBookFromSQLite,
  setBookInSQLite,
  getUserBooksFromSQLite,
  deleteBookFromSQLite,
  toggleFavoriteInSQLite,
  getFavoritesFromSQLite,
  recordReadingInSQLite,
  getReadingStatsFromSQLite,
  getParentSettingsFromSQLite,
  setParentSettingsInSQLite,
} from './sqlite-storage'

interface BookPage {
  pageNumber: number
  text: string
  image: string
}

interface TitlePage {
  image: string
  title: string
}

interface Character {
  name: string
  type: string
  traits: string[]
}

interface Book {
  id: string
  title: string
  titlePage?: TitlePage
  pages: BookPage[]
  ageRange: string
  illustrationStyle: string
  status: 'generating' | 'completed' | 'error'
  audioUrl?: string
  createdAt: string
  expectedPages?: number
  generationProgress?: number
  description?: string
  category?: string
  heroType?: 'animal' | 'person' | 'fantasy'
  setting?: string
  isSample?: boolean
  ownerId?: string
  narratorVoice?: string
  character?: Character
  prompts?: {
    story: string
    images: Array<{ pageNumber: number | 'cover'; prompt: string }>
  }
}

const sampleBooks: Map<string, Book> = new Map()

function loadSampleBooks() {
  try {
    const sampleBooksPath = join(process.cwd(), 'data', 'sample-books', 'index.json')
    if (existsSync(sampleBooksPath)) {
      const sampleBooksData = readFileSync(sampleBooksPath, 'utf-8')
      const loadedBooks: Book[] = JSON.parse(sampleBooksData)

      loadedBooks.forEach(book => {
        book.isSample = true
        sampleBooks.set(book.id, book)
      })

      console.log(`Loaded ${loadedBooks.length} sample books`)
    }
  } catch (error) {
    console.warn('Could not load sample books:', error)
  }
}

let sampleBooksLoaded = false

export function ensureSampleBooksLoaded() {
  if (typeof window === 'undefined' && !sampleBooksLoaded) {
    try {
      loadSampleBooks()
      sampleBooksLoaded = true
    } catch (error) {
      console.error('Failed to load sample books:', error)
    }
  }
}

// In-memory fallback when SQLite is unavailable
const inMemoryBooks: Map<string, Book> = new Map()

export async function getBook(bookId: string): Promise<Book | undefined> {
  ensureSampleBooksLoaded()

  if (sampleBooks.has(bookId)) return sampleBooks.get(bookId)
  if (inMemoryBooks.has(bookId)) return inMemoryBooks.get(bookId)

  try {
    const sqliteBook = await getBookFromSQLite(bookId)
    if (sqliteBook) return sqliteBook
  } catch (error) {
    console.log('SQLite not available, checking in-memory...')
  }

  return undefined
}

export async function setBook(bookId: string, book: Book): Promise<void> {
  if (book.isSample) {
    sampleBooks.set(bookId, book)
    return
  }

  try {
    await setBookInSQLite(book)
    console.log(`Stored book ${bookId} in SQLite`)
    return
  } catch (error) {
    console.log('SQLite storage failed, using in-memory fallback')
    inMemoryBooks.set(bookId, book)
    console.log(`Stored book ${bookId} in memory`)
  }
}

export async function hasBook(bookId: string): Promise<boolean> {
  if (sampleBooks.has(bookId)) return true
  if (inMemoryBooks.has(bookId)) return true

  try {
    const book = await getBookFromSQLite(bookId)
    return !!book
  } catch {
    return false
  }
}

export function getAllSampleBooks(): Book[] {
  ensureSampleBooksLoaded()
  return Array.from(sampleBooks.values())
}

export async function getUserBooks(userId: string): Promise<Book[]> {
  try {
    const sqliteBooks = await getUserBooksFromSQLite(userId)
    if (sqliteBooks.length > 0) return sqliteBooks
  } catch (error) {
    console.log('SQLite query failed, returning in-memory books')
  }
  return Array.from(inMemoryBooks.values()).filter(book => book.ownerId === userId)
}

export async function toggleFavorite(userId: string, bookId: string): Promise<boolean> {
  try {
    return await toggleFavoriteInSQLite(userId, bookId)
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return false
  }
}

export async function getFavorites(userId: string): Promise<string[]> {
  try {
    return await getFavoritesFromSQLite(userId)
  } catch (error) {
    console.error('Error getting favorites:', error)
    return []
  }
}

export async function recordReading(userId: string, bookId: string, durationSeconds: number = 0, completed: boolean = true): Promise<void> {
  try {
    await recordReadingInSQLite(userId, bookId, durationSeconds, completed)
  } catch (error) {
    console.error('Error recording reading:', error)
  }
}

export async function getReadingStats(userId: string) {
  try {
    return await getReadingStatsFromSQLite(userId)
  } catch (error) {
    console.error('Error getting reading stats:', error)
    return {
      totalBooksRead: 0,
      totalReadingTime: 0,
      favoriteBooks: [],
      recentBooks: [],
    }
  }
}

export async function getParentSettings(userId: string) {
  try {
    return await getParentSettingsFromSQLite(userId)
  } catch (error) {
    console.error('Error getting parent settings:', error)
    return undefined
  }
}

export async function setParentSettings(userId: string, settings: {
  contentFilterEnabled?: boolean
  maxBooksPerDay?: number
  allowSharing?: boolean
  requireApproval?: boolean
}) {
  try {
    await setParentSettingsInSQLite(userId, settings)
  } catch (error) {
    console.error('Error setting parent settings:', error)
  }
}

export { sampleBooks as books }
export type { Book, BookPage, TitlePage }
