import { getDatabase, isSQLiteAvailable } from './sqlite'
import type { Book, BookPage, TitlePage } from './storage'

// In-memory fallback storage when SQLite isn't available
const memoryStorage = {
  books: new Map<string, any>(),
  pages: new Map<string, any[]>(),
  userLibrary: new Map<string, Map<string, any>>(),
  parentSettings: new Map<string, any>(),
  readingStats: [] as any[],
}

export interface SQLiteBook {
  id: string
  title: string
  title_page_image?: string
  age_range: string
  illustration_style: string
  status: 'generating' | 'completed' | 'error'
  audio_url?: string
  created_at: string
  expected_pages: number
  generation_progress: number
  narrator_voice: string
  character_name?: string
  character_type?: string
  character_traits?: string
  owner_id?: string
  is_favorite: number
  read_count: number
  last_read_at?: string
}

function dbBookToBook(dbBook: SQLiteBook): Book {
  const book: Book = {
    id: dbBook.id,
    title: dbBook.title,
    pages: [],
    ageRange: dbBook.age_range,
    illustrationStyle: dbBook.illustration_style,
    status: dbBook.status,
    createdAt: dbBook.created_at,
    expectedPages: dbBook.expected_pages,
    generationProgress: dbBook.generation_progress,
    narratorVoice: dbBook.narrator_voice,
    ownerId: dbBook.owner_id,
  }

  if (dbBook.title_page_image) {
    book.titlePage = {
      image: dbBook.title_page_image,
      title: dbBook.title,
    }
  }

  if (dbBook.audio_url) {
    book.audioUrl = dbBook.audio_url
  }

  if (dbBook.character_name) {
    book.character = {
      name: dbBook.character_name,
      type: dbBook.character_type || 'animal',
      traits: dbBook.character_traits ? JSON.parse(dbBook.character_traits) : [],
    }
  }

  return book
}

export async function getBookFromSQLite(bookId: string): Promise<Book | undefined> {
  if (!isSQLiteAvailable()) {
    // Use in-memory fallback
    const memBook = memoryStorage.books.get(bookId)
    if (!memBook) return undefined
    
    const book = dbBookToBook(memBook)
    book.pages = memoryStorage.pages.get(bookId) || []
    return book
  }
  
  const db = getDatabase()
  if (!db) return undefined
  
  const bookRow = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as SQLiteBook | undefined
  
  if (!bookRow) return undefined

  const book = dbBookToBook(bookRow)
  
  // Get pages
  const pages = db.prepare('SELECT * FROM book_pages WHERE book_id = ? ORDER BY page_number').all(bookId) as any[]
  book.pages = pages.map(p => ({
    pageNumber: p.page_number,
    text: p.text,
    image: p.image,
  }))

  return book
}

export async function setBookInSQLite(book: Book): Promise<void> {
  if (!isSQLiteAvailable()) {
    // Use in-memory fallback
    memoryStorage.books.set(book.id, {
      id: book.id,
      title: book.title,
      title_page_image: book.titlePage?.image || null,
      age_range: book.ageRange,
      illustration_style: book.illustrationStyle,
      status: book.status,
      audio_url: book.audioUrl || null,
      created_at: book.createdAt,
      expected_pages: book.expectedPages || 8,
      generation_progress: book.generationProgress || 0,
      narrator_voice: book.narratorVoice || 'default',
      character_name: book.character?.name || null,
      character_type: book.character?.type || null,
      character_traits: book.character?.traits ? JSON.stringify(book.character.traits) : null,
      owner_id: book.ownerId || null,
    })
    
    if (book.pages && book.pages.length > 0) {
      memoryStorage.pages.set(book.id, book.pages)
    }
    return
  }

  const db = getDatabase()
  if (!db) return

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO books (
      id, title, title_page_image, age_range, illustration_style, status,
      audio_url, created_at, expected_pages, generation_progress, narrator_voice,
      character_name, character_type, character_traits, owner_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    book.id,
    book.title,
    book.titlePage?.image || null,
    book.ageRange,
    book.illustrationStyle,
    book.status,
    book.audioUrl || null,
    book.createdAt,
    book.expectedPages || 8,
    book.generationProgress || 0,
    book.narratorVoice || 'default',
    book.character?.name || null,
    book.character?.type || null,
    book.character?.traits ? JSON.stringify(book.character.traits) : null,
    book.ownerId || null
  )

  // Save pages if they exist
  if (book.pages && book.pages.length > 0) {
    const pageStmt = db.prepare(`
      INSERT OR REPLACE INTO book_pages (book_id, page_number, text, image)
      VALUES (?, ?, ?, ?)
    `)

    const deletePages = db.prepare('DELETE FROM book_pages WHERE book_id = ?')
    deletePages.run(book.id)

    for (const page of book.pages) {
      pageStmt.run(book.id, page.pageNumber, page.text, page.image)
    }
  }
}

