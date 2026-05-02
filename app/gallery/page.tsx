'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

// Dark-theme select style
const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '2px solid rgba(77,201,255,0.25)',
  borderRadius: 12,
  padding: '10px 14px',
  color: '#fefcf5',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '0.88rem',
  fontWeight: 700,
  outline: 'none',
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d1b3e' }}>
        <div className="text-center">
          <div className="text-6xl animate-kq-spin mb-4">✨</div>
          <p className="text-lg font-semibold" style={{ color: '#fefcf5', fontFamily: 'Fredoka One, cursive' }}>
            Loading gallery...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="kq-stars-bg relative min-h-screen"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #1a0a3e 100%)' }}
    >
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="kq-top-bar">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home">🏠</button>
          </div>
          <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.2rem', color: '#fefcf5' }}>
            Story Gallery 🖼️
          </span>
          <button
            onClick={() => router.push('/generate')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: '#f5d000', color: '#0d1b3e', boxShadow: '0 3px 0 #b89f00' }}
          >
            ✨ Create Your Own
          </button>
        </div>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5">
          <p className="text-center text-sm font-semibold mb-5" style={{ color: '#a0b4d6' }}>
            ✦ Magical stories created by kids everywhere ✦
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold" style={{ color: '#4dc9ff' }}>Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold" style={{ color: '#4dc9ff' }}>Hero Type:</label>
              <select
                value={selectedHeroType}
                onChange={(e) => setSelectedHeroType(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All Types</option>
                {heroTypes.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Featured (first book) */}
          {filteredBooks.length > 0 && (
            <div className="mb-6">
              <div className="kq-section-label">🌟 Featured This Week</div>
              <div
                className="relative rounded-2xl overflow-hidden cursor-pointer"
                style={{ aspectRatio: '16/9', border: '2px solid rgba(77,201,255,0.2)', maxWidth: 600 }}
                onClick={() => router.push(`/book/${filteredBooks[0].id}`)}
              >
                {filteredBooks[0].titlePage?.image ? (
                  <img src={filteredBooks[0].titlePage.image} alt={filteredBooks[0].title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: 'linear-gradient(135deg, #1a1a6e, #4a148c)' }}>📖</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.82))' }}>
                  <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.2rem', color: '#fff' }}>{filteredBooks[0].title}</div>
                  <div className="text-xs mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {filteredBooks[0].category} · Grade {filteredBooks[0].ageRange} · {filteredBooks[0].pageCount} pages
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: '#a0b4d6' }}>No books found matching your filters.</p>
            </div>
          ) : (
            <>
              <div className="kq-section-label">✨ All Stories</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => router.push(`/book/${book.id}`)}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 group"
                    style={{
                      background: '#1a2a5e',
                      border: '2px solid rgba(77,201,255,0.15)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Cover */}
                    <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #1e3a7a, #2d1b5e)' }}>
                      {book.titlePage?.image ? (
                        <img src={book.titlePage.image} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                      )}
                      {/* Page count badge */}
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#f5d000', backdropFilter: 'blur(4px)' }}
                      >
                        {book.pageCount} pgs
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #f5d000, #00e5a0, #4dc9ff)', opacity: 0.5 }} />
                      <h3 className="font-bold text-sm mb-1.5 line-clamp-2" style={{ fontFamily: 'Fredoka One, cursive', color: '#fefcf5', lineHeight: 1.3 }}>
                        {book.title}
                      </h3>
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: '#a0b4d6' }}>{book.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="kq-chip kq-chip-purple">{book.category}</span>
                        <span className="kq-chip kq-chip-sky">Grade {book.ageRange}</span>
                        {book.heroType && <span className="kq-chip kq-chip-mint">{book.heroType}</span>}
                      </div>
                      <div className="text-xs" style={{ color: '#a0b4d6' }}>📍 {book.setting}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
