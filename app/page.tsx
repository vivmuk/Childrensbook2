'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FeaturedBooksCarousel } from '@/components/FeaturedBooksCarousel'
import { HowItWorksModal } from '@/components/HowItWorksModal'
import NightLightBookScene from '@/components/NightLightBookScene'
import BottomBar from '@/components/BottomBar'
import { getStyle } from '@/lib/illustration-style'

// A fresh story prompt every day (rotates by day-of-year, same for everyone).
const DAILY_PROMPTS = [
  'A sleepy little dragon who collects falling stars in a jar',
  'A brave snail who enters the great garden race',
  'A lighthouse keeper’s cat who guides lost ships home',
  'A girl who discovers her crayons can paint real weather',
  'A robot gardener who teaches flowers to sing',
  'Twin otters who build a boat to find the end of the river',
  'A shy cloud who is afraid to rain on the thirsty meadow',
  'A boy and his grandmother who bake a moon-shaped cake to the sky',
  'A firefly who lights the way for a lost baby owl',
  'A penguin chef who opens the coziest café in Antarctica',
  'A kite who dreams of touching the tallest mountain',
  'A tiny mouse librarian who guards a book of forgotten lullabies',
  'A young inventor who builds wings out of autumn leaves',
  'A whale who hums the ocean to sleep every night',
]

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000)
}

const LS_STREAK = 'kinderquill_streak'
/** Where they stopped reading, per book. Written by the reading screen. */
const LS_LAST = 'kinderquill_last_read'

interface StoredBook {
  id: string
  title: string
  ageRange?: string
  illustrationStyle?: string
  createdAt?: string
  titlePageImage?: string | null
  expectedPages?: number
}

interface LastRead {
  page: number
  total: number
}

/**
 * The home screen is a STAGE, not a landing page.
 *
 * A parent opening this at bedtime should see the book they are in the middle
 * of, filling the glass, with one warm button under it. The promise, the three
 * steps and the samples still exist, but they live below the fold: someone who
 * already has a book does not need to be sold the product again, and someone
 * who does not yet have one gets the promise instead.
 */
