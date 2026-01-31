'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface BookPage {
  pageNumber: number
  text: string
  image: string
}

interface TitlePage {
  image: string
  title: string
}

interface Book {
  id: string
  title: string
  titlePage?: TitlePage
  pages: BookPage[]
  ageRange: string
  illustrationStyle: string
}

export default function SharePage() {
  const params = useParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)

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

  const handlePageChange = (newPage: number) => {
    setIsPageTransitioning(true)
    setTimeout(() => {
      setCurrentPage(newPage)
      setIsPageTransitioning(false)
    }, 150)
  }

  const handleCreateYourOwn = () => {
    window.location.href = '/generate'
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <div className="text-center">
          <Icon name="auto_awesome" className="text-purple-500 animate-spin mb-4" size={64} />
          <p className="text-lg font-semibold text-gray-800">Loading story...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">Story not found</p>
          <button
            onClick={handleCreateYourOwn}
            className="mt-4 rounded-lg bg-purple-500 px-6 py-2 text-white hover:bg-purple-600"
          >
            Create Your Own Story
          </button>
        </div>
      </div>
    )
  }

  // Calculate total pages including title page
  const hasTitlePage = !!book.titlePage
  const totalPages = book.pages.length + (hasTitlePage ? 1 : 0)
  const isTitlePage = hasTitlePage && currentPage === 0
  const contentPageIndex = hasTitlePage ? currentPage - 1 : currentPage
  const page = isTitlePage ? null : book.pages[contentPageIndex]

  // Title page view
  if (isTitlePage && book.titlePage) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 flex items-center justify-center">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA"
                alt="KinderQuill"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-purple-600">KinderQuill</span>
          </div>
          <button
            onClick={handleCreateYourOwn}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg transition-all"
          >
            Create Your Own
          </button>
        </div>

        {/* Title Page Content */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full">
          <div className="w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white">
            <img
              src={book.titlePage.image}
              alt={book.title}
              className="w-full h-auto object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{book.title}</h1>
          <p className="text-gray-600">A magical story created with KinderQuill</p>
        </main>

        {/* Page Indicators */}
        <div className="flex w-full flex-row items-center justify-center gap-2 py-4">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index)}
              className={`h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                index === currentPage
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg">
          <div className="flex flex-1 justify-between gap-4 px-4 py-4 max-w-4xl mx-auto">
            <button
              disabled={true}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-100 px-6 text-base font-semibold text-gray-700 disabled:opacity-40"
            >
              <Icon name="chevron_left" size={24} />
              <span>Previous</span>
            </button>
            <button
              onClick={() => handlePageChange(1)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 text-base font-semibold text-white hover:shadow-lg"
            >
              <span>Next</span>
              <Icon name="chevron_right" size={24} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Invalid page</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 flex items-center justify-center">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA"
              alt="KinderQuill"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-purple-600">KinderQuill</span>
        </div>
        <button
          onClick={handleCreateYourOwn}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg transition-all"
        >
          Create Your Own
        </button>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Image */}
        <div
          className={`w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white transition-all duration-500 ${
            isPageTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          {page.image ? (
            <img
              src={page.image}
              alt={`Page ${currentPage + 1} illustration`}
              className="w-full h-auto object-cover"
              key={currentPage}
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
              <Icon name="image" className="text-white/50 animate-pulse" size={64} />
            </div>
          )}
        </div>

        {/* Text */}
        <div
          className={`bg-white/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm transition-all duration-500 ${
            isPageTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          <p className="text-lg leading-relaxed text-gray-800 font-medium">
            {page.text}
          </p>
        </div>
      </main>

      {/* Page Indicators */}
      <div className="flex w-full flex-row items-center justify-center gap-2 py-4">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => handlePageChange(index)}
            className={`h-2 rounded-full transition-all duration-300 hover:scale-125 ${
              index === currentPage
                ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'
                : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="flex flex-1 justify-between gap-4 px-4 py-4 max-w-4xl mx-auto">
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 px-6 text-base font-semibold text-gray-700 disabled:opacity-40 transition-all"
          >
            <Icon name="chevron_left" size={24} />
            <span>Previous</span>
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 text-base font-semibold text-white disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
          >
            <span>Next</span>
            <Icon name="chevron_right" size={24} />
          </button>
        </div>
      </div>
    </div>
  )
}
