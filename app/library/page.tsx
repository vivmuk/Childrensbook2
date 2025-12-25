'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'
import { useAuth } from '@/components/AuthContext'
import type { Book } from '@/lib/storage'
import { auth } from '@/lib/firebase'

export default function LibraryPage() {
    const router = useRouter()
    const { user, loading } = useAuth()
    const [books, setBooks] = useState<Book[]>([])
    const [isLoadingBooks, setIsLoadingBooks] = useState(true)

    useEffect(() => {
        if (!loading && !user) {
            router.push('/')
            return
        }

        if (user) {
            fetchBooks()
        }
    }, [user, loading, router])

    const fetchBooks = async () => {
        try {
            if (!auth.currentUser) return
            const token = await auth.currentUser.getIdToken()

            const response = await fetch('/api/my-books', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setBooks(data.books || [])
            }
        } catch (error) {
            console.error('Error fetching books:', error)
        } finally {
            setIsLoadingBooks(false)
        }
    }

    const handleBookClick = (bookId: string) => {
        router.push(`/book/${bookId}`)
    }

    if (loading || (!user && isLoadingBooks)) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <Header title="My Library" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Icon name="sync" className="animate-spin text-purple-600" size={32} />
                        <p className="text-gray-500">Loading library...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Header title="My Library" />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 font-display">
                        My Storybooks
                    </h1>
                    <button
                        onClick={() => router.push('/generate')}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-md"
                    >
                        <Icon name="auto_awesome" size={20} />
                        <span className="hidden sm:inline">Create New Story</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>

                {isLoadingBooks ? (
                    <div className="flex justify-center py-20">
                        <Icon name="sync" className="animate-spin text-purple-600" size={32} />
                    </div>
                ) : books.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icon name="menu_book" className="text-purple-400" size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                            Your library is empty
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                            You haven't created any stories yet. Start your journey by creating a magical storybook!
                        </p>
                        <button
                            onClick={() => router.push('/generate')}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            <Icon name="auto_awesome" size={20} />
                            Create Your First Book
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {books.map((book) => (
                            <div
                                key={book.id}
                                onClick={() => handleBookClick(book.id)}
                                className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 flex flex-col h-full"
                            >
                                {/* Cover Image */}
                                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                                    {book.titlePage?.image ? (
                                        <img
                                            src={book.titlePage.image}
                                            alt={book.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : book.pages?.[0]?.image ? (
                                        <img
                                            src={book.pages[0].image}
                                            alt={book.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Icon name="image" size={48} />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    {book.status !== 'completed' && (
                                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                            {book.status === 'generating' && <Icon name="sync" className="animate-spin" size={12} />}
                                            <span className="capitalize">{book.status}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {book.title}
                                    </h3>
                                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                                        <span>{book.pages?.length || 0} pages</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
