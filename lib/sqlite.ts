import Database from 'better-sqlite3'
import { join } from 'path'
import { ensureDataDirectory } from './ensure-data-dir'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    ensureDataDirectory()
    const dbPath = join(process.cwd(), 'data', 'kinderquill.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initDatabase()
  }
  return db
}

function initDatabase() {
  if (!db) return

  // Books table
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_page_image TEXT,
      age_range TEXT,
      illustration_style TEXT,
      status TEXT DEFAULT 'generating',
      audio_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expected_pages INTEGER DEFAULT 8,
      generation_progress INTEGER DEFAULT 0,
      narrator_voice TEXT DEFAULT 'default',
      character_name TEXT,
      character_type TEXT,
      character_traits TEXT,
      owner_id TEXT,
      is_favorite INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      last_read_at TEXT
    )
  `)

  // Book pages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      image TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `)

  // User library table (for favorites and reading history)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      last_read_at TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    )
  `)

  // Parent settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS parent_settings (
      user_id TEXT PRIMARY KEY,
      content_filter_enabled INTEGER DEFAULT 1,
      max_books_per_day INTEGER DEFAULT 10,
      allow_sharing INTEGER DEFAULT 1,
      require_approval INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Reading stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      read_duration_seconds INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      read_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_book_pages_book ON book_pages(book_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_library_user ON user_library(user_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reading_stats_user ON reading_stats(user_id)`)
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
