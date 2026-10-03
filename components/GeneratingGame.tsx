'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/Icons'

/**
 * What the reader sees while their book is being made.
 *
 * This replaced an arcade snake game. A waiting screen in this world should be
 * calm: it says what is happening, how long it is likely to take, and gives a
 * child something quiet to do with their hands. So there is a dusk sky with
 * stars to tap, a plain progress bar, the four steps of the work, and a note
 * about how the book is made.
 *
 * House rules it obeys (see DESIGN.md):
 *   - motion is transform and opacity only, and collapses when the device asks
 *     for reduced motion
 *   - no emoji, no pills, no raw hex, no glows or drop shadows
 *   - colour comes from the kq tokens
 *   - the one real amber action on this screen is the progress fill
 */

interface GeneratingGameProps {
  progress?: number
}

// The four things the machine does, in order. The progress value walks down
// this list.
const STEPS = [
  { icon: 'spark', label: 'Finding the idea' },
  { icon: 'auto_stories', label: 'Writing the words' },
  { icon: 'palette', label: 'Painting the pages' },
  { icon: 'book', label: 'Binding the book' },
]

// Short true notes about how the book is made, rotated while the reader waits.
const NOTES = [
  'The model writing your story has read a great many children\'s books.',
  'It learns from examples, the same way you do at school.',
  'Every page is painted fresh. No two books come out the same.',
  'A language model writes by choosing the next word, then the next.',
  'AI finds patterns in text and pictures. It does not think or feel.',
  'The first AI program was written in 1956.',
  'Pictures take longer than words, which is why the last pages are slow.',
  'Your story stays yours. KinderQuill does not publish it for you.',
]

// Fixed star positions, in per cent of the sky. A table rather than random
// numbers, so the server and the browser draw exactly the same sky and React
// never complains about a mismatch.
const STARS = [
  { x: 6,  y: 16, size: 7, delay: '0s' },
  { x: 21, y: 52, size: 5, delay: '0.5s' },
  { x: 35, y: 24, size: 6, delay: '1.1s' },
  { x: 50, y: 66, size: 5, delay: '1.6s' },
  { x: 63, y: 20, size: 7, delay: '0.8s' },
  { x: 79, y: 48, size: 5, delay: '0.2s' },
  { x: 90, y: 74, size: 6, delay: '1.3s' },
]