export async function getUserBooksFromSQLite(userId: string): Promise<Book[]> {
  if (!isSQLiteAvailable()) {
    // Use in-memory fallback
    const books: Book[] = []
    for (const [id, memBook] of memoryStorage.books.entries()) {
      if (memBook.owner_id === userId) {
        const book = await getBookFromSQLite(id)
        if (book) books.push(book)
      }
    }
    return books.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  
  const db = getDatabase()
  if (!db) return []
  
  const books = db.prepare('SELECT * FROM books WHERE owner_id = ? ORDER BY created_at DESC').all(userId) as SQLiteBook[]
  
  const result: Book[] = []
  for (const bookRow of books) {
    const book = await getBookFromSQLite(bookRow.id)
    if (book) result.push(book)
  }
  
  return result
}

export async function deleteBookFromSQLite(bookId: string): Promise<void> {
  if (!isSQLiteAvailable()) {
    memoryStorage.books.delete(bookId)
    memoryStorage.pages.delete(bookId)
    return
  }
  
  const db = getDatabase()
  if (!db) return
  db.prepare('DELETE FROM books WHERE id = ?').run(bookId)
}

export async function toggleFavoriteInSQLite(userId: string, bookId: string): Promise<boolean> {
  if (!isSQLiteAvailable()) {
    const userLib = memoryStorage.userLibrary.get(userId) || new Map()
    const existing = userLib.get(bookId)
    const newValue = existing?.is_favorite ? 0 : 1
    userLib.set(bookId, { ...existing, is_favorite: newValue, book_id: bookId })
    memoryStorage.userLibrary.set(userId, userLib)
    return newValue === 1
  }
  
  const db = getDatabase()
  if (!db) return false
  
  const existing = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND book_id = ?').get(userId, bookId) as any
  
  if (existing) {
    const newValue = existing.is_favorite ? 0 : 1
    db.prepare('UPDATE user_library SET is_favorite = ? WHERE user_id = ? AND book_id = ?').run(newValue, userId, bookId)
    return newValue === 1
  } else {
    db.prepare('INSERT INTO user_library (user_id, book_id, is_favorite) VALUES (?, ?, 1)').run(userId, bookId)
    return true
  }
}

export async function getFavoritesFromSQLite(userId: string): Promise<string[]> {
  if (!isSQLiteAvailable()) {
    const userLib = memoryStorage.userLibrary.get(userId)
    if (!userLib) return []
    return Array.from(userLib.entries())
      .filter(([_, data]) => data.is_favorite === 1)
      .map(([bookId, _]) => bookId)
  }
  
  const db = getDatabase()
  if (!db) return []
  
  const rows = db.prepare('SELECT book_id FROM user_library WHERE user_id = ? AND is_favorite = 1').all(userId) as any[]
  return rows.map(r => r.book_id)
}

export async function recordReadingInSQLite(userId: string, bookId: string, durationSeconds: number, completed: boolean): Promise<void> {
  if (!isSQLiteAvailable()) {
    // Update book read count
    const book = memoryStorage.books.get(bookId)
    if (book) {
      book.read_count = (book.read_count || 0) + 1
      book.last_read_at = new Date().toISOString()
    }
    
    // Record in user library
    const userLib = memoryStorage.userLibrary.get(userId) || new Map()
    const existing = userLib.get(bookId) || { book_id: bookId }
    existing.read_count = (existing.read_count || 0) + 1
    existing.last_read_at = new Date().toISOString()
    userLib.set(bookId, existing)
    memoryStorage.userLibrary.set(userId, userLib)
    
    // Record stats
    memoryStorage.readingStats.push({
      user_id: userId,
      book_id: bookId,
      read_duration_seconds: durationSeconds,
      completed: completed ? 1 : 0,
      read_at: new Date().toISOString(),
    })
    return
  }
  
  const db = getDatabase()
  if (!db) return
  
  // Update book read count
  db.prepare(`
    UPDATE books 
    SET read_count = read_count + 1, last_read_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(bookId)

  // Record in user library
  const existing = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND book_id = ?').get(userId, bookId) as any
  
  if (existing) {
    db.prepare(`
      UPDATE user_library 
      SET read_count = read_count + 1, last_read_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND book_id = ?
    `).run(userId, bookId)
  } else {
    db.prepare(`
      INSERT INTO user_library (user_id, book_id, read_count, last_read_at) 
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    `).run(userId, bookId)
  }

  // Record detailed stats
  db.prepare(`
    INSERT INTO reading_stats (user_id, book_id, read_duration_seconds, completed)
    VALUES (?, ?, ?, ?)
  `).run(userId, bookId, durationSeconds, completed ? 1 : 0)
}

export async function getReadingStatsFromSQLite(userId: string): Promise<{
  totalBooksRead: number
  totalReadingTime: number
  favoriteBooks: string[]
  recentBooks: Book[]
}> {
  if (!isSQLiteAvailable()) {
    // Calculate from memory
    const userStats = memoryStorage.readingStats.filter(s => s.user_id === userId)
    const totalBooks = new Set(userStats.map(s => s.book_id)).size
    const totalTime = userStats.reduce((sum, s) => sum + (s.read_duration_seconds || 0), 0)
    const favorites = await getFavoritesFromSQLite(userId)
    
    // Get recent books
    const recent: Book[] = []
    const userLib = memoryStorage.userLibrary.get(userId)
    if (userLib) {
      const sorted = Array.from(userLib.entries())
        .filter(([_, data]) => data.last_read_at)
        .sort((a, b) => new Date(b[1].last_read_at).getTime() - new Date(a[1].last_read_at).getTime())
        .slice(0, 5)
      
      for (const [bookId, _] of sorted) {
        const book = await getBookFromSQLite(bookId)
        if (book) recent.push(book)
      }
    }
    
    return {
      totalBooksRead: totalBooks,
      totalReadingTime: totalTime,
      favoriteBooks: favorites,
      recentBooks: recent,
    }
  }
  
  const db = getDatabase()
  if (!db) {
    return { totalBooksRead: 0, totalReadingTime: 0, favoriteBooks: [], recentBooks: [] }
  }
  
  // Get reading stats
  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT book_id) as total_books,
      SUM(read_duration_seconds) as total_time
    FROM reading_stats 
    WHERE user_id = ?
  `).get(userId) as any

  // Get favorites
  const favorites = await getFavoritesFromSQLite(userId)

  // Get recent books
  const recent = db.prepare(`
    SELECT b.* FROM books b
    JOIN user_library ul ON b.id = ul.book_id
    WHERE ul.user_id = ?
    ORDER BY ul.last_read_at DESC
    LIMIT 5
  `).all(userId) as SQLiteBook[]

  const recentBooks: Book[] = []
  for (const bookRow of recent) {
    const book = await getBookFromSQLite(bookRow.id)
    if (book) recentBooks.push(book)
  }

  return {
    totalBooksRead: stats?.total_books || 0,
    totalReadingTime: stats?.total_time || 0,
    favoriteBooks: favorites,
    recentBooks,
  }
}

export async function getParentSettingsFromSQLite(userId: string): Promise<{
  contentFilterEnabled: boolean
  maxBooksPerDay: number
  allowSharing: boolean
  requireApproval: boolean
} | undefined> {
  if (!isSQLiteAvailable()) {
    return memoryStorage.parentSettings.get(userId)
  }
  
  const db = getDatabase()
  if (!db) return undefined
  
  const settings = db.prepare('SELECT * FROM parent_settings WHERE user_id = ?').get(userId) as any
  
  if (!settings) return undefined

  return {
    contentFilterEnabled: settings.content_filter_enabled === 1,
    maxBooksPerDay: settings.max_books_per_day,
    allowSharing: settings.allow_sharing === 1,
    requireApproval: settings.require_approval === 1,
  }
}

export async function setParentSettingsInSQLite(
  userId: string, 
  settings: {
    contentFilterEnabled?: boolean
    maxBooksPerDay?: number
    allowSharing?: boolean
    requireApproval?: boolean
  }
): Promise<void> {
  if (!isSQLiteAvailable()) {
    const existing = memoryStorage.parentSettings.get(userId) || {
      contentFilterEnabled: true,
      maxBooksPerDay: 10,
      allowSharing: true,
      requireApproval: false,
    }
    memoryStorage.parentSettings.set(userId, { ...existing, ...settings })
    return
  }
  
  const db = getDatabase()
  if (!db) return
  
  const existing = db.prepare('SELECT * FROM parent_settings WHERE user_id = ?').get(userId) as any
  
  if (existing) {
    db.prepare(`
      UPDATE parent_settings SET
        content_filter_enabled = COALESCE(?, content_filter_enabled),
        max_books_per_day = COALESCE(?, max_books_per_day),
        allow_sharing = COALESCE(?, allow_sharing),
        require_approval = COALESCE(?, require_approval),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      settings.contentFilterEnabled !== undefined ? (settings.contentFilterEnabled ? 1 : 0) : null,
      settings.maxBooksPerDay || null,
      settings.allowSharing !== undefined ? (settings.allowSharing ? 1 : 0) : null,
      settings.requireApproval !== undefined ? (settings.requireApproval ? 1 : 0) : null,
      userId
    )
  } else {
    db.prepare(`
      INSERT INTO parent_settings (user_id, content_filter_enabled, max_books_per_day, allow_sharing, require_approval)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      settings.contentFilterEnabled !== undefined ? (settings.contentFilterEnabled ? 1 : 0) : 1,
      settings.maxBooksPerDay || 10,
      settings.allowSharing !== undefined ? (settings.allowSharing ? 1 : 0) : 1,
      settings.requireApproval !== undefined ? (settings.requireApproval ? 1 : 0) : 0
    )
  }
}
