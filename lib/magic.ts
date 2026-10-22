'use client'

/**
 * Little bits of magic any screen can ask for, without owning the sky.
 *
 * The flying things live in one layer for the whole app (components/MagicLayer),
 * mounted once in the root layout so the butterflies keep flying from one
 * screen to the next instead of starting over. Screens talk to it through
 * these helpers, which touch the DOM directly and never React state: a burst
 * of sparkles is a handful of spans that remove themselves when they finish.
 */

export const LS_MAGIC = 'kinderquill_magic'

/** Off when the device asks for less motion, or a parent turned it off. */
export function magicAllowed(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try { return localStorage.getItem(LS_MAGIC) !== 'off' } catch { return true }
}

export function setMagicEnabled(on: boolean) {
  try { localStorage.setItem(LS_MAGIC, on ? 'on' : 'off') } catch { /* private browsing */ }
  window.dispatchEvent(new Event('kq-magic-change'))
}

/**
 * How busy the sky is. 'calm' while browsing and reading; 'celebrate' while a
 * book is being made, when there is nothing to read and the waiting should feel
 * like something is happening. Returns an undo for use in an effect cleanup.
 */
export function setMagicLevel(level: 'calm' | 'celebrate'): () => void {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const before = root.dataset.magic
  root.dataset.magic = level
  return () => {
    if (before) root.dataset.magic = before
    else delete root.dataset.magic
  }
}

const COLOURS = ['var(--kq-amber)', 'var(--kq-cream)', 'var(--kq-text)', 'var(--kq-sky)', 'var(--kq-coral)']

let lastBurst = 0

/**
 * A puff of sparkles at a point on the screen: a tap, a page turning, a book
 * arriving. Fourteen at most, each a span animated with transform and opacity
 * and removed when its animation ends.
 */
export function magicBurst(x: number, y: number, opts: { count?: number; spread?: number; big?: boolean } = {}) {
  if (!magicAllowed()) return
  const now = performance.now()
  if (!opts.big && now - lastBurst < 90) return
  lastBurst = now
  const host = document.getElementById('kq-magic-bursts')
  if (!host) return
  const count = Math.min(opts.count ?? 9, 14)
  const spread = opts.spread ?? 46
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span')
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6
    const dist = spread * (0.55 + Math.random() * 0.75)
    const size = (opts.big ? 7 : 5) + Math.random() * 5
    s.className = Math.random() < 0.45 ? 'kq-spark kq-spark-star' : 'kq-spark'
    s.style.left = `${x}px`
    s.style.top = `${y}px`
    s.style.width = `${size}px`
    s.style.height = `${size}px`
    s.style.setProperty('--tx', `${Math.cos(angle) * dist}px`)
    s.style.setProperty('--ty', `${Math.sin(angle) * dist - 14}px`)
    s.style.setProperty('--c', COLOURS[i % COLOURS.length])
    s.style.animationDelay = `${Math.random() * 60}ms`
    s.addEventListener('animationend', () => s.remove(), { once: true })
    host.appendChild(s)
  }
}

/** A burst from the middle of an element, for "this just happened here". */
export function magicBurstAt(el: Element | null, opts?: { count?: number; spread?: number; big?: boolean }) {
  if (!el) return
  const r = el.getBoundingClientRect()
  magicBurst(r.left + r.width / 2, r.top + r.height / 2, opts)
}

/** The big one: sparkles across the screen, for a finished book. */
export function magicShower() {
  if (!magicAllowed()) return
  const w = window.innerWidth
  const h = window.innerHeight
  for (let i = 0; i < 5; i++) {
    setTimeout(() => magicBurst(w * (0.15 + 0.175 * i), h * (0.3 + 0.25 * Math.sin(i)), { count: 12, spread: 80, big: true }), i * 140)
  }
}
