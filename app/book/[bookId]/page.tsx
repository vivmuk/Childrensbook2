'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { SongsSheet, type SongJob } from '@/components/reader/SongsSheet'
import { useReadAloud } from '@/components/reader/useReadAloud'
import { bookFileName, renderBookHTML } from '@/lib/book-export'
import { bookSongs, LS_NARRATOR, readApiKey, splitWords, type ClientBook, type ClientSong } from '@/lib/book-client'
import { NARRATORS, getNarrator } from '@/lib/narrators'

/* ════════════════════════════════════════════════════════════════════════
   The reader: a picture book you flip through.

   Each position is one page of the book: the cover (its title painted into
   the art), then the story pages, then The End. The whole picture is always
   shown, never cropped, on a warm paper page that turns from its spine.

   Swipe, the arrow keys, or the page edges turn the page. "Read to me" reads
   each page in a real narrator's voice, lights up each word as it is said,
   and turns the page when the voice stops. The storyboard strip along the
   bottom jumps anywhere. Songs, the studio and sharing are one tap away.
   ════════════════════════════════════════════════════════════════════════ */

const LS_DYSLEXIA = 'kinderquill_dyslexia_mode'
const LS_LAST_READ = 'kinderquill_last_read'
const TOOL = 'kq-btn-secondary !w-auto !px-3 !py-2 !text-xs'

type Position = { kind: 'cover' } | { kind: 'page'; index: number } | { kind: 'end' }

