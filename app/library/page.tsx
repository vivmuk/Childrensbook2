'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import BottomBar from '@/components/BottomBar'

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
    <div className="kq-ground kq-stars-bg kq-has-tabbar relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {/* Top bar: the two ways back, the shelf name, and the one amber action.
            Nothing else stands above the covers. */}
        <div className="kq-top-bar">
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home" aria-label="Home">
              <Icon name="home" size={18} />
            </button>
          </div>
          <span className="font-display min-w-0 flex-1 truncate px-3 text-center text-lg text-kq-text">
            My bookshelf
          </span>
          {/* The single amber action. With a shelf full of books it is this
              compact pill; with an empty shelf the invitation in the middle of
              the screen is the action instead, so this one steps aside rather
              than saying the same thing twice. */}
          {books.length > 0 && (
            <button
              onClick={() => router.push('/generate')}
              className="kq-btn-primary shrink-0 !w-auto !px-3.5 !py-2 !text-sm"
            >
              Make a story
            </button>
          )}
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 lg:max-w-6xl">
          <section aria-label="Your shelf">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
              <div>
                <p className="kq-eyebrow">On the shelf</p>
                {/* Real counts only. No invented pages, ratings or praise. */}
                <p className="mt-1.5 text-sm text-kq-dim">
                  {books.length} {books.length === 1 ? 'story' : 'stories'} &middot;{' '}
                  {favorites.length} {favorites.length === 1 ? 'favourite' : 'favourites'}
                </p>
              </div>

              {/* Filters are chips: rounded rectangles you can select, never pills.
                  Hidden when there is nothing to filter. */}
              {books.length > 0 && (
              <div className="flex flex-wrap gap-2">
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
              )}
            </div>

            {filteredBooks.length === 0 ? (
              <div className="py-10 text-center">
                {/* A painted panel rather than an empty void: the shelf should
                    still feel like the inside of a storybook when it is bare. */}
                <div className="relative mx-auto mb-7 w-full max-w-sm overflow-hidden rounded-[22px] border border-kq-line">
                  <img
                    src="/art/hero-tall.png"
                    alt="A grown-up and a child reading together under a lamp"
                    className="h-[300px] w-full object-cover object-[50%_35%]"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-kq-ink to-transparent" />
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
                    className="kq-btn-primary mx-auto w-auto px-5 py-3"
                  >
                    <Icon name="auto_awesome" size={18} />
                    Make a story
                  </button>
                )}
              </div>
            ) : (
              /* The shelf: painted covers standing in a row, each resting on a
                 plank. Two columns on a phone, more as the glass grows. */
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredBooks.map(book => (
                  <article key={book.id} className="group relative flex flex-col">
                    <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
                      {/* The cover plate. The whole plate is the way in. */}
                      <button
                        onClick={() => router.push(`/book/${book.id}`)}
                        aria-label={`Read ${book.title}`}
                        className="kq-cover relative block w-full cursor-pointer"
                        style={{ aspectRatio: '3 / 4' }}
                      >
                        {book.titlePageImage ? (
                          <img
                            src={book.titlePageImage}
                            alt={book.title}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
                            <Icon name="menu_book" size={30} className="text-kq-dim" />
                            <span className="font-display max-w-full break-words text-sm leading-snug text-kq-dim">{book.title}</span>
                          </span>
                        )}
                        {/* The lamp catches the spine edge of the standing book */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 w-[6px]"
                          style={{ background: 'linear-gradient(90deg, var(--kq-line), transparent)' }}
                        />
                      </button>

                      {/* Favourite: an indicator, not an action, so it may carry the accent */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(book.id) }}
                        className="absolute left-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded border border-kq-line bg-kq-ink/70 transition-transform duration-200 hover:scale-105"
                        title={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                        aria-label={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                      >
                        <Icon
                          name="star"
                          size={18}
                          filled={favorites.includes(book.id)}
                          className={favorites.includes(book.id) ? 'text-kq-amber' : 'text-kq-dim'}
                        />
                      </button>

                      {/* Delete: quiet, always reachable, including on touch screens */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                        className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded border border-kq-line bg-kq-ink/70 text-kq-dim opacity-70 transition-opacity duration-200 hover:text-kq-text hover:opacity-100"
                        title="Remove from library"
                        aria-label="Remove from library"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>

                    {/* The plank the book stands on. Neighbouring planks meet. */}
                    <span aria-hidden="true" className="-mx-2 mt-2 block h-[3px] rounded-[2px] bg-kq-line" />

                    <h3 className="font-display mt-2 truncate text-[0.95rem] text-kq-text" title={book.title}>
                      {book.title}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-kq-dim">
                      Grade {book.ageRange} &middot; {STYLE_LABELS[book.illustrationStyle] || book.illustrationStyle}
                    </p>
                    <p className="mt-0.5 text-xs text-kq-dim">
                      {new Date(book.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => router.push(`/book/${book.id}`)}
                      className="kq-btn-secondary mt-3 !py-2 !text-xs"
                    >
                      Read book
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="mt-8 text-center text-xs text-kq-dim">
            Books are saved in this browser. Clearing browser data removes them.
          </p>
        </main>

        <footer className="border-t border-kq-line px-4 py-3 text-center">
          <p className="text-xs text-kq-dim">
            Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
          </p>
        </footer>
      </div>

      <BottomBar active="shelf" />
    </div>
  )
}
