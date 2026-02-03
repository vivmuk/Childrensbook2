'use client'

import { useState, useEffect } from 'react'
import { Icon } from './Icons'

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
          setBooks(data.books.slice(0, 6)) // Show up to 6 books
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
    }, 5000) // Auto-advance every 5 seconds

    return () => clearInterval(interval)
  }, [books.length])

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto h-64 flex items-center justify-center">
        <Icon name="auto_awesome" className="animate-spin text-white/50" size={32} />
      </div>
    )
  }

  if (books.length === 0) {
    return null
  }

  const currentBook = books[currentIndex]

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-lg">
        Featured Stories
      </h3>
      
      <div className="relative max-w-md mx-auto">
        {/* Main Book Display */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/30">
          {currentBook.titlePage ? (
            <img
              src={currentBook.titlePage.image}
              alt={currentBook.title}
              className="w-full h-full object-cover transition-all duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="text-white text-lg font-semibold">{currentBook.title}</span>
            </div>
          )}
          
          {/* Overlay with title */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h4 className="text-white font-bold text-lg">{currentBook.title}</h4>
            <p className="text-white/80 text-sm">
              {currentBook.ageRange} grade • {currentBook.illustrationStyle}
            </p>
          </div>
        </div>

        {/* Navigation Arrows */}
        {books.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + books.length) % books.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 flex items-center justify-center transition-all"
              aria-label="Previous book"
            >
              <Icon name="chevron_left" className="text-white" size={24} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % books.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 flex items-center justify-center transition-all"
              aria-label="Next book"
            >
              <Icon name="chevron_right" className="text-white" size={24} />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {books.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to book ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
