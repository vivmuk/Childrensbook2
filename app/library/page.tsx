'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { Header } from '@/components/Header'

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

export default function LibraryPage() {
  const router = useRouter()
  const [books, setBooks] = useState<StoredBook[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as StoredBook[]
      setBooks(stored)
    } catch {
      setBooks([])
    }
    try {
      const favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]
      setFavorites(favs)
    } catch {
      setFavorites([])
    }
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

  const STYLE_LABELS: Record<string, string> = {
    'ghibli': 'Anime Watercolor',
    'american-classic': 'Classic Cartoon',
    'watercolor': 'Whimsical Watercolor',
    'amar-chitra': 'Indian Illustrated',
    'chacha-chaudhary': 'Retro Bold Comic',
    'tintin': 'European Comic',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Header title="My Books" />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
            <Icon name="menu_book" className="text-purple-500" size={20} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {books.length} {books.length === 1 ? 'book' : 'books'} created
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700">
            <Icon name="favorite" className="text-pink-500" size={20} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {favorites.length} {favorites.length === 1 ? 'favourite' : 'favourites'}
            </span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => router.push('/generate')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <Icon name="auto_awesome" size={18} />
              New Story
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {(['all', 'favorites'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab
                  ? tab === 'all'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-pink-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Icon name={tab === 'all' ? 'menu_book' : 'favorite'} className="inline mr-1.5" size={16} />
              {tab === 'all' ? `All Books (${books.length})` : `Favourites (${favorites.length})`}
            </button>
          ))}
        </div>

        {/* Books grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{activeTab === 'favorites' ? '💝' : '📚'}</div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              {activeTab === 'favorites' ? 'No favourites yet' : 'No books yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              {activeTab === 'favorites'
                ? 'Tap the heart on any book to add it to your favourites!'
                : 'Create your first magical AI-generated storybook!'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => router.push('/generate')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105"
              >
                ✨ Create a Story
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map(book => (
              <div
                key={book.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all group border border-gray-100 dark:border-gray-700"
              >
                {/* Cover image */}
                <div
                  className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/book/${book.id}`)}
                >
                  {book.titlePageImage ? (
                    <img
                      src={book.titlePageImage}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 gap-2">
                      <Icon name="auto_stories" className="text-white/60" size={48} />
                      <span className="text-white/80 text-sm font-medium px-4 text-center">{book.title}</span>
                    </div>
                  )}

                  {/* Favourite button */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(book.id) }}
                    className="absolute top-2 left-2 w-9 h-9 rounded-full bg-white/85 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 flex items-center justify-center transition-all shadow-md hover:scale-110"
                    title={favorites.includes(book.id) ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    <Icon
                      name={favorites.includes(book.id) ? 'favorite' : 'favorite_border'}
                      className={favorites.includes(book.id) ? 'text-pink-500' : 'text-gray-400'}
                      size={20}
                    />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/85 hover:bg-red-50 dark:bg-gray-900/80 dark:hover:bg-red-900/40 flex items-center justify-center transition-all shadow-md opacity-0 group-hover:opacity-100"
                    title="Remove from library"
                  >
                    <Icon name="delete" className="text-red-400" size={18} />
                  </button>
                </div>

                {/* Book info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 truncate text-sm">{book.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {book.ageRange} grade &bull; {STYLE_LABELS[book.illustrationStyle] || book.illustrationStyle} &bull;{' '}
                    {new Date(book.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => router.push(`/book/${book.id}`)}
                    className="w-full py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-700 dark:text-purple-300 rounded-lg font-semibold text-sm transition-all"
                  >
                    📖 Read Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Storage note */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          📱 Books are saved locally in your browser. Clearing browser data will remove them.
        </p>
      </main>
    </div>
  )
}
