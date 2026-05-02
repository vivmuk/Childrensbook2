'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StoredBook {
  id: string
  title: string
  ageRange: string
  illustrationStyle: string
  createdAt: string
  titlePageImage?: string | null
}

const LS_KEY = 'kinderquill_my_books'
const FAV_KEY = 'kinderquill_favorites'

const STYLE_LABELS: Record<string, string> = {
  'ghibli':           'Anime Watercolor',
  'american-classic': 'Classic Cartoon',
  'watercolor':       'Whimsical Watercolor',
  'amar-chitra':      'Indian Illustrated',
  'chacha-chaudhary': 'Retro Bold Comic',
  'tintin':           'European Comic',
}

export default function LibraryPage() {
  const router = useRouter()
  const [books, setBooks] = useState<StoredBook[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as StoredBook[]
      setBooks(stored)
    } catch { setBooks([]) }
    try {
      const favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]
      setFavorites(favs)
    } catch { setFavorites([]) }
  }, [])

  const toggleFavorite = (bookId: string) => {
    const updated = favorites.includes(bookId)
      ? favorites.filter(id => id !== bookId)
      : [...favorites, bookId]
    setFavorites(updated)
    localStorage.setItem(FAV_KEY, JSON.stringify(updated))
  }

  const deleteBook = (bookId: string) => {
    if (!confirm('Remove this book from your library?')) return
    const updated = books.filter(b => b.id !== bookId)
    setBooks(updated)
    localStorage.setItem(LS_KEY, JSON.stringify(updated))
  }

  const filteredBooks = activeTab === 'favorites'
    ? books.filter(b => favorites.includes(b.id))
    : books

  return (
    <div
      className="kq-stars-bg relative min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #0d2a40 100%)' }}
    >
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="kq-top-bar">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home">🏠</button>
            <button onClick={() => router.back()} className="kq-icon-btn" title="Back">←</button>
          </div>
          <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.2rem', color: '#fefcf5' }}>
            My Bookshelf 📚
          </span>
          <button
            onClick={() => router.push('/generate')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{ background: '#f5d000', color: '#0d1b3e', border: 'none', boxShadow: '0 3px 0 #b89f00' }}
          >
            ✨ New Story
          </button>
        </div>

        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center py-3 px-2 rounded-2xl" style={{ background: 'rgba(245,208,0,0.08)', border: '1.5px solid rgba(245,208,0,0.2)' }}>
              <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.8rem', color: '#f5d000' }}>{books.length}</div>
              <div className="text-xs font-bold" style={{ color: '#a0b4d6' }}>Stories Created</div>
            </div>
            <div className="text-center py-3 px-2 rounded-2xl" style={{ background: 'rgba(255,82,71,0.08)', border: '1.5px solid rgba(255,82,71,0.2)' }}>
              <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.8rem', color: '#ff5247' }}>{favorites.length}</div>
              <div className="text-xs font-bold" style={{ color: '#a0b4d6' }}>Favourites</div>
            </div>
            <div className="text-center py-3 px-2 rounded-2xl" style={{ background: 'rgba(77,201,255,0.08)', border: '1.5px solid rgba(77,201,255,0.2)' }}>
              <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.8rem', color: '#4dc9ff' }}>{books.length * 8}</div>
              <div className="text-xs font-bold" style={{ color: '#a0b4d6' }}>Pages Made</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-5">
            {(['all', 'favorites'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 rounded-full font-bold text-sm transition-all"
                style={{
                  background: activeTab === tab
                    ? (tab === 'all' ? '#9b5de5' : '#ff5247')
                    : 'rgba(255,255,255,0.05)',
                  border: activeTab === tab ? 'none' : '2px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  boxShadow: activeTab === tab
                    ? (tab === 'all' ? '0 4px 0 #6b3db5' : '0 4px 0 #c22e24')
                    : 'none',
                  fontFamily: 'Fredoka One, cursive',
                }}
              >
                {tab === 'all' ? `📚 All Books (${books.length})` : `❤️ Favourites (${favorites.length})`}
              </button>
            ))}
          </div>

          {/* Books grid / empty state */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 animate-kq-float">{activeTab === 'favorites' ? '💝' : '📚'}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Fredoka One, cursive', color: '#fefcf5' }}>
                {activeTab === 'favorites' ? 'No favourites yet' : 'No books yet'}
              </h3>
              <p className="mb-6 max-w-xs mx-auto" style={{ color: '#a0b4d6' }}>
                {activeTab === 'favorites'
                  ? 'Tap the heart on any book to add it to your favourites!'
                  : 'Create your first magical AI-generated storybook!'}
              </p>
              {activeTab === 'all' && (
                <button onClick={() => router.push('/generate')} className="kq-btn-primary" style={{ maxWidth: 240, margin: '0 auto' }}>
                  ✨ Create a Story
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map(book => (
                <div
                  key={book.id}
                  className="rounded-2xl overflow-hidden group transition-all hover:-translate-y-1"
                  style={{ background: '#1a2a5e', border: '2px solid rgba(77,201,255,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
                >
                  {/* Cover */}
                  <div
                    className="relative cursor-pointer overflow-hidden"
                    style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #1e3a7a, #2d1b5e)' }}
                    onClick={() => router.push(`/book/${book.id}`)}
                  >
                    {book.titlePageImage ? (
                      <img
                        src={book.titlePageImage} alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="text-5xl">📖</span>
                        <span className="text-xs font-semibold px-3 text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>{book.title}</span>
                      </div>
                    )}

                    {/* Favourite button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(book.id) }}
                      className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110"
                      style={{ background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.15)' }}
                      title={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      <span style={{ fontSize: '0.9rem' }}>{favorites.includes(book.id) ? '❤️' : '🤍'}</span>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md opacity-0 group-hover:opacity-100"
                      style={{ background: 'rgba(255,82,71,0.7)', border: '1.5px solid rgba(255,82,71,0.5)' }}
                      title="Remove from library"
                    >
                      <span style={{ fontSize: '0.75rem' }}>✕</span>
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3" style={{ position: 'relative' }}>
                    {/* gradient top line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #f5d000, #00e5a0, #4dc9ff)', opacity: 0.5 }} />
                    <h3 className="font-bold truncate text-sm mb-1" style={{ fontFamily: 'Fredoka One, cursive', color: '#fefcf5' }}>{book.title}</h3>
                    <p className="text-xs mb-3" style={{ color: '#a0b4d6' }}>
                      Grade {book.ageRange} · {STYLE_LABELS[book.illustrationStyle] || book.illustrationStyle}
                      <br />
                      {new Date(book.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(155,93,229,0.2)', border: '1.5px solid rgba(155,93,229,0.35)', color: '#c89dff' }}
                    >
                      📖 Read Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs mt-8" style={{ color: '#a0b4d6' }}>
            📱 Books are saved locally in your browser. Clearing browser data will remove them.
          </p>
        </main>

        <footer className="py-3 text-center" style={{ borderTop: '1px solid rgba(77,201,255,0.1)', background: 'rgba(10,18,48,0.8)' }}>
          <p className="text-xs" style={{ color: '#a0b4d6' }}>
            Created with <span className="font-semibold" style={{ color: '#9b5de5' }}>Venice.ai</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
