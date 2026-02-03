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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <div className="text-center">
          <Icon name="auto_awesome" className="text-purple-500 animate-spin mb-4" size={64} />
          <p className="text-lg font-semibold text-gray-800">Loading gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
                title="Home"
              >
                <Icon name="home" className="text-purple-700" size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Story Gallery</h1>
            </div>
            <button
              onClick={() => router.push('/generate')}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
            >
              Create Your Own
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Hero Type:</label>
            <select
              value={selectedHeroType}
              onChange={(e) => setSelectedHeroType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              {heroTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">No books found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => router.push(`/book/${book.id}`)}
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
              >
                {/* Cover Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-200 to-pink-200 relative overflow-hidden">
                  {book.titlePage?.image ? (
                    <img
                      src={book.titlePage.image}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name="book" className="text-white/50" size={64} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-semibold text-gray-700">
                    {book.pageCount} pages
                  </div>
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {book.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                      {book.category}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {book.ageRange}
                    </span>
                    {book.heroType && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {book.heroType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Setting: {book.setting}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