export default function BookViewerPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [book, setBook] = useState<ClientBook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [at, setAt] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [userApiKey, setUserApiKey] = useState('')
  const [narrator, setNarrator] = useState('heart')
  const [dyslexiaMode, setDyslexiaMode] = useState(false)
  const [sheet, setSheet] = useState<null | 'songs' | 'share' | 'voice'>(null)
  const [showStrip, setShowStrip] = useState(true)

  // Songs being composed, by kind
  const [songJobs, setSongJobs] = useState<Partial<Record<ClientSong['kind'], SongJob>>>({})
  const [musicOn, setMusicOn] = useState(false)
  const musicRef = useRef<HTMLAudioElement | null>(null)

  // Exports
  const [isMakingAudiobook, setIsMakingAudiobook] = useState(false)
  const [includeAudio, setIncludeAudio] = useState(true)

  // Animation of a single page (an advanced extra)
  const [pageVideos, setPageVideos] = useState<Record<string, string>>({})
  const [animating, setAnimating] = useState<{ key: string; queueId?: string; model?: string } | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/book/${bookId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => setBook(data))
      .catch(() => setBook(null))
      .finally(() => setIsLoading(false))
    setUserApiKey(readApiKey())
    try {
      if (localStorage.getItem(LS_DYSLEXIA) === '1') setDyslexiaMode(true)
      const n = localStorage.getItem(LS_NARRATOR)
      if (n) setNarrator(n)
    } catch { /* private browsing */ }
  }, [bookId])

  // The book's own narrator, unless the reader picked another.
  useEffect(() => {
    if (!book) return
    try { if (!localStorage.getItem(LS_NARRATOR) && book.narratorVoice) setNarrator(getNarrator(book.narratorVoice).value) } catch {}
  }, [book])

  const positions: Position[] = useMemo(() => {
    if (!book) return []
    return [
      ...(book.titlePage ? [{ kind: 'cover' } as Position] : []),
      ...book.pages.map((_, index) => ({ kind: 'page', index }) as Position),
      { kind: 'end' },
    ]
  }, [book])

  const total = positions.length
  const pos = positions[at]

  // Where they stopped, for the home screen's "you left off" line.
  useEffect(() => {
    if (!book || !total) return
    try {
      const raw = localStorage.getItem(LS_LAST_READ)
      const all = raw ? JSON.parse(raw) : {}
      all[bookId] = { page: Math.min(at + 1, total), total, at: Date.now() }
      localStorage.setItem(LS_LAST_READ, JSON.stringify(all))
    } catch { /* ignore */ }
  }, [book, bookId, at, total])

  const scripts = useMemo(
    () =>
      positions.map(p =>
        !book ? null
          : p.kind === 'cover' ? `${book.title}.${book.meta?.dedication ? ` ${book.meta.dedication}` : ''}`
          : p.kind === 'page' ? book.pages[p.index].text
          : null,
      ),
    [positions, book],
  )

  const go = useCallback((target: number, dir?: 'next' | 'prev') => {
    if (target < 0 || target >= total) return
    setDirection(dir || (target > at ? 'next' : 'prev'))
    setAt(target)
  }, [at, total])

  const reader = useReadAloud({
    bookId,
    scripts,
    narrator,
    apiKey: userApiKey,
    routeFor: i => {
      const p = positions[i]
      return !p ? null : p.kind === 'cover' ? 'cover' : p.kind === 'page' ? p.index : null
    },
    cached: i => {
      const p = positions[i]
      if (!p || !book) return undefined
      if (p.kind === 'cover') {
        const c = book.meta?.coverNarration
        return c && c.narrator === narrator && c.text === scripts[i] ? c.url : undefined
      }
      if (p.kind === 'page') {
        const c = book.meta?.narration?.[p.index]
        return c && c.narrator === narrator && c.text === scripts[i] ? c.url : undefined
      }
      return undefined
    },
    onFinished: i => {
      if (i < total - 1) {
        setDirection('next')
        setAt(i + 1)
      } else {
        reader.stop()
      }
    },
  })

  // While reading, every new page starts its own voice.
  const readingRef = useRef(false)
  readingRef.current = reader.isReading
  useEffect(() => {
    if (readingRef.current) void reader.readPosition(at)
    // reader.readPosition is stable; at is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at])

  // Reading music, quietly under the voice
  const songs = book ? bookSongs(book) : []
  const background = songs.find(s => s.kind === 'background')
  useEffect(() => {
    if (!background) return
    if (!musicRef.current) {
      musicRef.current = new Audio(background.url)
      musicRef.current.loop = true
      musicRef.current.volume = 0.18
    }
    if (musicOn) musicRef.current.play().catch(() => setMusicOn(false))
    else musicRef.current.pause()
  }, [musicOn, background])
  useEffect(() => () => { musicRef.current?.pause() }, [])

  // Keyboard: arrows turn, space reads
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') go(at + 1, 'next')
      if (e.key === 'ArrowLeft') go(at - 1, 'prev')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [at, go, sheet])

  // Swipe
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 45) go(at + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev')
  }

  // Keep the current thumbnail in view
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-pos="${at}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [at])

  // ── Songs ──
  const makeSong = async (kind: ClientSong['kind']) => {
    try {
      const res = await fetch(`/api/generate-song/${bookId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, userApiKey: userApiKey || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'The song could not be started.')
      if (data.status === 'complete' && data.song) { addSong(data.song); return }
      setSongJobs(j => ({ ...j, [kind]: { queueId: data.queueId, model: data.model, title: data.title, lyrics: data.lyrics, startedAt: Date.now() } }))
    } catch (err: any) {
      alert(err.message || 'The song could not be started.')
    }
  }

  const addSong = (song: ClientSong) => {
    setBook(b => b ? {
      ...b,
      songUrl: song.kind === 'theme' ? song.url : b.songUrl,
      meta: { ...(b.meta || {}), songs: [...(b.meta?.songs || []).filter(s => s.kind !== song.kind), song] },
    } : b)
  }

  // Poll every song still being composed. Gives up after five minutes each.
  useEffect(() => {
    const kinds = Object.keys(songJobs) as ClientSong['kind'][]
    if (!kinds.length) return
    const t = setInterval(async () => {
      for (const kind of kinds) {
        const job = songJobs[kind]
        if (!job) continue
        const drop = () => setSongJobs(j => { const n = { ...j }; delete n[kind]; return n })
        if (Date.now() - job.startedAt > 5 * 60_000) { drop(); alert('That song is taking too long. Please try again.'); continue }
        try {
          const res = await fetch(`/api/song-retrieve/${bookId}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...job, kind, userApiKey: userApiKey || undefined }),
          })
          const data = await res.json()
          if (data.status === 'complete' && data.song) { addSong(data.song); drop() }
          else if (data.error) { drop(); alert(data.error) }
        } catch { /* try again next tick */ }
      }
    }, 4000)
    return () => clearInterval(t)
  }, [songJobs, bookId, userApiKey])

  // ── Sharing and saving ──
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${bookId}` : ''

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: book?.title, text: `A storybook for you: ${book?.title}`, url: shareUrl }); return } catch { /* fall through */ }
    }
    try { await navigator.clipboard.writeText(shareUrl); alert('Link copied.') } catch { alert(shareUrl) }
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`A storybook for you: ${book?.title || 'My KinderQuill Story'}`)
    const body = encodeURIComponent(`I made this storybook with KinderQuill. I hope you love it.\n\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleDownloadHTML = () => {
    if (!book) return
    const html = renderBookHTML(book, { mode: 'reader', includeAudio, baseUrl: window.location.origin })
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url; a.download = bookFileName(book.title, 'html')
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const handleAudiobook = async () => {
    if (!book) return
    if (book.audioUrl) { window.open(`/api/download-audio/${bookId}`, '_blank'); return }
    setIsMakingAudiobook(true)
    try {
      const res = await fetch(`/api/generate-audio/${bookId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userApiKey: userApiKey || undefined, narrator }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'The audiobook could not be made.')
      setBook({ ...book, audioUrl: data.audioUrl })
      window.open(`/api/download-audio/${bookId}`, '_blank')
    } catch (err: any) {
      alert(err.message || 'The audiobook could not be made.')
    } finally {
      setIsMakingAudiobook(false)
    }
  }

  // ── Animate one picture (advanced extra) ──
  const handleAnimate = async (key: string, pageIndex: number) => {
    if (animating) return
    setAnimating({ key })
    try {
      const res = await fetch('/api/animate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, pageIndex, userApiKey }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'The animation could not be started.')
      setAnimating({ key, queueId: data.queueId, model: data.model })
    } catch (err: any) {
      alert(err.message); setAnimating(null)
    }
  }
  useEffect(() => {
    if (!animating?.queueId) return
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/animate-retrieve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId: animating.queueId, model: animating.model, userApiKey }),
        })
        const data = await res.json()
        if (data.status === 'complete' && data.videoUrl) {
          setPageVideos(v => ({ ...v, [animating.key]: data.videoUrl }))
          setVideoUrl(data.videoUrl)
          setAnimating(null)
        } else if (data.error) {
          alert('The animation failed: ' + data.error); setAnimating(null)
        }
      } catch { /* next tick */ }
    }, 8000)
    return () => clearInterval(t)
  }, [animating, userApiKey])

  const toggleDyslexia = () => {
    setDyslexiaMode(v => {
      try { localStorage.setItem(LS_DYSLEXIA, v ? '0' : '1') } catch {}
      return !v
    })
  }

  const pickNarrator = (value: string) => {
    reader.stop()
    setNarrator(value)
    try { localStorage.setItem(LS_NARRATOR, value) } catch {}
    setSheet(null)
  }

  // ── Empty states ──
  if (isLoading) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="text-center">
          <Icon name="auto_stories" size={36} className="animate-kq-spin text-kq-amber" />
          <p className="mt-4 font-display text-lg text-kq-text">Opening the book</p>
        </div>
      </div>
    )
  }
  if (!book) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="max-w-xs text-center">
          <h1 className="font-display text-xl text-kq-text">We could not find this book</h1>
          <p className="mt-2 text-sm text-kq-dim">It may still be being made, or it was removed.</p>
          <button onClick={() => router.push('/generate')} className="kq-btn-primary mt-5">Make a story</button>
        </div>
      </div>
    )
  }
  if (!book.pages?.length) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl text-kq-text">This book is still being made</h1>
          <p className="mt-2 text-sm text-kq-dim">Please wait a moment and refresh.</p>
        </div>
      </div>
    )
  }

  // ── The page being shown ──
  const pictureFor = (p: Position) => p.kind === 'cover' ? book.titlePage?.image : p.kind === 'page' ? book.pages[p.index].image : undefined
  const picture = pictureFor(pos)
  const animKey = pos.kind === 'cover' ? '-1' : pos.kind === 'page' ? String(pos.index) : ''
  const pageNumberLabel = pos.kind === 'page' ? `Page ${pos.index + 1} of ${book.pages.length}` : pos.kind === 'cover' ? 'Cover' : 'The End'

  const words = pos.kind === 'page' ? splitWords(book.pages[pos.index].text) : []
  const textStyle: React.CSSProperties = dyslexiaMode
    ? { fontFamily: "'OpenDyslexic','Comic Sans MS','Lexend',sans-serif", letterSpacing: '0.04em', wordSpacing: '0.14em', lineHeight: 2 }
    : { lineHeight: 1.7 }
  const textSize = words.join('').length > 420 ? 'text-[1.02rem] lg:text-[1.15rem]' : words.join('').length > 220 ? 'text-[1.12rem] lg:text-[1.3rem]' : 'text-[1.28rem] lg:text-[1.55rem]'

  return (
    <div className="kq-ground kq-stars-bg relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden">
      <div className="relative z-10 flex min-h-[100dvh] flex-col">

        {/* Top bar */}
        <div className="kq-top-bar">
          <div className="flex items-center gap-1.5">
            <button onClick={() => router.push('/library')} className="kq-icon-btn" aria-label="Back to the shelf">
              <Icon name="shelf" size={18} />
            </button>
          </div>
          <span className="min-w-0 flex-1 truncate px-1.5 text-center font-display text-base text-kq-text">{book.title}</span>
          <div className="flex items-center gap-1.5">
            {!book.isSample && (
              <button onClick={() => router.push(`/book/${bookId}/edit`)} className="kq-icon-btn" aria-label="Edit this book in the studio" title="Edit in the studio">
                <Icon name="edit" size={18} />
              </button>
            )}
            <button onClick={() => setSheet('share')} className="kq-icon-btn" aria-label="Save or share this book" title="Save or share">
              <Icon name="share" size={18} />
            </button>
          </div>
        </div>

        {/* The stage: one page of the book, turning from its spine */}
        <main className="kq-flip-stage mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pt-3 sm:px-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <article
            key={at}
            className={`kq-page ${direction === 'next' ? 'kq-flip-next' : 'kq-flip-prev'} ${
              pos.kind === 'page' ? 'lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-stretch' : ''
            }`}
            aria-label={pageNumberLabel}
          >
            {/* The picture, whole */}
            {picture && (
              <div className={`relative flex items-center justify-center bg-kq-cream-dim/40 ${pos.kind === 'cover' ? 'p-2 sm:p-3' : 'p-2 sm:p-3 lg:p-4'}`}>
                <img
                  src={picture}
                  alt={pos.kind === 'cover' ? `The cover of ${book.title}` : `Picture for page ${pos.kind === 'page' ? pos.index + 1 : ''}`}
                  className={`block h-auto w-full rounded-[12px] object-contain ${pos.kind === 'cover' ? 'max-h-[64dvh]' : 'max-h-[50dvh] lg:max-h-[68dvh]'}`}
                />
                {/* Page corners turn the page */}
                <button onClick={() => go(at - 1, 'prev')} disabled={at === 0} aria-label="Previous page" className="absolute inset-y-0 left-0 w-1/5 disabled:cursor-default" />
                <button onClick={() => go(at + 1, 'next')} disabled={at === total - 1} aria-label="Next page" className="absolute inset-y-0 right-0 w-1/5 disabled:cursor-default" />
                {animKey && (
                  <div className="absolute bottom-4 right-4 z-10">
                    {pageVideos[animKey] ? (
                      <button onClick={() => setVideoUrl(pageVideos[animKey])} className="flex items-center gap-1.5 rounded-lg border border-kq-line bg-kq-ink/80 px-2.5 py-1.5 text-xs text-kq-text backdrop-blur">
                        <Icon name="play_arrow" size={14} /> Watch it move
                      </button>
                    ) : animating?.key === animKey ? (
                      <span className="flex items-center gap-1.5 rounded-lg border border-kq-line bg-kq-ink/80 px-2.5 py-1.5 text-xs text-kq-text backdrop-blur">
                        <Icon name="progress_activity" size={14} className="animate-kq-spin" /> Bringing it to life
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* The words */}
            {pos.kind === 'page' && (
              <div className="flex flex-col justify-center px-5 pb-5 pt-3 sm:px-8 lg:px-10 lg:py-8">
                <p className={`font-display ${textSize}`} style={textStyle}>
                  {words.map((w, i) => (
                    <span
                      key={i}
                      className={`kq-word ${reader.isReading && i === reader.wordIndex ? 'is-on' : ''} ${reader.isReading && i < reader.wordIndex ? 'is-read' : ''}`}
                    >
                      {w}
                    </span>
                  ))}
                </p>
                <p className="mt-4 text-center text-xs text-[rgba(59,42,30,0.55)]">{pos.index + 1}</p>
              </div>
            )}

            {pos.kind === 'cover' && (
              <div className="px-5 pb-5 pt-1 text-center">
                <h1 className="sr-only">{book.title}</h1>
                {book.meta?.dedication && <p className="font-display text-base italic">{book.meta.dedication}</p>}
                <p className="mt-1 text-xs text-[rgba(59,42,30,0.6)]">
                  {book.pages.length} pages{book.meta?.heroName ? `, starring ${book.meta.heroName}` : ''}
                </p>
              </div>
            )}

            {pos.kind === 'end' && (
              <div className="flex flex-col items-center px-5 py-10 text-center sm:py-14">
                <h2 className="font-display text-4xl">The End</h2>
                <p className="mt-2 max-w-sm text-sm text-[rgba(59,42,30,0.7)]">
                  Thank you for reading {book.title}.
                </p>
                <div className="mt-6 grid w-full max-w-sm gap-2">
                  <button onClick={() => go(0, 'prev')} className="rounded-lg border border-[rgba(59,42,30,0.2)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[rgba(59,42,30,0.06)]">
                    Read it again
                  </button>
                  <button onClick={() => setSheet('songs')} className="rounded-lg border border-[rgba(59,42,30,0.2)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[rgba(59,42,30,0.06)]">
                    Sing the story
                  </button>
                  <button
                    onClick={() => router.push(`/generate?idea=${encodeURIComponent(`Continue the adventure from the storybook "${book.title}". Bring back the same beloved hero for a brand new chapter with a fresh, gentle challenge and a happy ending.`)}`)}
                    className="rounded-lg border border-[rgba(59,42,30,0.2)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[rgba(59,42,30,0.06)]"
                  >
                    Make the next chapter
                  </button>
                </div>
              </div>
            )}
          </article>

          {/* Turning controls and the one amber action */}
          <div className="mx-auto mt-3 flex w-full max-w-xl items-center gap-2">
            <button onClick={() => go(at - 1, 'prev')} disabled={at === 0} className="kq-icon-btn !h-12 !w-12 shrink-0 disabled:opacity-30" aria-label="Previous page">
              <Icon name="chevron_left" size={22} />
            </button>
            <button
              onClick={() => (reader.isReading ? reader.stop() : reader.start(at))}
              className="kq-btn-primary !py-3 !text-base"
            >
              {reader.isReading ? (
                <><Icon name="stop" size={20} /> {reader.isLoading ? 'Finding the voice' : 'Stop reading'}</>
              ) : (
                <><Icon name="play_arrow" size={20} /> Read to me</>
              )}
            </button>
            <button onClick={() => go(at + 1, 'next')} disabled={at === total - 1} className="kq-icon-btn !h-12 !w-12 shrink-0 disabled:opacity-30" aria-label="Next page">
              <Icon name="chevron_right" size={22} />
            </button>
          </div>

          {/* Reading tools */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setSheet('voice')} className={TOOL}>
              <Icon name="volume_up" size={15} /> {getNarrator(narrator).label}
            </button>
            <button onClick={() => setSheet('songs')} className={TOOL}>
              <Icon name="music_note" size={15} /> Songs{songs.length ? ` (${songs.length})` : ''}
            </button>
            {background && (
              <button onClick={() => setMusicOn(v => !v)} aria-pressed={musicOn} className={`${TOOL} ${musicOn ? '!border-kq-amber/50' : ''}`}>
                <Icon name="headphones" size={15} /> {musicOn ? 'Music on' : 'Music off'}
              </button>
            )}
            <button onClick={toggleDyslexia} aria-pressed={dyslexiaMode} className={`${TOOL} ${dyslexiaMode ? '!border-kq-amber/50' : ''}`}>
              <Icon name="format_size" size={15} /> Easy Read
            </button>
            {animKey && picture && !pageVideos[animKey] && !animating && (
              <button onClick={() => handleAnimate(animKey, Number(animKey))} className={TOOL}>
                <Icon name="movie" size={15} /> Animate
              </button>
            )}
            <button onClick={() => setShowStrip(v => !v)} aria-pressed={showStrip} className={TOOL}>
              <Icon name="menu_book" size={15} /> Pages
            </button>
          </div>
          {reader.usingBrowserVoice && reader.isReading && (
            <p className="mt-1 text-center text-[11px] text-kq-dim">Reading with this device's own voice.</p>
          )}

          {/* The storyboard: every page, one tap away */}
          {showStrip && (
            <div ref={stripRef} className="mt-3 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:thin]" aria-label="All pages">
              {positions.map((p, i) => {
                const img = pictureFor(p)
                return (
                  <button
                    key={i}
                    data-pos={i}
                    onClick={() => go(i)}
                    aria-label={p.kind === 'cover' ? 'Cover' : p.kind === 'page' ? `Page ${p.index + 1}` : 'The End'}
                    aria-current={i === at ? 'page' : undefined}
                    className={`relative shrink-0 overflow-hidden rounded-md border-2 transition-transform ${i === at ? 'scale-105 border-kq-amber' : 'border-transparent opacity-75 hover:opacity-100'}`}
                  >
                    {img ? (
                      <img src={img} alt="" loading="lazy" className="h-14 w-20 object-cover" />
                    ) : (
                      <span className="flex h-14 w-20 items-center justify-center bg-kq-cream font-display text-[11px] text-kq-amber-ink">The End</span>
                    )}
                    {p.kind === 'page' && (
                      <span className="absolute bottom-0.5 left-0.5 rounded-[4px] bg-kq-ink/75 px-1 text-[10px] text-kq-text">{p.index + 1}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </main>

        <footer className="py-2 text-center" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          <p className="text-xs text-kq-dim">Swipe or use the arrow keys to turn the page.</p>
        </footer>
      </div>

      {/* ── Sheets ── */}
      {sheet === 'songs' && (
        <SongsSheet bookTitle={book.title} songs={songs} jobs={songJobs} canMake onMake={makeSong} onClose={() => setSheet(null)} />
      )}

      {sheet === 'voice' && (
        <Sheet title="Who reads the story?" onClose={() => setSheet(null)}>
          <div className="grid grid-cols-2 gap-2">
            {NARRATORS.map(n => (
              <button
                key={n.value}
                onClick={() => pickNarrator(n.value)}
                aria-pressed={narrator === n.value}
                className={`rounded-lg border p-3 text-left transition-colors ${narrator === n.value ? 'border-kq-amber/50 bg-kq-amber/10' : 'border-kq-line bg-kq-text/5 hover:bg-kq-text/10'}`}
              >
                <div className="text-sm font-medium text-kq-text">{n.label}</div>
                <div className="text-xs text-kq-dim">{n.description}</div>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'share' && (
        <Sheet title="Save and share" onClose={() => setSheet(null)}>
          <div className="grid gap-2">
            <ShareRow icon="share" title="Send a link" note="Anyone with the link can read it" onClick={handleShare} />
            <ShareRow icon="mail" title="Email it" note="Opens your mail app with the link" onClick={handleEmail} />
            <ShareRow icon="picture_as_pdf" title="PDF to print" note="One page per sheet, cover first" onClick={() => router.push(`/pdf/${bookId}`)} />
            <ShareRow icon="code" title="Web page" note="A flip-through book that works offline" onClick={handleDownloadHTML} />
            <label className="flex items-center justify-between gap-3 px-1 text-xs text-kq-dim">
              Put the narration and songs inside the web page
              <span
                className={`kq-toggle shrink-0 ${includeAudio ? 'on' : ''}`}
                onClick={() => setIncludeAudio(v => !v)}
                role="switch"
                aria-checked={includeAudio}
                aria-label="Include narration and songs in the web page"
              />
            </label>
            <ShareRow
              icon="headphones"
              title={book.audioUrl ? 'Audiobook MP3' : isMakingAudiobook ? 'Recording the audiobook' : 'Make an audiobook MP3'}
              note={`Read by ${getNarrator(narrator).label}`}
              onClick={handleAudiobook}
              disabled={isMakingAudiobook}
            />
          </div>
        </Sheet>
      )}

      {videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-kq-ink/90 p-4" onClick={() => setVideoUrl(null)}>
          <div className="kq-card w-full max-w-2xl !p-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="font-display text-sm text-kq-text">The page, moving</div>
              <button onClick={() => setVideoUrl(null)} className="kq-icon-btn" aria-label="Close"><Icon name="close" size={18} /></button>
            </div>
            <video src={videoUrl} autoPlay loop controls playsInline className="w-full bg-kq-ink" style={{ maxHeight: '70vh', objectFit: 'contain' }} />
            <div className="flex justify-center px-4 py-3">
              <a href={videoUrl} download="page.mp4" className="kq-btn-primary !w-auto !px-4 !py-2 !text-sm"><Icon name="download" size={16} /> Download MP4</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-kq-ink/80 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label={title} className="kq-bottom-sheet max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl border border-kq-line bg-kq-card p-4" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-kq-text">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="kq-icon-btn"><Icon name="close" size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ShareRow({ icon, title, note, onClick, disabled }: { icon: string; title: string; note: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-3 text-left transition-colors hover:bg-kq-text/10 disabled:opacity-60"
    >
      <Icon name={icon} size={18} className="shrink-0 text-kq-dim" />
      <span className="min-w-0">
        <span className="block text-sm text-kq-text">{title}</span>
        <span className="block text-xs text-kq-dim">{note}</span>
      </span>
    </button>
  )
}
