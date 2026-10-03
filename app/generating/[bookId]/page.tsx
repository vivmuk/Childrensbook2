'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'

/**
 * The waiting screen. A parent lands here the moment a book starts and stays
 * for a minute or two, so it is a room they sit in, not a spinner: the night
 * ground, one quiet line of type, and the making-of screen underneath.
 *
 * The old shell here was still the bright purple and pink design (rounded-full
 * buttons, emoji, grey Tailwind colours) wrapped around the new night screen,
 * which is why the two never looked like the same app.
 */
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
    <div className="kq-ground kq-stars-bg flex min-h-[100dvh] w-full flex-col">
      <div className="kq-top-bar">
        <button
          onClick={() => router.push('/')}
          className="kq-icon-btn"
          aria-label="Back to the home screen"
        >
          <Icon name="home" size={18} />
        </button>

        <div className="min-w-0 flex-1 px-3 text-center">
          <span className="block truncate font-display text-lg text-kq-text">
            Painting your book
          </span>
        </div>

        {/* Balances the home button so the title stays centred */}
        <span className="kq-icon-btn pointer-events-none opacity-0" aria-hidden="true" />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8">
        {errorMsg ? (
          <div className="kq-card w-full max-w-sm p-7 text-center">
            <h2 className="font-display text-2xl text-kq-text">That did not work</h2>
            <p className="mt-2 text-sm leading-relaxed text-kq-dim">{errorMsg}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push('/generate')}
                className="kq-btn-primary"
              >
                Try again
              </button>
              <button
                onClick={() => router.push('/library')}
                className="kq-btn-secondary"
              >
                Back to my bookshelf
              </button>
            </div>
          </div>
        ) : (
          <GeneratingGame progress={progress} />
        )}
      </main>

      <footer className="px-4 pb-6 text-center">
        <p className="text-xs text-kq-dim">Painted with Venice.ai. Your ideas stay yours.</p>
      </footer>
    </div>
  )
}