export function GeneratingGame({ progress = 0 }: GeneratingGameProps) {
  const [noteIdx, setNoteIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [stuckSec, setStuckSec] = useState(0)
  const [lit, setLit] = useState<boolean[]>(() => STARS.map(() => false))
  const [motionOk, setMotionOk] = useState(false)

  // A clock for "still working" reassurance and for the plain elapsed time.
  // The seconds since the progress value last moved are the useful signal: if
  // the bar sits still for a while, the reader deserves to be told the work is
  // continuing.
  const lastProgressRef = useRef(progress)
  useEffect(() => {
    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress
      setStuckSec(0)
    }
  }, [progress])

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(s => s + 1)
      setStuckSec(s => (progress === lastProgressRef.current ? s + 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [progress])

  // A calm sky is a request we do not have to grant. If the device asks for
  // less motion, the stars hold still.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setMotionOk(!mq.matches)
    const on = () => setMotionOk(!mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Rotate the notes while the reader waits. Slower than a screenful, so it
  // never feels like a slideshow.
  useEffect(() => {
    const t = setInterval(() => setNoteIdx(i => (i + 1) % NOTES.length), 9000)
    return () => clearInterval(t)
  }, [])

  const lightStar = (i: number) =>
    setLit(prev => (prev[i] ? prev : prev.map((v, j) => (j === i ? true : v))))

  const litCount = lit.filter(Boolean).length
  const allLit = litCount === STARS.length

  const stepIdx = Math.min(Math.floor(progress / 25), STEPS.length - 1)
  const pct = Math.max(0, Math.min(100, progress))

  // Plain estimate lines. No dashes, no invented precision.
  const timeMsg = () => {
    if (progress < 5) return 'Starting up'
    if (progress < 15) {
      if (stuckSec >= 20) return 'Still working. The model is thinking about your story.'
      return 'About 2 to 3 minutes left'
    }
    if (progress < 25) return 'The words are written. Now the pictures.'
    if (progress < 55) {
      if (stuckSec >= 25) return 'Still painting. Each page takes a little time.'
      return 'About 1 to 2 minutes left'
    }
    if (progress < 80) {
      if (stuckSec >= 20) return 'Nearly there. The last pages are drying.'
      return 'Painting the last few pages'
    }
    if (progress < 95) return 'Almost done. About 30 seconds left'
    return 'Finishing the cover'
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const elapsedLabel = mins > 0 ? `${mins} min ${secs} s` : `${secs} s`

  return (
    <div className="mx-auto w-full max-w-md">

      {/* ── Heading: what the screen is doing ────────────────────────── */}
      <div className="mb-4 text-center">
        <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-kq-dim">
          Working at the lamp
        </div>
        <h2 className="font-display text-xl text-kq-text">Making your book</h2>
      </div>

      <div className="rounded-xl border border-kq-line bg-kq-card p-4">

        {/* ── Progress ─────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-xs text-kq-dim">{timeMsg()}</span>
            <span className="font-display text-sm text-kq-text">{pct}%</span>
          </div>
          <div
            className="kq-progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Book progress"
          >
            {/* The fill is scaled, never resized, so the bar animates on the
                compositor and the phone stays cool. */}
            <div
              className="kq-progress-fill"
              style={{ transform: `scaleX(${Math.max(pct, 2) / 100})` }}
            />
          </div>
          <p className="mt-2 text-xs text-kq-dim">
            Working for {elapsedLabel}. You can close the app. The book keeps being made.
          </p>
        </div>

        {/* ── The four steps ───────────────────────────────────────────── */}
        <ol className="mb-4 grid grid-cols-2 gap-2">
          {STEPS.map((s, i) => {
            const done = i < stepIdx
            const now = i === stepIdx
            return (
              <li
                key={s.label}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-2 ${
                  now
                    ? 'border-kq-amber/40 bg-kq-amber/10'
                    : done
                      ? 'border-kq-line bg-kq-text/5'
                      : 'border-kq-line'
                }`}
              >
                <Icon
                  name={s.icon}
                  size={16}
                  className={now ? 'text-kq-amber' : done ? 'text-kq-text' : 'text-kq-dim'}
                />
                <span className={`text-xs ${now ? 'text-kq-cream' : 'text-kq-dim'}`}>
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>

        {/* ── The sky: something quiet to do with your hands ───────────── */}
        <div className="relative h-40 w-full overflow-hidden rounded-lg border border-kq-line bg-gradient-to-b from-kq-navy to-kq-plum">
          {STARS.map((s, i) => (
            <button
              key={s.x}
              type="button"
              onClick={() => lightStar(i)}
              aria-label={lit[i] ? 'A lit star' : 'Light this star'}
              className={`absolute rounded-[2px] transition-colors duration-300 ${
                lit[i] ? 'bg-kq-amber' : 'bg-kq-text/30 hover:bg-kq-text/60'
              } ${!lit[i] && motionOk ? 'animate-twinkle' : ''}`}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                animationDelay: s.delay,
              }}
            />
          ))}
          <p className="absolute inset-x-3 bottom-2 text-center text-xs text-kq-dim">
            {allLit
              ? 'The whole sky is lit. Your book is nearly ready.'
              : `Tap a star to light it. ${litCount} of ${STARS.length} lit.`}
          </p>
        </div>

        {/* ── A note about how the book is made ────────────────────────── */}
        <div className="mt-3 flex items-start gap-2 rounded-md border border-kq-line px-3 py-2.5">
          <Icon name="auto_awesome" size={16} className="mt-0.5 shrink-0 text-kq-dim" />
          <p className="text-xs leading-relaxed text-kq-dim">{NOTES[noteIdx]}</p>
        </div>

        {/* ── Reassurance when the bar has not moved for a while ───────── */}
        {stuckSec >= 15 && (
          <p className="mt-3 text-center text-xs text-kq-dim">
            Still going. Long stories and pictures can take a few minutes.
          </p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-kq-dim">
        Story and illustrations are made together, page by page.
      </p>
    </div>
  )
}
