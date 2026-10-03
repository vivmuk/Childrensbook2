import { Pool, type PoolClient, type QueryResult } from 'pg'

// Postgres is optional - the app still runs (with the in-memory fallback in
// lib/sqlite-storage.ts) when DATABASE_URL is not set. Nothing here throws at
// import time; the pool and schema are created lazily on first use.

let pool: Pool | null = null
let schemaReady: Promise<void> | null = null

/** True when a Postgres connection string is configured (Railway sets DATABASE_URL). */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL
}

function requiresSsl(connectionString: string): boolean {
  return process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require')
}

/**
 * Lazily create the process-wide connection pool. Returns null when no
 * DATABASE_URL is configured so callers can fall back to memory storage.
 */
export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return null

  if (!pool) {
    pool = new Pool({
      connectionString,
      // Railway's internal/proxy connections need SSL in production; local
      // throwaway databases (and sslmode=disable URLs) do not.
      ...(requiresSsl(connectionString) ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 10,
    })
    // Never let an idle-client error crash the process.
    pool.on('error', (err) => {
      console.error('Unexpected error on idle Postgres client', err)
    })
  }

  return pool
}

/**
 * Run a parameterised query against the pool. Values are ALWAYS passed as
 * bind parameters ($1, $2, ...) - never interpolated into the SQL text.
 */
export async function query(text: string, params: unknown[] = []): Promise<QueryResult<any>> {
  const p = getPool()
  if (!p) {
    throw new Error('DATABASE_URL is not set; Postgres storage is unavailable')
  }
  await ensureSchema()
  return p.query(text, params as any[])
}

/** Run a callback inside a transaction on a single pooled client. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const p = getPool()
  if (!p) {
    throw new Error('DATABASE_URL is not set; Postgres storage is unavailable')
  }
  await ensureSchema()

  const client = await p.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore rollback failures; the original error is what matters
    }
    throw error
  } finally {
    client.release()
  }
}

/**
 * Create the schema exactly once per process. The promise is memoised so
 * concurrent callers share a single CREATE TABLE run instead of racing.
 * On failure the memo is cleared so a later call can retry.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = createSchema().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

async function createSchema(): Promise<void> {
  const p = getPool()
  if (!p) return

  // Translation of lib/sqlite.ts: same tables, columns, constraints and indexes,
  // using Postgres types. Kept idempotent with CREATE ... IF NOT EXISTS.
  await p.query(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_page_image TEXT,
      age_range TEXT,
      illustration_style TEXT,
      status TEXT DEFAULT 'generating',
      audio_url TEXT,
      song_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      expected_pages INTEGER DEFAULT 8,
      generation_progress INTEGER DEFAULT 0,
      narrator_voice TEXT DEFAULT 'default',
      character_name TEXT,
      character_type TEXT,
      character_traits TEXT,
      owner_id TEXT,
      is_favorite INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      last_read_at TIMESTAMPTZ
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS book_pages (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      image TEXT NOT NULL
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS user_library (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      last_read_at TIMESTAMPTZ,
      added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id)
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS parent_settings (
      user_id TEXT PRIMARY KEY,
      content_filter_enabled INTEGER DEFAULT 1,
      max_books_per_day INTEGER DEFAULT 10,
      allow_sharing INTEGER DEFAULT 1,
      require_approval INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS reading_stats (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      read_duration_seconds INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migration parity with lib/sqlite.ts: ensure older books tables gain song_url.
  await p.query('ALTER TABLE books ADD COLUMN IF NOT EXISTS song_url TEXT')

  await p.query('CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_id)')
  await p.query('CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)')
  await p.query('CREATE INDEX IF NOT EXISTS idx_book_pages_book ON book_pages(book_id)')
  await p.query('CREATE INDEX IF NOT EXISTS idx_user_library_user ON user_library(user_id)')
  await p.query('CREATE INDEX IF NOT EXISTS idx_reading_stats_user ON reading_stats(user_id)')
}

/** Close the pool (used by scripts/tests, harmless in the server). */
export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool
    pool = null
    await p.end()
  }
}
