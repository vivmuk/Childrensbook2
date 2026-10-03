'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/components/Icons'

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

  // Move to the next sample every five seconds.
  useEffect(() => {
    if (books.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % books.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [books.length])

  if (isLoading) {
    return (
      <div className="mx-auto flex h-40 w-full max-w-sm items-center justify-center">
        <Icon name="auto_awesome" size={28} className="animate-kq-spin text-kq-dim" />
      </div>
    )
  }

  if (books.length === 0) return null

  const currentBook = books[currentIndex]

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="kq-eyebrow mb-3">Sample stories</div>

      <div className="relative">
        {/* The sample cover, standing on the shelf */}
        <div className="kq-cover relative">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
            {currentBook.titlePage?.image ? (
              <img
                src={currentBook.titlePage.image}
                alt={currentBook.title}
                className="h-full w-full animate-bloom-in object-cover"
                key={currentIndex}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Icon name="menu_book" size={40} className="text-kq-dim" />
              </div>
            )}

            {/* Title plate over the art */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-kq-ink/95 to-transparent p-3">
              <div className="font-display text-base leading-snug text-kq-text">
                {currentBook.title}
              </div>
              <div className="mt-0.5 text-xs text-kq-dim">
                Grade {currentBook.ageRange} &middot; {currentBook.illustrationStyle}
              </div>
            </div>
          </div>
        </div>

        {/* Prev/Next */}
        {books.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + books.length) % books.length)}
              className="kq-icon-btn absolute left-2 top-1/2 -translate-y-1/2"
              aria-label="Previous sample"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % books.length)}
              className="kq-icon-btn absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Next sample"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </>
        )}
      </div>

      {/* Page dots */}
      {books.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`kq-page-dot ${index === currentIndex ? 'active' : ''}`}
              aria-label={`Sample ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
