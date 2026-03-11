'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'

export default function GeneratingPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/book-status/${bookId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'completed') {
          router.push(`/book/${bookId}`)
        } else if (data.status === 'generating') {
          setProgress(Math.min(95, data.progress || 0))
        } else if (data.status === 'error') {
          setErrorMsg('Something went wrong. Please go back and try again.')
        }
      } catch {
        // ignore transient errors
      }
    }

    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, router])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 font-display">

      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-b border-white/30 dark:border-gray-700">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/80 hover:bg-white dark:bg-gray-700/80 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm text-gray-700 dark:text-gray-200 font-medium"
        >
          <Icon name="home" size={18} className="text-purple-600 dark:text-purple-400" />
          <span className="hidden sm:inline">Home</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100">
            ✨ Creating Your Story
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI magic is at work!
          </p>
        </div>

        {/* Spacer */}
        <div className="w-16" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-6 gap-4">
        {errorMsg ? (
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-3">😔</div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Oops!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{errorMsg}</p>
            <button
              onClick={() => router.push('/generate')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-md"
            >
              Try Again
            </button>
          </div>
        ) : (
          <GeneratingGame progress={progress} />
        )}
      </div>

      <footer className="w-full py-3 text-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-white/30 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div>
  )
}
