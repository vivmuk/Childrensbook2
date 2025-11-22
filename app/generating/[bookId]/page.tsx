'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'

export default function GeneratingPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  useEffect(() => {
    // Poll for book completion
    const checkBookStatus = async () => {
      try {
        const response = await fetch(`/api/book-status/${bookId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'completed') {
            router.push(`/book/${bookId}`)
          }
        }
      } catch (error) {
        console.error('Error checking book status:', error)
      }
    }

    const interval = setInterval(checkBookStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, router])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Header with Home Icon */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => router.push('/')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-700 backdrop-blur-md transition-colors shadow-md"
          title="Home"
        >
          <Icon name="home" className="text-purple-700 dark:text-purple-300" size={24} />
        </button>
      </div>

      {/* Progress Bar at Top */}
      <div className="w-full max-w-md rounded-2xl bg-white/80 dark:bg-gray-800/80 p-4 shadow-xl backdrop-blur-md mt-16 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
              Stirring up your story...
            </p>
            <Icon name="sync" className="animate-spin text-blue-500" size={20} />
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" style={{ width: '75%' }} />
          </div>
        </div>
      </div>

      <div className="mt-4 w-full max-w-md text-center mb-6">
        <h2 className="font-display text-4xl font-bold text-gray-800 dark:text-gray-100 sm:text-5xl mb-2">
          Mixing the magic...
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg">Creating your storybook</p>
      </div>

      <div className="flex-1 flex items-center justify-center w-full py-8">
        <GeneratingGame />
      </div>

      {/* Footer - Created with Venice.ai */}
      <footer className="w-full py-3 text-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-white/30 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div>
  )
}

