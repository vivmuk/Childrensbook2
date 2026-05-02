'use client'

import { useState, useEffect } from 'react'

interface Book {
  id: string
  title: string
  titlePage?: { image: string; title: string }
  ageRange: string
  illustrationStyle: string
}

export function FeaturedBooksCarousel() {
  const [books, setBooks] = useState<Book[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/sample-books')
        if (response.ok) {
          const data = await response.json()
          setBooks(data.books.slice(0, 6))
        }
      } catch (error) {
        console.error('Error fetching featured books:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBooks()
  }, [])

  useEffect(() => {
    if (books.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % books.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [books.length])

  if (isLoading) {
    return (
      <div className="w-full max-w-sm mx-auto h-40 flex items-center justify-center">
        <div className="animate-kq-spin text-2xl">✨</div>
      </div>
    )
  }

  if (books.length === 0) return null

  const currentBook = books[currentIndex]

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Section label */}
      <div className="kq-section-label mb-3">⭐ Sample Stories</div>

      <div className="relative">
        {/* Main book display */}
        <div
          className="relative rounded-2xl overflow-hidden cursor-pointer"
          style={{
            aspectRatio: '16/9',
            border: '2px solid rgba(77,201,255,0.2)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {currentBook.titlePage?.image ? (
            <img
              src={currentBook.titlePage.image}
              alt={currentBook.title}
              className="w-full h-full object-cover transition-all duration-500 animate-zoomIn"
              key={currentIndex}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: 'linear-gradient(135deg, #1a1a6e, #2d1b5e)' }}
            >
              📖
            </div>
          )}

          {/* Title overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.82))' }}
          >
            <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1rem', color: '#fefcf5' }}>
              {currentBook.title}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, marginTop: 2 }}>
              Grade {currentBook.ageRange} · {currentBook.illustrationStyle}
            </div>
          </div>
        </div>

        {/* Prev/Next arrows */}
        {books.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + books.length) % books.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 kq-icon-btn"
              aria-label="Previous"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % books.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 kq-icon-btn"
              aria-label="Next"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {books.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`kq-page-dot ${index === currentIndex ? 'active' : ''}`}
              aria-label={`Book ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
