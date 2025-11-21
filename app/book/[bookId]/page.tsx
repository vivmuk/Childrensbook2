'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface BookPage {
  text: string
  image: string
}

interface Book {
  id: string
  title: string
  pages: BookPage[]
  ageRange: string
  illustrationStyle: string
  audioUrl?: string
}

export default function BookViewerPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/book/${bookId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch book')
        }
        const data = await response.json()
        setBook(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching book:', error)
        setIsLoading(false)
      }
    }

    fetchBook()
  }, [bookId])

  const handleGenerateAudio = async () => {
    if (!book) return

    setIsGeneratingAudio(true)
    try {
      const response = await fetch(`/api/generate-audio/${bookId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio')
      }

      const data = await response.json()
      setBook({ ...book, audioUrl: data.audioUrl })
    } catch (error) {
      console.error('Error generating audio:', error)
      alert('Failed to generate audio. Please try again.')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading book...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Book not found</p>
          <button
            onClick={() => router.push('/generate')}
            className="mt-4 rounded-lg bg-primary px-6 py-2 text-white hover:opacity-90"
          >
            Create New Book
          </button>
        </div>
      </div>
    )
  }

  if (!book.pages || book.pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Book is still being generated...</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please wait a moment and refresh.</p>
        </div>
      </div>
    )
  }

  const page = book.pages[currentPage]
  const totalPages = book.pages.length

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-lg">Invalid page</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 dark:bg-gray-900/90 p-4 shadow-sm backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-gray-800 dark:text-gray-100 truncate px-4">
          {book.title}
        </h2>
        <div className="flex w-10 items-center justify-end">
          {book.audioUrl ? (
            <audio controls className="h-8 w-24 rounded-lg">
              <source src={book.audioUrl} type="audio/mpeg" />
            </audio>
          ) : (
            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              title="Generate Audio"
            >
              <span className="material-symbols-outlined text-lg">
                {isGeneratingAudio ? 'hourglass_empty' : 'volume_up'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Image */}
        <div className="w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white dark:bg-gray-800">
          {page.image ? (
            <img
              src={page.image}
              alt={`Page ${currentPage + 1} illustration`}
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-white/50">image</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
          <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
            {page.text}
          </p>
        </div>
      </main>

      {/* Page Indicators */}
      <div className="flex w-full flex-row items-center justify-center gap-2 py-4">
        {book.pages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentPage
                ? 'w-8 bg-blue-500 dark:bg-blue-400'
                : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-1 justify-between gap-4 px-4 py-4 max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-6 text-base font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            <span className="material-symbols-outlined">chevron_left</span>
            <span>Previous</span>
          </button>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
            }
            disabled={currentPage === totalPages - 1}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 px-6 text-base font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            <span>Next</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

