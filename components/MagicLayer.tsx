'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LS_MAGIC, magicAllowed, magicBurst } from '@/lib/magic'

/* ════════════════════════════════════════════════════════════════════════
   The magic in the air.

   One fixed layer over the whole app, mounted once in the root layout:

     - fairy dust: tiny specks of lamp light drifting up and twinkling
     - butterflies: painted ones, flapping, wandering slow loops across the glass
     - fireflies: warm dots that wander and pulse
     - a shooting star, now and then
     - sparkles wherever a child taps

   While a book is being made the sky gets busier (more of everything) and
   calms again when the book opens. Rules this keeps, from DESIGN.md:

     - transform and opacity only, all in CSS keyframes; no animation loop,
       and nothing here touches React state while it flies
     - never in the way: pointer-events are off, and it sits under every
       dialog and sheet
     - gone completely under prefers-reduced-motion, when a parent turns it
       off, when the tab is hidden, and on paper
     - every position comes from a fixed table, so the server and the browser
       draw the same sky and nothing jumps when the page hydrates
   ════════════════════════════════════════════════════════════════════════ */

/** Fairy dust: left %, size px, rise seconds, delay seconds, sideways drift vw. Later rows are the celebrate extras. */
const DUST: [number, number, number, number, number][] = [
  [4, 3, 19, 0, 4], [11, 2, 23, 6, -3], [18, 4, 17, 11, 5], [26, 2, 25, 3, -4],
  [33, 3, 21, 14, 3], [41, 2, 18, 8, -5], [49, 4, 24, 1, 4], [57, 2, 20, 12, -3],
  [64, 3, 22, 5, 5], [71, 2, 19, 16, -4], [79, 4, 26, 9, 3], [86, 2, 18, 2, -5],
  [93, 3, 23, 13, 4], [97, 2, 21, 7, -3],
  [7, 3, 12, 1, 6], [15, 4, 14, 4, -6], [23, 3, 11, 7, 5], [30, 4, 13, 2, -5],
  [38, 3, 12, 9, 6], [45, 5, 15, 5, -4], [53, 3, 11, 3, 5], [60, 4, 13, 8, -6],
  [68, 3, 12, 6, 4], [75, 5, 14, 0, -5], [83, 3, 11, 10, 6], [90, 4, 13, 4, -4],
]
const CALM_DUST = 14

/** Butterflies: colour pair, size, seconds per lap, delay, and a five-point loop in vw/vh. */
interface Flight { wing: string; inner: string; size: number; dur: number; delay: number; path: [number, number][] }
const BUTTERFLIES: Flight[] = [
  { wing: 'var(--kq-amber)', inner: 'var(--kq-cream)', size: 46, dur: 46, delay: 0,
    path: [[-8, 72], [22, 48], [48, 62], [78, 30], [108, 18]] },
  { wing: 'var(--kq-sky)', inner: 'var(--kq-text)', size: 38, dur: 58, delay: 17,
    path: [[108, 64], [80, 82], [54, 44], [26, 26], [-8, 40]] },
  { wing: 'var(--kq-coral)', inner: 'var(--kq-cream)', size: 36, dur: 64, delay: 33,
    path: [[30, 108], [14, 70], [40, 38], [70, 54], [92, -8]] },
  { wing: 'var(--kq-purple)', inner: 'var(--kq-cream)', size: 42, dur: 38, delay: 4,
    path: [[-8, 30], [20, 16], [46, 34], [70, 12], [108, 40]] },
  { wing: 'var(--kq-mint)', inner: 'var(--kq-text)', size: 34, dur: 42, delay: 12,
    path: [[108, 86], [76, 70], [58, 88], [30, 60], [-8, 76]] },
  { wing: 'var(--kq-amber)', inner: 'var(--kq-text)', size: 40, dur: 50, delay: 24,
    path: [[60, 108], [76, 72], [50, 56], [20, 70], [-8, 44]] },
]
const CALM_BUTTERFLIES = 3

/** Fireflies: left %, top %, wander seconds, delay. */
const FIREFLIES: [number, number, number, number][] = [
  [8, 78, 9, 0], [86, 70, 11, 2], [62, 88, 10, 4], [24, 22, 12, 1], [92, 24, 8, 3],
  [40, 70, 9, 5], [14, 48, 11, 2.5], [74, 44, 10, 6],
]
const CALM_FIREFLIES = 4

