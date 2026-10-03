import { isDatabaseConfigured, query, withTransaction } from './db'
import type { Book, BookPage, TitlePage } from './storage'

// In-memory fallback storage when Postgres isn't configured/available
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
  song_url?: string
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

// pg returns TIMESTAMPTZ columns as JS Date objects. Normalise them back to the
// ISO strings the SQLite layer used to return so the API/JSON shape is unchanged.
function toIsoString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function dbBookToBook(dbBook: SQLiteBook): Book {
  const book: Book = {
    id: dbBook.id,
    title: dbBook.title,
    pages: [],
    ageRange: dbBook.age_range,
    illustrationStyle: dbBook.illustration_style,
    status: dbBook.status,
    createdAt: toIsoString(dbBook.created_at) || '',
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

  if (dbBook.song_url) {
    book.songUrl = dbBook.song_url
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
  if (!isDatabaseConfigured()) {
    // Use in-memory fallback
    const memBook = memoryStorage.books.get(bookId)
    if (!memBook) return undefined

    const book = dbBookToBook(memBook)
    book.pages = memoryStorage.pages.get(bookId) || []
    return book
  }

  const { rows } = await query('SELECT * FROM books WHERE id = $1', [bookId])
  const bookRow = rows[0] as SQLiteBook | undefined

  if (!bookRow) return undefined

  const book = dbBookToBook(bookRow)

  // Get pages
  const pages = (await query(
    'SELECT * FROM book_pages WHERE book_id = $1 ORDER BY page_number',
    [bookId]
  )).rows as any[]
  book.pages = pages.map(p => ({
    pageNumber: p.page_number,
    text: p.text,
    image: p.image,
  }))

  return book
}

export async function setBookInSQLite(book: Book): Promise<void> {
  if (!isDatabaseConfigured()) {
    // Use in-memory fallback
    memoryStorage.books.set(book.id, {
      id: book.id,
      title: book.title,
      title_page_image: book.titlePage?.image || null,
      age_range: book.ageRange,
      illustration_style: book.illustrationStyle,
      status: book.status,
      audio_url: book.audioUrl || null,
      song_url: book.songUrl || null,
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

  const params = [
    book.id,
    book.title,
    book.titlePage?.image || null,
    book.ageRange,
    book.illustrationStyle,
    book.status,
    book.audioUrl || null,
    book.songUrl || null,
    book.createdAt,
    book.expectedPages || 8,
    book.generationProgress || 0,
    book.narratorVoice || 'default',
    book.character?.name || null,
    book.character?.type || null,
    book.character?.traits ? JSON.stringify(book.character.traits) : null,
    book.ownerId || null,
  ]

  // Upsert the book and (if present) replace its pages in one transaction so the
  // delete + reinsert is atomic — parity with the old better-sqlite3 transaction.
  await withTransaction(async (client) => {
    await client.query(
      `
      INSERT INTO books (
        id, title, title_page_image, age_range, illustration_style, status,
        audio_url, song_url, created_at, expected_pages, generation_progress, narrator_voice,
        character_name, character_type, character_traits, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        title_page_image = EXCLUDED.title_page_image,
        age_range = EXCLUDED.age_range,
        illustration_style = EXCLUDED.illustration_style,
        status = EXCLUDED.status,
        audio_url = EXCLUDED.audio_url,
        song_url = EXCLUDED.song_url,
        created_at = EXCLUDED.created_at,
        expected_pages = EXCLUDED.expected_pages,
        generation_progress = EXCLUDED.generation_progress,
        narrator_voice = EXCLUDED.narrator_voice,
        character_name = EXCLUDED.character_name,
        character_type = EXCLUDED.character_type,
        character_traits = EXCLUDED.character_traits,
        owner_id = EXCLUDED.owner_id
      `,
      params
    )

    if (book.pages && book.pages.length > 0) {
      await client.query('DELETE FROM book_pages WHERE book_id = $1', [book.id])

      const values: any[] = []
      const placeholders = book.pages.map((page, i) => {
        const base = i * 4
        values.push(book.id, page.pageNumber, page.text, page.image)
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
      })

      await client.query(
        `INSERT INTO book_pages (book_id, page_number, text, image) VALUES ${placeholders.join(', ')}`,
        values
      )
    }
  })
}

// Lightweight book summaries — selects metadata + cover only (no page images).
// Used by library/listing views so we don't load megabytes of base64 per book.
export async function getUserBookSummariesFromSQLite(userId: string): Promise<Book[]> {
  if (!isDatabaseConfigured()) {
    return Array.from(memoryStorage.books.values())
      .filter(b => b.owner_id === userId)
      .map(b => dbBookToBook(b))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const rows = (await query(
    'SELECT * FROM books WHERE owner_id = $1 ORDER BY created_at DESC',
    [userId]
  )).rows as SQLiteBook[]
  // dbBookToBook leaves pages as [] — exactly what a list view needs.
  return rows.map(dbBookToBook)
}

export async function countUserBooksInSQLite(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) {
    return Array.from(memoryStorage.books.values()).filter(b => b.owner_id === userId).length
  }
  const row = (await query('SELECT COUNT(*) as n FROM books WHERE owner_id = $1', [userId])).rows[0]
  // Postgres returns COUNT as a string (bigint); coerce back to a number.
  return Number(row?.n ?? 0)
}

export async function getUserBooksFromSQLite(userId: string): Promise<Book[]> {
  if (!isDatabaseConfigured()) {
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

  const books = (await query(
    'SELECT * FROM books WHERE owner_id = $1 ORDER BY created_at DESC',
    [userId]
  )).rows as SQLiteBook[]

  const result: Book[] = []
  for (const bookRow of books) {
    const book = await getBookFromSQLite(bookRow.id)
    if (book) result.push(book)
  }

  return result
}

export async function deleteBookFromSQLite(bookId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    memoryStorage.books.delete(bookId)
    memoryStorage.pages.delete(bookId)
    return
  }

  // book_pages cascades via the FK ON DELETE CASCADE.
  await query('DELETE FROM books WHERE id = $1', [bookId])
}

export async function toggleFavoriteInSQLite(userId: string, bookId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    const userLib = memoryStorage.userLibrary.get(userId) || new Map()
    const existing = userLib.get(bookId)
    const newValue = existing?.is_favorite ? 0 : 1
    userLib.set(bookId, { ...existing, is_favorite: newValue, book_id: bookId })
    memoryStorage.userLibrary.set(userId, userLib)
    return newValue === 1
  }

  const existing = (await query(
    'SELECT * FROM user_library WHERE user_id = $1 AND book_id = $2',
    [userId, bookId]
  )).rows[0]

  if (existing) {
    const newValue = existing.is_favorite ? 0 : 1
    await query(
      'UPDATE user_library SET is_favorite = $1 WHERE user_id = $2 AND book_id = $3',
      [newValue, userId, bookId]
    )
    return newValue === 1
  } else {
    await query(
      'INSERT INTO user_library (user_id, book_id, is_favorite) VALUES ($1, $2, 1)',
      [userId, bookId]
    )
    return true
  }
}

export async function getFavoritesFromSQLite(userId: string): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    const userLib = memoryStorage.userLibrary.get(userId)
    if (!userLib) return []
    return Array.from(userLib.entries())
      .filter(([_, data]) => data.is_favorite === 1)
      .map(([bookId, _]) => bookId)
  }

  const rows = (await query(
    'SELECT book_id FROM user_library WHERE user_id = $1 AND is_favorite = 1',
    [userId]
  )).rows as any[]
  return rows.map(r => r.book_id)
}

export async function recordReadingInSQLite(userId: string, bookId: string, durationSeconds: number, completed: boolean): Promise<void> {
  if (!isDatabaseConfigured()) {
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

  // Update book read count
  await query(
    `UPDATE books
     SET read_count = read_count + 1, last_read_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [bookId]
  )

  // Record in user library
  const existing = (await query(
    'SELECT * FROM user_library WHERE user_id = $1 AND book_id = $2',
    [userId, bookId]
  )).rows[0]

  if (existing) {
    await query(
      `UPDATE user_library
       SET read_count = read_count + 1, last_read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND book_id = $2`,
      [userId, bookId]
    )
  } else {
    await query(
      `INSERT INTO user_library (user_id, book_id, read_count, last_read_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP)`,
      [userId, bookId]
    )
  }

  // Record detailed stats
  await query(
    `INSERT INTO reading_stats (user_id, book_id, read_duration_seconds, completed)
     VALUES ($1, $2, $3, $4)`,
    [userId, bookId, durationSeconds, completed ? 1 : 0]
  )
}

export async function getReadingStatsFromSQLite(userId: string): Promise<{
  totalBooksRead: number
  totalReadingTime: number
  favoriteBooks: string[]
  recentBooks: Book[]
}> {
  if (!isDatabaseConfigured()) {
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

  // Get reading stats
  const stats = (await query(
    `SELECT
       COUNT(DISTINCT book_id) as total_books,
       SUM(read_duration_seconds) as total_time
     FROM reading_stats
     WHERE user_id = $1`,
    [userId]
  )).rows[0]

  // Get favorites
  const favorites = await getFavoritesFromSQLite(userId)

  // Get recent books. NULLS LAST matches SQLite ordering (NULL sorts last in DESC).
  const recent = (await query(
    `SELECT b.* FROM books b
     JOIN user_library ul ON b.id = ul.book_id
     WHERE ul.user_id = $1
     ORDER BY ul.last_read_at DESC NULLS LAST
     LIMIT 5`,
    [userId]
  )).rows as SQLiteBook[]

  const recentBooks: Book[] = []
  for (const bookRow of recent) {
    const book = await getBookFromSQLite(bookRow.id)
    if (book) recentBooks.push(book)
  }

  return {
    totalBooksRead: Number(stats?.total_books ?? 0),
    totalReadingTime: Number(stats?.total_time ?? 0),
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
  if (!isDatabaseConfigured()) {
    return memoryStorage.parentSettings.get(userId)
  }

  const settings = (await query(
    'SELECT * FROM parent_settings WHERE user_id = $1',
    [userId]
  )).rows[0]

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
  if (!isDatabaseConfigured()) {
    const existing = memoryStorage.parentSettings.get(userId) || {
      contentFilterEnabled: true,
      maxBooksPerDay: 10,
      allowSharing: true,
      requireApproval: false,
    }
    memoryStorage.parentSettings.set(userId, { ...existing, ...settings })
    return
  }

  const existing = (await query(
    'SELECT * FROM parent_settings WHERE user_id = $1',
    [userId]
  )).rows[0]

  if (existing) {
    await query(
      `UPDATE parent_settings SET
        content_filter_enabled = COALESCE($1::integer, content_filter_enabled),
        max_books_per_day = COALESCE($2::integer, max_books_per_day),
        allow_sharing = COALESCE($3::integer, allow_sharing),
        require_approval = COALESCE($4::integer, require_approval),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5`,
      [
        settings.contentFilterEnabled !== undefined ? (settings.contentFilterEnabled ? 1 : 0) : null,
        settings.maxBooksPerDay || null,
        settings.allowSharing !== undefined ? (settings.allowSharing ? 1 : 0) : null,
        settings.requireApproval !== undefined ? (settings.requireApproval ? 1 : 0) : null,
        userId,
      ]
    )
  } else {
    await query(
      `INSERT INTO parent_settings (user_id, content_filter_enabled, max_books_per_day, allow_sharing, require_approval)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         content_filter_enabled = EXCLUDED.content_filter_enabled,
         max_books_per_day = EXCLUDED.max_books_per_day,
         allow_sharing = EXCLUDED.allow_sharing,
         require_approval = EXCLUDED.require_approval,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        settings.contentFilterEnabled !== undefined ? (settings.contentFilterEnabled ? 1 : 0) : 1,
        settings.maxBooksPerDay || 10,
        settings.allowSharing !== undefined ? (settings.allowSharing ? 1 : 0) : 1,
        settings.requireApproval !== undefined ? (settings.requireApproval ? 1 : 0) : 0,
      ]
    )
  }
}
