'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'

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

// Friendly names for the illustration styles a book can carry.
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
    <div className="kq-ground kq-stars-bg relative min-h-[100dvh] w-full">
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {/* Top bar: the two ways back, the shelf name, and the one amber action. */}
        <div className="kq-top-bar">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home" aria-label="Home">
              <Icon name="home" size={18} />
            </button>
            <button onClick={() => router.back()} className="kq-icon-btn" title="Back" aria-label="Back">
              <Icon name="arrow_back" size={18} />
            </button>
          </div>
          <span className="font-display min-w-0 flex-1 truncate px-3 text-center text-lg text-kq-text">
            My bookshelf
          </span>
          {/* The single amber action. Sized down for the bar, so the utilities
              carry !important to beat the full width button class. */}
          <button
            onClick={() => router.push('/generate')}
            className="kq-btn-primary !w-auto !px-4 !py-2 !text-sm"
          >
            Make a story
          </button>
        </div>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 lg:max-w-6xl xl:max-w-7xl">
          {/* Real counts only. No invented pages, ratings or praise. */}
          <p className="mb-4 text-sm text-kq-dim">
            {books.length} {books.length === 1 ? 'story' : 'stories'} &middot;{' '}
            {favorites.length} {favorites.length === 1 ? 'favourite' : 'favourites'}
          </p>

          {/* Filters are chips: rounded rectangles you can select, never pills. */}
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              aria-pressed={activeTab === 'all'}
              className={`kq-chip cursor-pointer ${activeTab === 'all' ? 'is-on' : ''}`}
            >
              All books ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              aria-pressed={activeTab === 'favorites'}
              className={`kq-chip cursor-pointer ${activeTab === 'favorites' ? 'is-on' : ''}`}
            >
              Favourites ({favorites.length})
            </button>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="py-10 text-center">
              {/* A painted panel rather than an empty void: the shelf should
                  still feel like the inside of a storybook when it is bare. */}
              <div className="relative mx-auto mb-7 w-full max-w-sm overflow-hidden rounded-[22px] border border-kq-hairline">
                <img
                  src="/art/hero-tall.png"
                  alt="A grown-up and a child reading together under a lamp"
                  className="h-[300px] w-full object-cover object-[50%_35%]"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-kq-ground to-transparent" />
              </div>

              <h3 className="mb-2 font-display text-2xl text-kq-text">
                {activeTab === 'favorites' ? 'No favourites yet' : 'Your shelf is empty'}
              </h3>
              <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-kq-dim">
                {activeTab === 'favorites'
                  ? 'Tap the star on a book to keep it here.'
                  : 'Tell us an idea and we will paint every page of it tonight.'}
              </p>
              {activeTab !== 'favorites' && (
                <button
                  onClick={() => router.push('/generate')}
                  className="kq-btn-secondary mx-auto w-auto px-5 py-3"
                >
                  <Icon name="auto_awesome" size={18} />
                  Make a story
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
              {filteredBooks.map(book => (
                <div
                  key={book.id}
                  className="kq-card group flex flex-col !p-0 transition-transform duration-200 hover:-translate-y-1"
                >
                  {/* Cover plate */}
                  <div
                    className="relative cursor-pointer overflow-hidden bg-kq-navy-mid"
                    style={{ aspectRatio: '4 / 3' }}
                    onClick={() => router.push(`/book/${book.id}`)}
                  >
                    {book.titlePageImage ? (
                      <img
                        src={book.titlePageImage} alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                        <Icon name="menu_book" size={34} className="text-kq-dim" />
                        <span className="text-xs text-kq-dim">{book.title}</span>
                      </div>
                    )}

                    {/* Favourite: an indicator, not an action, so it may carry the accent */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFavorite(book.id) }}
                      className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded border border-kq-line bg-kq-ink/70 transition-transform duration-200 hover:scale-105"
                      title={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                      aria-label={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                    >
                      <Icon
                        name="star"
                        size={20}
                        filled={favorites.includes(book.id)}
                        className={favorites.includes(book.id) ? 'text-kq-amber' : 'text-kq-dim'}
                      />
                    </button>

                    {/* Delete: quiet, always reachable, including on touch screens */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded border border-kq-line bg-kq-ink/70 text-kq-dim opacity-70 transition-opacity duration-200 hover:text-kq-text hover:opacity-100"
                      title="Remove from library"
                      aria-label="Remove from library"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </div>

                  {/* Title and the way in */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display truncate text-base text-kq-text">{book.title}</h3>
                    <p className="mb-4 mt-1 text-xs text-kq-dim">
                      Grade {book.ageRange} &middot; {STYLE_LABELS[book.illustrationStyle] || book.illustrationStyle}
                      <br />
                      {new Date(book.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="kq-btn-secondary mt-auto !py-2.5 !text-sm"
                    >
                      Read book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-kq-dim">
            Books are saved in this browser. Clearing browser data removes them.
          </p>
        </main>

        <footer className="border-t border-kq-line-soft px-4 py-3 text-center">
          <p className="text-xs text-kq-dim">
            Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
          </p>
        </footer>
      </div>
    </div>
  )
}
