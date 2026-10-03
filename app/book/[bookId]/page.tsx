'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface BookPage {
  text: string
  image: string
}

interface TitlePage {
  image: string
  title: string
}

interface Book {
  id: string
  title: string
  titlePage?: TitlePage
  pages: BookPage[]
  ageRange: string
  illustrationStyle: string
  audioUrl?: string
  songUrl?: string
}

const LS_DYSLEXIA = 'kinderquill_dyslexia_mode'

// The quiet action in the book toolbar: a hairline, sized to its label.
// The !important utilities beat the full width button class.
const TOOL_BTN = 'kq-btn-secondary !w-auto !px-3 !py-2 !text-xs'

// Split page prose into sentences for read-along highlighting.
function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?…]+[.!?…]*\s*/g)
  const parts = (matches || [text]).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts : [text]
}

export default function BookViewerPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
  // Email / HTML / PDF are things a parent does once, not while reading, so
  // they stay folded away until asked for.
  const [showExport, setShowExport] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const [, setAudioRef] = useState<HTMLAudioElement | null>(null)

  // Animation state
  const [userApiKey, setUserApiKey] = useState<string>('')
  const [pageVideos, setPageVideos] = useState<Record<string, string>>({})
  const [animatingPageKey, setAnimatingPageKey] = useState<string | null>(null)
  const [animateQueueId, setAnimateQueueId] = useState<string | null>(null)
  const [animateModel, setAnimateModel] = useState<string | null>(null)
  const [animateElapsed, setAnimateElapsed] = useState<number>(0)
  const [animateAvgTime, setAnimateAvgTime] = useState<number>(120000)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null)

  // Theme song state
  const [isGeneratingSong, setIsGeneratingSong] = useState(false)
  const [songQueueId, setSongQueueId] = useState<string | null>(null)
  const [songModel, setSongModel] = useState<string | null>(null)

  // Reading modes: read-along highlighting + dyslexia-friendly text
  const [dyslexiaMode, setDyslexiaMode] = useState(false)
  const [readAlong, setReadAlong] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/book/${bookId}`)
        if (!response.ok) throw new Error('Failed to fetch book')
        const data = await response.json()
        setBook(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching book:', error)
        setIsLoading(false)
      }
    }
    fetchBook()
    const savedKey = localStorage.getItem('kinderquill_venice_api_key')
    if (savedKey) setUserApiKey(savedKey)
    try { if (localStorage.getItem(LS_DYSLEXIA) === '1') setDyslexiaMode(true) } catch {}
  }, [bookId])

  const toggleDyslexia = () => {
    setDyslexiaMode(prev => {
      const next = !prev
      try { localStorage.setItem(LS_DYSLEXIA, next ? '1' : '0') } catch {}
      return next
    })
  }

  const toggleReadAlong = () => {
    setReadAlong(prev => {
      if (prev) setHighlightIndex(-1)
      return !prev
    })
  }

  // Drives read-along: highlight one sentence at a time, then turn the page.
  useEffect(() => {
    if (!readAlong || !book) return
    const hasTitle = !!book.titlePage
    const total = book.pages.length + (hasTitle ? 1 : 0)
    // Skip the cover during read-along and jump to the first story page.
    if (hasTitle && currentPage === 0) { setCurrentPage(1); return }
    const contentIdx = hasTitle ? currentPage - 1 : currentPage
    const pg = book.pages[contentIdx]
    if (!pg) return
    const sents = splitSentences(pg.text)
    let idx = 0
    setHighlightIndex(0)
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const words = sents[idx].split(/\s+/).filter(Boolean).length
      const dur = Math.max(1700, words * 360) // about the pace of reading aloud
      timer = setTimeout(() => {
        idx++
        if (idx < sents.length) { setHighlightIndex(idx); schedule() }
        else if (currentPage < total - 1) { setCurrentPage(currentPage + 1) }
        else { setReadAlong(false); setHighlightIndex(-1) }
      }, dur)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [readAlong, currentPage, book])

  useEffect(() => {
    if (!animateQueueId || !animatingPageKey) return
    const poll = async () => {
      try {
        const res = await fetch('/api/animate-retrieve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId: animateQueueId, model: animateModel, userApiKey }),
        })
        const data = await res.json()
        if (data.status === 'complete' && data.videoUrl) {
          setPageVideos(prev => ({ ...prev, [animatingPageKey]: data.videoUrl }))
          setModalVideoUrl(data.videoUrl); setShowVideoModal(true)
          setAnimatingPageKey(null); setAnimateQueueId(null); setAnimateModel(null)
        } else if (data.status === 'processing') {
          setAnimateElapsed(data.elapsed ?? 0); setAnimateAvgTime(data.averageTime ?? 120000)
        } else if (data.error) {
          console.error('Animation error:', data.error); alert('Animation failed: ' + data.error)
          setAnimatingPageKey(null); setAnimateQueueId(null); setAnimateModel(null)
        }
      } catch (err) { console.error('Animation poll error:', err) }
    }
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [animateQueueId, animatingPageKey, animateModel, userApiKey])

  const handleGenerateAudio = async () => {
    if (!book) return
    setIsGeneratingAudio(true)
    try {
      const response = await fetch(`/api/generate-audio/${bookId}`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to generate audio')
      const data = await response.json()
      setBook({ ...book, audioUrl: data.audioUrl })
    } catch (error) {
      console.error('Error generating audio:', error)
      alert('Failed to generate audio. Please try again.')
    } finally { setIsGeneratingAudio(false) }
  }

  const handleGenerateSong = async () => {
    if (!book || isGeneratingSong) return
    setIsGeneratingSong(true)
    try {
      const res = await fetch(`/api/generate-song/${bookId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userApiKey: userApiKey || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start theme song')
      if (data.status === 'complete' && data.songUrl) {
        setBook({ ...book, songUrl: data.songUrl }); setIsGeneratingSong(false)
      } else {
        setSongQueueId(data.queueId); if (data.model) setSongModel(data.model)
      }
    } catch (err: any) {
      console.error('Theme song error:', err)
      alert(err.message || 'Failed to create theme song. Please try again.')
      setIsGeneratingSong(false)
    }
  }

  // Poll for the queued theme song until the audio is ready (give up after ~3 min).
  useEffect(() => {
    if (!songQueueId) return
    let attempts = 0
    const maxAttempts = 60 // 60 x 3s = 3 minutes (sung songs take longer)
    let interval: ReturnType<typeof setInterval>
    const stop = () => { clearInterval(interval); setSongQueueId(null); setSongModel(null); setIsGeneratingSong(false) }
    const poll = async () => {
      attempts++
      try {
        const res = await fetch(`/api/song-retrieve/${bookId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId: songQueueId, model: songModel, userApiKey: userApiKey || undefined }),
        })
        const data = await res.json()
        if (data.status === 'complete' && data.songUrl) {
          setBook(prev => (prev ? { ...prev, songUrl: data.songUrl } : prev))
          stop()
        } else if (data.error) {
          console.error('Song retrieve error:', data.error)
          alert('The theme song could not be created. Please try again.')
          stop()
        } else if (attempts >= maxAttempts) {
          console.warn('Theme song timed out after 3 minutes')
          alert('The theme song is taking longer than expected. Please try again in a moment.')
          stop()
        }
      } catch (err) {
        console.error('Song poll error:', err)
        if (attempts >= maxAttempts) stop()
      }
    }
    interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [songQueueId, songModel, userApiKey, bookId])

  const handlePageChange = (newPage: number) => {
    setIsPageTransitioning(true)
    setTimeout(() => { setCurrentPage(newPage); setIsPageTransitioning(false) }, 150)
  }

  const handleDownloadPDF = () => { window.open(`/pdf/${bookId}?download=true`, '_blank') }
  const handlePrint = () => { window.open(`/pdf/${bookId}?download=true`, '_blank') }
  const handleDownloadAudio = () => { if (!book || !book.audioUrl) return; window.open(`/api/download-audio/${bookId}`, '_blank') }

  // Email this storybook (share the read-only link via the user's mail client)
  const handleEmail = () => {
    const shareUrl = `${window.location.origin}/share/${bookId}`
    const subject = encodeURIComponent(`A storybook for you: ${book?.title || 'My KinderQuill Story'}`)
    const body = encodeURIComponent(`I made this storybook with KinderQuill. I hope you love it.\n\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // Continue the adventure: open the generator pre-filled with a sequel idea
  const handleContinueAdventure = () => {
    if (!book) return
    const idea = `Continue the adventure from the storybook "${book.title}". Bring back the same beloved hero for a brand-new chapter with a fresh, exciting challenge. Keep it positive, warm and inspiring, with a happy ending.`
    router.push(`/generate?idea=${encodeURIComponent(idea)}`)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/share/${bookId}`
    if (navigator.share) {
      try { await navigator.share({ title: book?.title || 'My KinderQuill Story', text: `Check out this story: ${book?.title}`, url: shareUrl }) }
      catch { copyToClipboard(shareUrl) }
    } else { copyToClipboard(shareUrl) }
  }

  const copyToClipboard = async (url: string) => {
    try { await navigator.clipboard.writeText(url); alert('Link copied to clipboard!') }
    catch { alert(`Share this link: ${url}`) }
  }

  const handleAnimate = async (pageKey: string, pageIndex: number) => {
    if (animatingPageKey) return
    setAnimatingPageKey(pageKey); setAnimateElapsed(0); setAnimateAvgTime(120000)
    try {
      const res = await fetch('/api/animate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, pageIndex, userApiKey }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { alert(data.error || 'Failed to start animation'); setAnimatingPageKey(null); return }
      setAnimateQueueId(data.queueId); if (data.model) setAnimateModel(data.model)
    } catch (err: any) { alert(err.message || 'Failed to start animation'); setAnimatingPageKey(null) }
  }

  const handleDownloadHTML = () => {
    if (!book) return
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${book.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    /* The exported book keeps the Cosy Night-Light world: indigo ground,
       one warm cream reading page, one amber action. Colours live here once. */
    :root {
      --kq-navy: rgb(27 29 58);
      --kq-text: rgb(244 242 236);
      --kq-cream: rgb(246 231 201);
      --kq-ink-text: rgb(59 42 30);
      --kq-line: rgba(244, 242, 236, 0.14);
      --kq-amber: rgb(224 160 70);
      --kq-amber-ink: rgb(36 26 18);
      --kq-serif: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
      --kq-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--kq-ui);
      background: var(--kq-navy);
      color: var(--kq-text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    .book-container { max-width: 800px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 18px; }
    .page { display: none; flex-direction: column; gap: 18px; width: 100%; }
    .page.active { display: flex; }
    .page-image { width: 100%; border-radius: 14px; border: 1px solid var(--kq-line); }
    .page-text {
      background: var(--kq-cream);
      color: var(--kq-ink-text);
      padding: 26px 24px;
      border-radius: 22px;
      font-family: var(--kq-serif);
      font-size: 1.3rem;
      line-height: 1.7;
    }
    .header { width: 100%; text-align: center; padding: 16px; }
    .header h1 { font-family: var(--kq-serif); font-size: 1.5rem; font-weight: 600; color: var(--kq-text); }
    .navigation { display: flex; justify-content: space-between; width: 100%; gap: 14px; position: sticky; bottom: 16px; }
    .nav-button { flex: 1; padding: 14px 22px; border-radius: 14px; font-size: 0.95rem; font-weight: 600; font-family: var(--kq-ui); cursor: pointer; }
    .nav-button.prev { background: rgba(244, 242, 236, 0.05); border: 1px solid var(--kq-line); color: var(--kq-text); }
    .nav-button.next { background: var(--kq-amber); border: none; color: var(--kq-amber-ink); }
    .nav-button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-indicators { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; }
    .indicator { width: 8px; height: 8px; border-radius: 2px; background: rgba(244, 242, 236, 0.24); cursor: pointer; }
    .indicator.active { width: 22px; background: var(--kq-amber); }
  </style>
</head>
<body>
  <div class="book-container">
    <div class="header"><h1>${book.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1></div>
    ${book.titlePage ? `<div class="page active" id="page-title"><img src="${book.titlePage.image}" alt="${book.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}" class="page-image" /><div class="page-text" style="text-align:center;font-size:24px;font-weight:bold;">${book.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>` : ''}
    ${book.pages.map((page, index) => `<div class="page ${!book.titlePage && index === 0 ? 'active' : ''}" id="page-${index}"><img src="${page.image}" alt="Page ${index + 1}" class="page-image" /><div class="page-text">${page.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`).join('')}
    <div class="page-indicators">
      ${book.titlePage ? '<div class="indicator active" onclick="goToPage(0)"></div>' : ''}
      ${book.pages.map((_, index) => `<div class="indicator ${!book.titlePage && index === 0 ? 'active' : ''}" onclick="goToPage(${book.titlePage ? index + 1 : index})"></div>`).join('')}
    </div>
    <div class="navigation">
      <button class="nav-button prev" onclick="previousPage()" id="prevBtn">Previous</button>
      <button class="nav-button next" onclick="nextPage()" id="nextBtn">Next</button>
    </div>
  </div>
  <script>
    let currentPage = 0;
    const hasTitlePage = ${book.titlePage ? 'true' : 'false'};
    const totalPages = ${book.pages.length} + (hasTitlePage ? 1 : 0);
    function showPage(index) {
      document.querySelectorAll('.page').forEach((page, i) => page.classList.toggle('active', i === index));
      document.querySelectorAll('.indicator').forEach((ind, i) => ind.classList.toggle('active', i === index));
      document.getElementById('prevBtn').disabled = index === 0;
      document.getElementById('nextBtn').disabled = index === totalPages - 1;
    }
    function nextPage() { if (currentPage < totalPages - 1) showPage(++currentPage); }
    function previousPage() { if (currentPage > 0) showPage(--currentPage); }
    function goToPage(index) { currentPage = index; showPage(index); }
    document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') previousPage(); if (e.key === 'ArrowRight') nextPage(); });
    showPage(0);
  <\/script>
</body>
</html>`
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // Loading
  if (isLoading) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="text-center">
          <Icon name="auto_awesome" size={36} className="animate-kq-spin text-kq-amber" />
          <p className="mt-4 font-display text-lg text-kq-text">Opening the book</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl text-kq-text">We could not find this book</h1>
          <p className="mt-2 text-sm text-kq-dim">It may have been removed from this device.</p>
          <div className="mx-auto mt-5 max-w-xs">
            <button onClick={() => router.push('/generate')} className="kq-btn-primary">
              Make a story
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!book.pages || book.pages.length === 0) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl text-kq-text">This book is still being made</h1>
          <p className="mt-2 text-sm text-kq-dim">Please wait a moment and refresh.</p>
        </div>
      </div>
    )
  }

  const hasTitlePage = !!book.titlePage
  const totalPages = book.pages.length + (hasTitlePage ? 1 : 0)
  const isTitlePage = hasTitlePage && currentPage === 0
  const contentPageIndex = hasTitlePage ? currentPage - 1 : currentPage
  const page = isTitlePage ? null : book.pages[contentPageIndex]

  // Video Modal
  const VideoModal = () => {
    if (!showVideoModal || !modalVideoUrl) return null
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-kq-ink/90 p-4 backdrop-blur"
        onClick={() => setShowVideoModal(false)}
      >
        <div className="kq-card relative w-full max-w-2xl !p-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="font-display text-sm text-kq-text">Animated illustration</div>
            <button onClick={() => setShowVideoModal(false)} className="kq-icon-btn" title="Close" aria-label="Close">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <video
            src={modalVideoUrl} autoPlay loop controls playsInline
            className="w-full bg-kq-ink"
            style={{ maxHeight: '70vh', objectFit: 'contain' }}
          />
          <div className="flex justify-center gap-3 px-4 py-3">
            {/* The modal is its own focus surface, so it carries its own single amber action. */}
            <a href={modalVideoUrl} download="animation.mp4" className="kq-btn-primary !w-auto !px-4 !py-2 !text-sm">
              <Icon name="download" size={16} /> Download MP4
            </a>
            <button onClick={() => setShowVideoModal(false)} className="kq-btn-secondary !w-auto !px-4 !py-2 !text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Animate Button: a small quiet control sitting on the illustration
  const AnimateButton = ({ pageKey, pageIndex }: { pageKey: string; pageIndex: number }) => {
    const video = pageVideos[pageKey]
    const isAnimating = animatingPageKey === pageKey
    const progressPct = animateAvgTime > 0 ? Math.min(99, Math.round((animateElapsed / animateAvgTime) * 100)) : 0
    const overlay = 'flex items-center gap-1.5 rounded-lg border border-kq-line bg-kq-ink/80 px-3 py-1.5 text-xs text-kq-text backdrop-blur transition-transform duration-200'
    if (video) {
      return (
        <button
          onClick={() => { setModalVideoUrl(video); setShowVideoModal(true) }}
          className={`${overlay} hover:scale-105`}
        >
          <span className="material-symbols-outlined text-base">play_arrow</span> Watch animation
        </button>
      )
    }
    if (isAnimating) {
      return (
        <div className={overlay}>
          <span className="material-symbols-outlined animate-kq-spin text-base text-kq-dim">progress_activity</span>
          <span>Animating {animateQueueId ? `${progressPct}%` : 'starting'}</span>
        </div>
      )
    }
    return (
      <button
        onClick={() => handleAnimate(pageKey, pageIndex)}
        disabled={!!animatingPageKey}
        className={`${overlay} hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon name="auto_awesome" size={14} /> Animate
      </button>
    )
  }

  // Top Bar
  const TopBar = () => (
    <div className="kq-top-bar">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home" aria-label="Home">
          <Icon name="home" size={18} />
        </button>
        <button onClick={() => router.back()} className="kq-icon-btn" title="Back" aria-label="Back">
          <Icon name="arrow_back" size={18} />
        </button>
      </div>
      <span className="font-display min-w-0 flex-1 truncate px-3 text-center text-base text-kq-text">
        {book.title}
      </span>
      <button onClick={handleShare} className="kq-icon-btn" title="Share this book" aria-label="Share this book">
        <span className="material-symbols-outlined text-lg">share</span>
      </button>
    </div>
  )

  // The reading screen stays a reading screen: listening and singing belong
  // here, exporting does not. One tap folds the rest out when it is wanted.
  const BookActions = () => (
    <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-4 pt-3 lg:max-w-6xl">
      {book.audioUrl ? (
        <button onClick={handleDownloadAudio} className={TOOL_BTN} title="Download the audiobook">
          <span className="material-symbols-outlined text-base">headphones</span> MP3
        </button>
      ) : (
        <button
          onClick={handleGenerateAudio} disabled={isGeneratingAudio}
          className={TOOL_BTN} title="Create an audiobook"
        >
          <Icon name="volume_up" size={16} /> {isGeneratingAudio ? 'Making audio' : 'Narrate'}
        </button>
      )}
      {!book.songUrl && (
        <button
          onClick={handleGenerateSong} disabled={isGeneratingSong}
          className={TOOL_BTN} title="Create a sing-along song for this book"
        >
          <span className="material-symbols-outlined text-base">music_note</span>
          {isGeneratingSong ? 'Composing' : 'Sing-along'}
        </button>
      )}
      <button
        onClick={() => setShowExport(v => !v)}
        className={TOOL_BTN}
        aria-expanded={showExport}
        title="Save or share this book"
      >
        <Icon name="share" size={16} /> {showExport ? 'Hide' : 'Save and share'}
      </button>
      {showExport && (
        <>
          <button onClick={handleEmail} className={TOOL_BTN} title="Email this story">
            <span className="material-symbols-outlined text-base">mail</span> Email
          </button>
          <button onClick={handleDownloadHTML} className={TOOL_BTN} title="Download as a web page">
            <Icon name="code" size={16} /> Web page
          </button>
          <button onClick={handleDownloadPDF} className={TOOL_BTN} title="Download as a PDF">
            <span className="material-symbols-outlined text-base">picture_as_pdf</span> PDF
          </button>
        </>
      )}
    </div>
  )

  // Page Indicators
  const PageIndicators = () => (
    <div className="flex w-full flex-row items-center justify-center gap-1.5 py-3">
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          onClick={() => handlePageChange(index)}
          className={`kq-page-dot ${index === currentPage ? 'active' : ''}`}
          aria-label={`Go to page ${index + 1}`}
        />
      ))}
    </div>
  )

  // Nav Buttons: the title page's Start reading is its one amber action.
  const NavButtons = ({ onPrev, onNext, prevDisabled, nextDisabled, accentNext = false, nextLabel = 'Next' }: {
    onPrev: () => void; onNext: () => void; prevDisabled: boolean; nextDisabled: boolean
    accentNext?: boolean; nextLabel?: string
  }) => (
    <div className="sticky bottom-0 border-t border-kq-line-soft bg-kq-ink/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-4xl justify-between gap-4">
        <button
          onClick={onPrev} disabled={prevDisabled}
          className="kq-btn-secondary flex-1 !w-auto !px-3 !text-sm disabled:cursor-not-allowed"
        >
          <Icon name="arrow_back" size={16} /> Previous
        </button>
        <button
          onClick={onNext} disabled={nextDisabled}
          className={`flex-1 !w-auto !px-3 !text-sm disabled:cursor-not-allowed ${accentNext ? 'kq-btn-primary' : 'kq-btn-secondary'}`}
        >
          {nextLabel} <Icon name="arrow_forward" size={16} />
        </button>
      </div>
    </div>
  )

  // Shared page shell
  const pageShell = (children: React.ReactNode) => (
    <div className="kq-ground kq-stars-bg relative flex min-h-[100dvh] w-full flex-col">
      <VideoModal />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {children}
      </div>
    </div>
  )

  // Title Page
  if (isTitlePage && book.titlePage) {
    return pageShell(
      <>
        <TopBar />
        <BookActions />
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-6 lg:py-10">
          <div className={`kq-cover relative mb-4 w-full overflow-hidden transition-[opacity,transform] duration-300 lg:max-w-3xl ${isPageTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
            <img src={book.titlePage.image} alt="Book cover" className="h-auto w-full object-cover" />
            <div className="absolute bottom-3 right-3">
              <AnimateButton pageKey="-1" pageIndex={-1} />
            </div>
          </div>
        </main>
        <PageIndicators />
        <NavButtons
          onPrev={() => handlePageChange(0)} onNext={() => handlePageChange(1)}
          prevDisabled={true} nextDisabled={false}
          accentNext={true} nextLabel="Start reading"
        />
      </>
    )
  }

  if (!page) {
    return (
      <div className="kq-ground flex min-h-[100dvh] items-center justify-center px-4">
        <p className="font-display text-lg text-kq-text">This page could not be opened</p>
      </div>
    )
  }

  // Content Page
  return pageShell(
    <>
      <TopBar />
      <BookActions />

      {/* Page counter (phones only; desktop shows it beside the art) */}
      <div className="flex justify-center pb-1 pt-3 lg:hidden">
        <div className="kq-chip">Page {currentPage + 1} of {totalPages}</div>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-3 lg:max-w-6xl lg:flex-row lg:items-start lg:gap-8 lg:py-6">
        {/* Illustration: the event itself */}
        <div className={`kq-cover relative mb-4 w-full overflow-hidden transition-[opacity,transform] duration-300 lg:mb-0 lg:w-3/5 lg:flex-shrink-0 ${isPageTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          {page.image ? (
            <img
              src={page.image} alt={`Page ${currentPage + 1} illustration`}
              className="h-auto w-full animate-bloom-in object-cover" key={currentPage}
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center lg:h-[60vh]">
              <Icon name="auto_awesome" size={44} className="text-kq-dim" />
            </div>
          )}
          {page.image && (
            <div className="absolute bottom-3 right-3">
              <AnimateButton pageKey={String(contentPageIndex)} pageIndex={contentPageIndex} />
            </div>
          )}
        </div>

        {/* Reading column: the cream page, the read-aloud action, the audio */}
        <div className="flex w-full flex-col gap-3 lg:sticky lg:top-24 lg:w-2/5">
          {/* Desktop page label */}
          <div className="hidden items-center justify-between lg:flex">
            <span className="font-display min-w-0 truncate text-base text-kq-text">{book.title}</span>
            <div className="kq-chip shrink-0">Page {currentPage + 1} of {totalPages}</div>
          </div>

          {/* The one amber action on this screen: Read aloud */}
          <button
            onClick={toggleReadAlong}
            className="kq-btn-primary !py-3 !text-base"
            title="Highlight each sentence as it is read"
          >
            {readAlong ? (
              <>
                <span className="material-symbols-outlined text-lg">stop</span> Stop reading
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">play_arrow</span> Read aloud
              </>
            )}
          </button>

          {/* Easy Read: a reading preference, so it is a chip and not a second action */}
          <button
            onClick={toggleDyslexia}
            aria-pressed={dyslexiaMode}
            className={`kq-chip cursor-pointer self-start ${dyslexiaMode ? 'is-on' : ''}`}
            title="Easy-reading font and spacing"
          >
            <span className="material-symbols-outlined text-base">format_size</span> Easy Read
          </button>

          {/* The page itself, on the warm cream sheet */}
          <div className={`kq-sheet transition-[opacity,transform] duration-300 lg:max-h-[58vh] lg:overflow-y-auto ${isPageTransitioning ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <p
              style={dyslexiaMode ? {
                fontFamily: "'OpenDyslexic','Comic Sans MS','Lexend',sans-serif",
                letterSpacing: '0.04em',
                wordSpacing: '0.12em',
                lineHeight: 2.1,
                fontSize: '1.3rem',
              } : undefined}
            >
              {splitSentences(page.text).map((sentence, i) => (
                <span
                  key={i}
                  className={readAlong && i === highlightIndex ? 'rounded-sm bg-kq-amber/30 transition-colors' : undefined}
                >
                  {sentence}{' '}
                </span>
              ))}
            </p>
          </div>

          {/* Continue the adventure: last page only */}
          {currentPage === totalPages - 1 && (
            <button onClick={handleContinueAdventure} className="kq-btn-secondary !text-sm">
              <Icon name="auto_stories" size={16} /> Continue the adventure
            </button>
          )}

          {/* Audiobook player, when the audio exists */}
          {book.audioUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-kq-line bg-white/5 p-2">
              <span className="material-symbols-outlined text-lg text-kq-dim">headphones</span>
              <audio ref={setAudioRef} controls className="h-8 flex-1" style={{ minWidth: 0 }}>
                <source src={book.audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}

          {/* Theme song player, when a song exists */}
          {book.songUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-kq-line bg-white/5 p-2">
              <span className="material-symbols-outlined text-lg text-kq-dim">music_note</span>
              <audio controls className="h-8 flex-1" style={{ minWidth: 0 }}>
                <source src={book.songUrl} />
              </audio>
              <a
                href={book.songUrl}
                download={`${(book.title || 'theme-song').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-theme.mp3`}
                className="kq-icon-btn shrink-0"
                title="Download theme song"
              >
                <Icon name="download" size={16} />
              </a>
            </div>
          )}
        </div>
      </main>

      <PageIndicators />
      <NavButtons
        onPrev={() => handlePageChange(Math.max(0, currentPage - 1))}
        onNext={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
        prevDisabled={currentPage === 0}
        nextDisabled={currentPage === totalPages - 1}
      />

      <footer className="border-t border-kq-line-soft py-2 text-center">
        <p className="text-xs text-kq-dim">
          Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
        </p>
      </footer>
    </>
  )
}
