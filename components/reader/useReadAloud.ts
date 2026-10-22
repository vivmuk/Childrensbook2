'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { splitWords, wordAtFraction } from '@/lib/book-client'

/**
 * Read-aloud for one book.
 *
 * A real narrator voice from Venice is fetched page by page and cached on the
 * book, and the word being spoken is highlighted as the audio plays. If the
 * voice cannot be fetched (no key, no network) the browser's own speech is
 * used instead, which reports each word as it says it. Either way the child
 * hears the page and sees where the words are, and the page turns itself
 * when the voice stops.
 *
 * Nothing here runs in an animation frame loop: the highlight follows the
 * audio element's own timeupdate events, a few times a second.
 */

/** A tenth of a second of silence, used to unlock audio inside a tap. */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

interface Options {
  bookId: string
  /** The words for each position in the book; null for a position with nothing to read. */
  scripts: (string | null)[]
  /** Map a position to what the narrate route calls it. */
  routeFor: (position: number) => number | 'cover' | null
  narrator: string
  apiKey: string
  /** Cached narration already on the book, by position. */
  cached: (position: number) => string | undefined
  onFinished: (position: number) => void
}

export function useReadAloud(opts: Options) {
  const [isReading, setIsReading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [wordIndex, setWordIndex] = useState(-1)
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urls = useRef<Map<string, string>>(new Map())
  const pending = useRef<Map<string, Promise<string | null>>>(new Map())
  const optsRef = useRef(opts)
  optsRef.current = opts
  const runId = useRef(0)

  const keyFor = (position: number) => `${optsRef.current.narrator}:${position}:${optsRef.current.scripts[position] || ''}`

  /** The narration for a position, fetched once and shared by everyone who asks. */
  const fetchVoice = useCallback(async (position: number): Promise<string | null> => {
    const o = optsRef.current
    const key = keyFor(position)
    const known = urls.current.get(key) || o.cached(position)
    if (known) return known
    const route = o.routeFor(position)
    if (route === null || !o.scripts[position]) return null
    const inflight = pending.current.get(key)
    if (inflight) return inflight
    const p = fetch(`/api/book/${o.bookId}/narrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: route, narrator: o.narrator, userApiKey: o.apiKey || undefined }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const url: string | null = d?.url || null
        if (url) urls.current.set(key, url)
        return url
      })
      .catch(() => null)
      .finally(() => pending.current.delete(key))
    pending.current.set(key, p)
    return p
  }, [])

  const stopAll = useCallback(() => {
    runId.current++
    audioRef.current?.pause()
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setWordIndex(-1)
    setIsLoading(false)
  }, [])

  const stop = useCallback(() => {
    stopAll()
    setIsReading(false)
  }, [stopAll])

  /** Read one position aloud, then tell the page it is done. */
  const readPosition = useCallback(async (position: number) => {
    stopAll()
    const id = runId.current
    const text = optsRef.current.scripts[position]
    if (!text) {
      // A picture-only spread: give it a moment, then move on.
      setTimeout(() => { if (runId.current === id) optsRef.current.onFinished(position) }, 2200)
      return
    }
    const words = splitWords(text)
    setIsLoading(true)
    const url = await fetchVoice(position)
    if (runId.current !== id) return
    setIsLoading(false)

    // Warm the next page while this one plays.
    if (position + 1 < optsRef.current.scripts.length) void fetchVoice(position + 1)

    if (url) {
      setUsingBrowserVoice(false)
      if (!audioRef.current) audioRef.current = new Audio()
      const audio = audioRef.current
      audio.src = url
      audio.ontimeupdate = () => {
        if (runId.current !== id || !audio.duration) return
        setWordIndex(wordAtFraction(words, audio.currentTime / audio.duration))
      }
      audio.onended = () => {
        if (runId.current !== id) return
        setWordIndex(words.length)
        setTimeout(() => { if (runId.current === id) optsRef.current.onFinished(position) }, 700)
      }
      audio.play().catch(() => {
        // Autoplay was refused: hand the reading back to the button.
        if (runId.current === id) { setIsReading(false); setWordIndex(-1) }
      })
      return
    }

    // The browser's own voice, which reports each word as it is spoken.
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) { setIsReading(false); return }
    setUsingBrowserVoice(true)
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.92
    const starts: number[] = []
    let acc = 0
    for (const w of words) { starts.push(acc); acc += w.length }
    utter.onboundary = e => {
      if (runId.current !== id || e.name === 'sentence') return
      let i = starts.findIndex(s => s > e.charIndex)
      i = i === -1 ? words.length - 1 : Math.max(0, i - 1)
      setWordIndex(i)
    }
    utter.onend = () => {
      if (runId.current !== id) return
      setWordIndex(words.length)
      setTimeout(() => { if (runId.current === id) optsRef.current.onFinished(position) }, 700)
    }
    synth.speak(utter)
  }, [fetchVoice, stopAll])

  const start = useCallback((position: number) => {
    setIsReading(true)
    // Phones only let audio play from inside the tap itself, and the voice
    // arrives after a fetch. Playing a silent clip now unlocks the element so
    // the real voice can play when it lands.
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = SILENCE
    audioRef.current.play().catch(() => {})
    void readPosition(position)
  }, [readPosition])

  useEffect(() => () => stopAll(), [stopAll])

  return { isReading, isLoading, wordIndex, usingBrowserVoice, start, stop, readPosition, prefetch: fetchVoice }
}
