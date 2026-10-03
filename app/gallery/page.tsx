'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface GalleryBook {
  id: string
  title: string
  description: string
  category: string
  heroType: 'animal' | 'person' | 'fantasy'
  setting: string
  ageRange: string
  illustrationStyle: string
  titlePage?: {
    image: string
    title: string
  }
  pageCount: number
}

// The sample covers are painted artwork, so they are shown big and framed
// like pictures rather than shrunk into small thumbnails. The grid therefore
// stays at one or two columns, never four.
/**
 * A book's page count, whichever way it is stored: generated books carry
 * `pages`, sample books also carry `expectedPages`, and the reader used to read
 * a `pageCount` field that never existed, which is why the cards printed the
 * word "pages" with no number in front of it.
 */
function pageCountOf(book: any): number {
  return book?.pages?.length || book?.expectedPages || book?.pageCount || 0
}

export default function GalleryPage() {
  const router = useRouter()
  const [books, setBooks] = useState<GalleryBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedHeroType, setSelectedHeroType] = useState<string>('all')

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/sample-books')
        if (response.ok) {
          const data = await response.json()
          setBooks(data.books || [])
        }
      } catch (error) {
        console.error('Error fetching books:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBooks()
  }, [])

  const categories = Array.from(new Set(books.map(b => b.category))).filter(Boolean)
  const heroTypes = Array.from(new Set(books.map(b => b.heroType))).filter(Boolean)

  const filteredBooks = books.filter(book => {
    if (selectedCategory !== 'all' && book.category !== selectedCategory) return false
    if (selectedHeroType !== 'all' && book.heroType !== selectedHeroType) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="kq-ground flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Icon name="auto_awesome" size={40} className="animate-kq-spin mx-auto mb-3 text-kq-amber" />
          <p className="font-display text-lg text-kq-text">Loading gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kq-ground kq-stars-bg relative min-h-screen overflow-x-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <div className="kq-top-bar">
          <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home" aria-label="Home">
            <Icon name="home" size={20} />
          </button>
          <span className="hidden font-display text-lg text-kq-text sm:inline">Story Gallery</span>
          {/* The one amber action on this screen. Sized with a style rule
              because .kq-btn-primary is full width by default. */}
          <button
            onClick={() => router.push('/generate')}
            className="kq-btn-primary"
            style={{ width: 'auto', padding: '10px 18px', fontSize: '0.9rem' }}
          >
            <Icon name="auto_awesome" size={16} />
            Create your own
          </button>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-kq-dim">
            Sample books, painted page by page. Every one was made from a single sentence.
          </p>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-kq-dim">Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="kq-input"
                style={{ width: 'auto', padding: '10px 14px', fontSize: '0.9rem', colorScheme: 'dark' }}
              >
                <option value="all">All categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-kq-dim">Hero type</span>
              <select
                value={selectedHeroType}
                onChange={(e) => setSelectedHeroType(e.target.value)}
                className="kq-input"
                style={{ width: 'auto', padding: '10px 14px', fontSize: '0.9rem', colorScheme: 'dark' }}
              >
                <option value="all">All types</option>
                {heroTypes.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
              </select>
            </label>
          </div>

          {/* Featured: the first match, shown large */}
          {filteredBooks.length > 0 && (
            <section className="mt-10">
              <div className="kq-eyebrow mb-3">Featured this week</div>
              <button
                onClick={() => router.push(`/book/${filteredBooks[0].id}`)}
                className="kq-cover group relative block w-full overflow-hidden text-left"
                style={{ aspectRatio: '16 / 9' }}
              >
                {filteredBooks[0].titlePage?.image ? (
                  <img
                    src={filteredBooks[0].titlePage.image}
                    alt={filteredBooks[0].title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-kq-dim">
                    <Icon name="book" size={48} />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-kq-ink via-kq-ink/70 to-transparent p-5">
                  <span className="block font-display text-xl text-kq-text lg:text-2xl">
                    {filteredBooks[0].title}
                  </span>
                  <span className="mt-1 block text-xs text-kq-dim">
                    {filteredBooks[0].category} · Grade {filteredBooks[0].ageRange} · {pageCountOf(filteredBooks[0])} pages
                  </span>
                </span>
              </button>
            </section>
          )}

          {/* The full shelf: painted covers, framed and large */}
          {filteredBooks.length === 0 ? (
            <p className="py-16 text-center text-kq-dim">No books match these filters.</p>
          ) : (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-2xl text-kq-text">All stories</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {filteredBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => router.push(`/book/${book.id}`)}
                    className="kq-cover group block w-full overflow-hidden text-left transition-transform duration-200 hover:-translate-y-1"
                  >
                    <span className="relative block overflow-hidden" style={{ aspectRatio: '4 / 3', background: 'var(--kq-navy-mid)' }}>
                      {book.titlePage?.image ? (
                        <img
                          src={book.titlePage.image}
                          alt={book.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-kq-dim">
                          <Icon name="book" size={40} />
                        </span>
                      )}
                      <span className="absolute right-3 top-3 rounded bg-kq-ink/80 px-2 py-0.5 text-xs text-kq-text">
                        {pageCountOf(book)} pages
                      </span>
                    </span>

                    <span className="block p-4">
                      <span className="block font-display text-lg leading-snug text-kq-text">{book.title}</span>
                      <span className="mt-1 line-clamp-2 text-sm text-kq-dim">{book.description}</span>
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        <span className="kq-chip">{book.category}</span>
                        <span className="kq-chip">Grade {book.ageRange}</span>
                        {book.heroType && <span className="kq-chip">{book.heroType}</span>}
                      </span>
                      <span className="mt-2 block text-xs text-kq-dim">Set in {book.setting}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="border-t border-kq-line px-4 py-5 text-center">
          <p className="text-xs text-kq-dim">
            Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
          </p>
        </footer>
      </div>
    </div>
  )
}
