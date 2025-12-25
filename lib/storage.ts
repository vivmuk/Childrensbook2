import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminDb } from './firebase-admin'

interface BookPage {
  pageNumber: number
  text: string
  image: string
}

interface TitlePage {
  image: string
  title: string
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
  description?: string
  category?: string
  heroType?: 'animal' | 'person' | 'fantasy'
  setting?: string
  isSample?: boolean
  ownerId?: string // New field for user ownership
  prompts?: {
    story: string
    images: Array<{ pageNumber: number | 'cover'; prompt: string }>
  }
}

const sampleBooks: Map<string, Book> = new Map()

// Load sample books on initialization
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

// Initialize sample books (server-side only)
let sampleBooksLoaded = false

// Ensure sample books are loaded (call this from API routes)
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

export async function getBook(bookId: string): Promise<Book | undefined> {
  // Ensure sample books are loaded when getting a book
  ensureSampleBooksLoaded()

  // Check sample books first (fast, in-memory)
  if (sampleBooks.has(bookId)) {
    return sampleBooks.get(bookId)
  }

  // Check Firestore
  try {
    const db = getAdminDb()
    const doc = await db.collection('books').doc(bookId).get()

    if (doc.exists) {
      return doc.data() as Book
    }
  } catch (error) {
    console.error(`Error fetching book ${bookId} from Firestore:`, error)
  }

  return undefined
}

export async function setBook(bookId: string, book: Book): Promise<void> {
  // If it's a sample book, update in memory (shouldn't really happen for creating new books)
  if (book.isSample) {
    sampleBooks.set(bookId, book)
    return
  }

  try {
    const db = getAdminDb()
    // Convert to plain object if needed, but Firestore handles JSON-like objects
    // Careful with undefined values, Firestore ignores them but it's good practice to clean
    const bookData = JSON.parse(JSON.stringify(book))
    await db.collection('books').doc(bookId).set(bookData, { merge: true })
  } catch (error) {
    console.error(`Error saving book ${bookId} to Firestore:`, error)
    throw error
  }
}

export async function hasBook(bookId: string): Promise<boolean> {
  if (sampleBooks.has(bookId)) return true

  try {
    const db = getAdminDb()
    const doc = await db.collection('books').doc(bookId).get()
    return doc.exists
  } catch (error) {
    return false
  }
}

export function getAllSampleBooks(): Book[] {
  // Ensure sample books are loaded before returning
  ensureSampleBooksLoaded()
  return Array.from(sampleBooks.values())
}

// New: Get books for a specific user
export async function getUserBooks(userId: string): Promise<Book[]> {
  try {
    const db = getAdminDb()
    const snapshot = await db.collection('books')
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => doc.data() as Book)
  } catch (error) {
    console.error(`Error fetching books for user ${userId}:`, error)
    return []
  }
}

export { sampleBooks as books }
export type { Book, BookPage, TitlePage }