/** Screens with nothing flying: the print preview prints. */
const QUIET_ROUTES = [/^\/pdf\//]

function Butterfly({ f, extra }: { f: Flight; extra: boolean }) {
  const vars: Record<string, string> = {}
  f.path.forEach(([x, y], i) => { vars[`--p${i}x`] = `${x}vw`; vars[`--p${i}y`] = `${y}vh` })
  return (
    <div
      className={`kq-bfly ${extra ? 'kq-magic-extra' : ''}`}
      style={{ ...vars, animationDuration: `${f.dur}s`, animationDelay: `-${f.delay}s` } as React.CSSProperties}
    >
      <svg width={f.size} height={f.size} viewBox="0 0 40 40" aria-hidden="true" className="kq-bfly-bob">
        {/* Each wing is its own group so it can fold toward the body. */}
        <g className="kq-bfly-wing kq-bfly-left">
          <path d="M19 19C15 9 6 5 3.5 9.5 1.5 13.5 6 19 13 20.5 7 22 4.5 27.5 7.5 30.5 11 33.5 16.5 27 19 21Z" fill={f.wing} />
          <path d="M17 18c-3-5.5-7.5-8-9.5-6.5-1.5 1.5 1.5 5 6.5 6.8" fill={f.inner} opacity="0.55" />
        </g>
        <g className="kq-bfly-wing kq-bfly-right">
          <path d="M21 19c4-10 13-14 15.5-9.5 2 4-2.5 9.5-9.5 11 6 1.5 8.5 7 5.5 10-3.5 3-9-3.5-11.5-9.5Z" fill={f.wing} />
          <path d="M23 18c3-5.5 7.5-8 9.5-6.5 1.5 1.5-1.5 5-6.5 6.8" fill={f.inner} opacity="0.55" />
        </g>
        <path d="M20 13c.9 0 1.3 1 1.3 2.6v9c0 2-.5 3.4-1.3 3.4s-1.3-1.4-1.3-3.4v-9c0-1.6.4-2.6 1.3-2.6Z" fill="var(--kq-ink)" opacity="0.75" />
        <path d="M19.4 13.4c-.6-2-1.8-3.6-3.2-4.4M20.6 13.4c.6-2 1.8-3.6 3.2-4.4" stroke="var(--kq-ink)" strokeOpacity="0.6" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function MagicLayer() {
  const pathname = usePathname()
  // Rendered only once we know motion is welcome, so a reduced-motion device
  // never even mounts the sky.
  const [on, setOn] = useState(false)

  useEffect(() => {
    const check = () => setOn(magicAllowed())
    check()
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.addEventListener('change', check)
    window.addEventListener('kq-magic-change', check)
    const onStorage = (e: StorageEvent) => { if (e.key === LS_MAGIC) check() }
    window.addEventListener('storage', onStorage)
    return () => {
      mq.removeEventListener('change', check)
      window.removeEventListener('kq-magic-change', check)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Hold everything still while the tab is hidden.
  useEffect(() => {
    const onVis = () => { document.documentElement.dataset.magicPaused = document.hidden ? '1' : '' }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Sparkles wherever a child taps.
  useEffect(() => {
    if (!on) return
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      magicBurst(e.clientX, e.clientY)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [on])

  if (!on || QUIET_ROUTES.some(r => r.test(pathname || ''))) {
    return <div id="kq-magic-bursts" className="kq-magic-bursts" aria-hidden="true" />
  }

  return (
    <>
      <div className="kq-magic" aria-hidden="true">
        {DUST.map(([left, size, dur, delay, drift], i) => (
          <span
            key={`d${i}`}
            className={`kq-dust ${i >= CALM_DUST ? 'kq-magic-extra' : ''}`}
            style={{
              left: `${left}%`, width: size, height: size,
              animationDuration: `${dur}s, ${2.4 + (i % 4) * 0.7}s`,
              animationDelay: `-${delay}s, -${(i % 5) * 0.5}s`,
              ['--drift' as string]: `${drift}vw`,
            }}
          />
        ))}
        {FIREFLIES.map(([left, top, dur, delay], i) => (
          <span
            key={`f${i}`}
            className={`kq-firefly ${i >= CALM_FIREFLIES ? 'kq-magic-extra' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, animationDuration: `${dur}s, ${3 + (i % 3)}s`, animationDelay: `-${delay}s, -${delay / 2}s` }}
          />
        ))}
        {BUTTERFLIES.map((f, i) => <Butterfly key={`b${i}`} f={f} extra={i >= CALM_BUTTERFLIES} />)}
        <span className="kq-shooting-star" />
        <span className="kq-shooting-star kq-shooting-star-2 kq-magic-extra" />
      </div>
      <div id="kq-magic-bursts" className="kq-magic-bursts" aria-hidden="true" />
    </>
  )
}