export default function WelcomePage() {
  const router = useRouter()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [streak, setStreak] = useState(0)
  const [motionOk, setMotionOk] = useState(false)
  // Defaults to portrait: the person holding this app is usually holding a
  // phone, and we would rather not flash the wrong crop at them on load.
  const [portrait, setPortrait] = useState(true)
  const [books, setBooks] = useState<StoredBook[]>([])
  const [last, setLast] = useState<LastRead | null>(null)
  // With an empty shelf the promise still needs a painting behind it, and a
  // sample book is a truer picture of the product than a generic hero.
  const [sampleCover, setSampleCover] = useState<string | null>(null)

  const today = new Date()
  const dailyPrompt = DAILY_PROMPTS[dayOfYear(today) % DAILY_PROMPTS.length]

  // The newest book that actually has a painted cover. A book that is still
  // being painted has no cover yet, and an empty stage is worse than no stage.
  const featured = useMemo(
    () => books.find((b) => !!b.titlePageImage) || null,
    [books],
  )

  const styleLabel = useMemo(
    () => (featured?.illustrationStyle ? getStyle(featured.illustrationStyle).label : ''),
    [featured],
  )

  // Track a simple daily visit streak to encourage a reading habit.
  useEffect(() => {
    try {
      const todayKey = today.toDateString()
      const yesterday = new Date(today.getTime() - 86_400_000).toDateString()
      const raw = localStorage.getItem(LS_STREAK)
      const data = raw ? JSON.parse(raw) : { last: '', count: 0 }
      let count = data.count || 0
      if (data.last === todayKey) {
        count = count || 1
      } else if (data.last === yesterday) {
        count = count + 1
      } else {
        count = 1
      }
      localStorage.setItem(LS_STREAK, JSON.stringify({ last: todayKey, count }))
      setStreak(count)
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A moving background is a request we do not have to grant. If the device
  // asks for less motion, the painted still stays and the film never plays.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setMotionOk(!mq.matches)
    const on = () => setMotionOk(!mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Phones get the tall painting, wider screens get the wide one, so neither
  // is a bad crop of the other.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    setPortrait(mq.matches)
    const on = () => setPortrait(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // What is on the shelf. Summaries only, so this stays a small request.
  useEffect(() => {
    let alive = true
    fetch('/api/my-books')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setBooks(Array.isArray(d?.books) ? d.books : [])
      })
      .catch(() => { /* an empty shelf is a fine state to be in */ })
    return () => { alive = false }
  }, [])

  // Nothing on the shelf yet: borrow a finished book for the stage art.
  useEffect(() => {
    if (books.length > 0) return
    let alive = true
    fetch('/api/sample-books')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        const cover = d?.books?.[0]?.titlePage?.image
        if (typeof cover === 'string') setSampleCover(cover)
      })
      .catch(() => { /* the painted hero is a fine fallback */ })
    return () => { alive = false }
  }, [books.length])

  // Where they stopped, if they have ever stopped. No stored position means we
  // say nothing rather than inventing a page number.
  useEffect(() => {
    if (!featured) return
    try {
      const raw = localStorage.getItem(LS_LAST)
      const all = raw ? JSON.parse(raw) : {}
      const mine = all?.[featured.id]
      if (mine && typeof mine.page === 'number' && typeof mine.total === 'number') {
        setLast({ page: mine.page, total: mine.total })
      } else {
        setLast(null)
      }
    } catch { /* ignore */ }
  }, [featured])

  const canContinue = !!(last && last.total > 1 && last.page > 0 && last.page < last.total)

  return (
    <div className="kq-has-tabbar relative min-h-[100dvh] w-full overflow-x-hidden bg-kq-ink">
      {/* The stage: the book they are in, filling the glass */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden">
        {featured?.titlePageImage ? (
          /* Their own painted cover. This is the point of the screen. */
          <img
            src={featured.titlePageImage}
            alt=""
            aria-hidden="true"
            className="kq-hero-media"
            style={{ objectPosition: 'center 20%' }}
          />
        ) : sampleCover ? (
          <img
            src={sampleCover}
            alt=""
            aria-hidden="true"
            className="kq-hero-media"
            style={{ objectPosition: 'center 20%' }}
          />
        ) : (
          <>
            <img
              src={portrait ? '/art/hero-tall.png' : '/art/hero-wide.png'}
              alt=""
              aria-hidden="true"
              className="kq-hero-media"
              style={{ objectPosition: portrait ? 'center 45%' : '74% center' }}
            />
            {motionOk && (
              <video
                key={portrait ? 'tall' : 'wide'}
                className="kq-hero-media"
                poster={portrait ? '/art/hero-tall.png' : '/art/hero-wide.png'}
                style={{ objectPosition: portrait ? 'center 45%' : '74% center' }}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              >
                <source
                  src={portrait ? '/art/hero-loop-tall.mp4' : '/art/hero-loop.mp4'}
                  type="video/mp4"
                />
              </video>
            )}
          </>
        )}

        {/* One scrim, not two: stacking the old top scrim on this one turned the
            top third of the painting black and the hero read as a small picture
            in a void. This one stays light up top and goes solid before the
            first line of type, so the title never lands on the painted subject. */}
        <div className="kq-stage-scrim absolute inset-0 z-[2]" aria-hidden="true" />

        <div
          className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-content flex-col px-5 py-6 lg:px-10"
          style={{ paddingBottom: 'calc(104px + env(safe-area-inset-bottom))' }}
        >
          {/* Top bar */}
          <header className="flex items-center justify-between">
            <span className="font-display text-2xl font-semibold tracking-tight text-kq-text">
              KinderQuill
            </span>
            {streak > 0 && (
              <div
                className="hidden items-center gap-1 whitespace-nowrap rounded-md border border-kq-line px-3 py-1.5 text-xs text-kq-dim sm:flex"
                title={`You have visited ${streak} day${streak === 1 ? '' : 's'} in a row`}
              >
                {streak} day{streak === 1 ? '' : 's'} reading
              </div>
            )}
          </header>

          <div className="flex-1" />

          {/* What is on the stage, and the one thing to do about it */}
          <div className="mx-auto w-full max-w-md">
            {featured ? (
              <>
                {canContinue && (
                  <div className="mb-3">
                    <p className="mb-2 text-[0.82rem] text-kq-amber">
                      You left off on page {last!.page}
                    </p>
                    <div className="kq-progress-line w-40">
                      <i style={{ width: `${Math.round((last!.page / last!.total) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <div className="kq-eyebrow mb-2">
                  {canContinue ? 'Tonight’s book' : 'Your newest book'}
                </div>
                <h1 className="font-display text-[2.1rem] leading-[1.08] text-kq-text">
                  {featured.title}
                </h1>
                <p className="mt-2.5 text-sm text-kq-text-soft">
                  {[
                    featured.expectedPages ? `${featured.expectedPages} pages` : null,
                    styleLabel ? `Painted in ${styleLabel}` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
                <button
                  onClick={() => router.push(`/book/${featured.id}`)}
                  className="kq-btn-primary mt-5 text-lg"
                >
                  {canContinue ? 'Read together' : 'Open this book'}
                </button>
                <button
                  onClick={() => router.push('/generate')}
                  className="kq-btn-secondary mt-3 text-sm"
                >
                  Make a new book
                </button>
              </>
            ) : (
              <>
                <h1 className="kq-hero-title text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[4.2rem]">
                  Make a picture book tonight
                </h1>
                <p className="mt-4 max-w-md text-base leading-relaxed text-kq-text-soft lg:text-lg">
                  Say what the story is about. Every page is painted fresh for you.
                </p>
                <button
                  onClick={() => router.push('/generate')}
                  className="kq-btn-primary mt-6 text-lg"
                >
                  Make your first book
                </button>
                {sampleCover && (
                  <button
                    onClick={() => router.push('/gallery')}
                    className="kq-btn-secondary mt-3 text-sm"
                  >
                    Read a finished one
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ Below the fold: still there, out of the way ══════════ */}
      <div className="kq-ground relative">
        <div className="mx-auto w-full max-w-content px-5 py-14 lg:px-10 lg:py-20">
          {/* Story of the day */}
          <button
            onClick={() => router.push(`/generate?idea=${encodeURIComponent(dailyPrompt)}`)}
            className="kq-card mb-12 w-full text-left transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="kq-eyebrow mb-2">Story of the day</div>
                <p className="font-display text-lg leading-snug text-kq-text lg:text-xl">
                  {dailyPrompt}
                </p>
                <p className="mt-1.5 text-sm text-kq-dim">Start from this one tonight</p>
              </div>
              <span className="shrink-0 font-display text-2xl text-kq-amber">→</span>
            </div>
          </button>

          {/* How it works, as three real steps */}
          <div className="mb-14 grid gap-6 sm:grid-cols-3">
            <div>
              <div className="kq-eyebrow mb-2">One</div>
              <h3 className="mb-2 font-display text-xl text-kq-text">Say the idea</h3>
              <p className="text-sm leading-relaxed text-kq-dim">
                One sentence is enough. Who is it about, and what happens?
              </p>
            </div>
            <div>
              <div className="kq-eyebrow mb-2">Two</div>
              <h3 className="mb-2 font-display text-xl text-kq-text">We paint it</h3>
              <p className="text-sm leading-relaxed text-kq-dim">
                Every page is illustrated and written. You can close the app and
                come back, the book keeps being made.
              </p>
            </div>
            <div>
              <div className="kq-eyebrow mb-2">Three</div>
              <h3 className="mb-2 font-display text-xl text-kq-text">Read it together</h3>
              <p className="text-sm leading-relaxed text-kq-dim">
                Read it aloud, or let it read to you. Save it in your library.
              </p>
            </div>
          </div>

          {/* ══════════ The night scene: a real 3D book, painted pages ══════════ */}
          <section className="relative mb-16 overflow-hidden rounded-xl border border-kq-line-soft bg-kq-ink">
            <div className="kq-stars-bg absolute inset-0" />
            <div className="relative z-10 px-6 pb-0 pt-10 text-center">
              <div className="kq-eyebrow mb-3">Painted live</div>
              <h2 className="mx-auto max-w-lg font-display text-2xl leading-snug text-kq-text lg:text-3xl">
                Every page is illustrated, never repeated
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-kq-dim">
                Two books never come out the same. Your story is painted page by page,
                and you can close the app while it works.
              </p>
            </div>
            <NightLightBookScene className="relative z-[1] h-[380px] w-full sm:h-[460px] lg:h-[520px]" />
          </section>

          {/* Sample books */}
          <div className="mb-14">
            <h2 className="mb-4 font-display text-2xl text-kq-text lg:text-3xl">
              Books made here
            </h2>
            <FeaturedBooksCarousel />
          </div>

          {/* The other rooms, kept but quiet */}
          <div className="mb-10">
            <div className="kq-eyebrow mb-3">More to do</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => router.push('/ai-stories')} className="kq-btn-secondary text-sm">
                Write a story
              </button>
              <button onClick={() => router.push('/video-studio')} className="kq-btn-secondary text-sm">
                Animate a picture
              </button>
              <button onClick={() => router.push('/parent')} className="kq-btn-secondary text-sm">
                Parent settings
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowHowItWorks(true)}
            className="text-sm text-kq-dim underline decoration-kq-line underline-offset-4 transition-colors hover:text-kq-text"
          >
            How does it work?
          </button>
        </div>

        <footer className="border-t border-kq-line-soft px-5 py-6 text-center lg:px-10">
          <p className="text-xs text-kq-dim">
            Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
          </p>
        </footer>
      </div>

      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <BottomBar active="read" />
    </div>
  )
}
