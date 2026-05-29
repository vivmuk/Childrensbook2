'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

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

export default function BookViewerPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
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
  }, [bookId])

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

  // Poll for the queued theme song until the audio is ready (give up after ~2 min).
  useEffect(() => {
    if (!songQueueId) return
    let attempts = 0
    const maxAttempts = 40 // 40 × 3s = 2 minutes
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
          console.warn('Theme song timed out after 2 minutes')
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
  const handleDownloadAudio = () => { if (!book || !book.audioUrl) return; window.open(`/api/download-audio/${bookId}`, '_blank') }

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: linear-gradient(to bottom right, #f3e8ff, #fce7f3, #fef3c7); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; }
    .book-container { max-width: 800px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .page { display: none; flex-direction: column; gap: 20px; width: 100%; }
    .page.active { display: flex; }
    .page-image { width: 100%; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .page-text { background: rgba(255,255,255,0.9); padding: 24px; border-radius: 16px; font-size: 18px; line-height: 1.8; color: #1f2937; }
    .header { width: 100%; text-align: center; padding: 20px; background: rgba(255,255,255,0.8); border-radius: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: bold; color: #1f2937; }
    .navigation { display: flex; justify-content: space-between; width: 100%; gap: 15px; margin-top: 20px; position: sticky; bottom: 20px; }
    .nav-button { flex: 1; padding: 15px 25px; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s ease; }
    .nav-button.prev { background: #f3f4f6; color: #374151; }
    .nav-button.next { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; }
    .nav-button:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-indicators { display: flex; justify-content: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .indicator { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; cursor: pointer; transition: all 0.3s; }
    .indicator.active { width: 32px; background: #3b82f6; border-radius: 4px; }
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
      <button class="nav-button prev" onclick="previousPage()" id="prevBtn">← Previous</button>
      <button class="nav-button next" onclick="nextPage()" id="nextBtn">Next →</button>
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

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d1b3e' }}>
        <div className="text-center">
          <div className="text-6xl animate-kq-spin mb-4">✨</div>
          <p className="text-lg font-semibold" style={{ color: '#fefcf5', fontFamily: 'Fredoka One, cursive' }}>Loading book...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d1b3e' }}>
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: '#fefcf5' }}>Book not found</p>
          <button onClick={() => router.push('/generate')} className="mt-4 px-6 py-2 rounded-full text-sm font-bold" style={{ background: '#9b5de5', color: '#fff' }}>
            Create New Book
          </button>
        </div>
      </div>
    )
  }

  if (!book.pages || book.pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d1b3e' }}>
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: '#fefcf5' }}>Book is still being generated...</p>
          <p className="mt-2 text-sm" style={{ color: '#a0b4d6' }}>Please wait a moment and refresh.</p>
        </div>
      </div>
    )
  }

  const hasTitlePage = !!book.titlePage
  const totalPages = book.pages.length + (hasTitlePage ? 1 : 0)
  const isTitlePage = hasTitlePage && currentPage === 0
  const contentPageIndex = hasTitlePage ? currentPage - 1 : currentPage
  const page = isTitlePage ? null : book.pages[contentPageIndex]

  // ── Video Modal ──
  const VideoModal = () => {
    if (!showVideoModal || !modalVideoUrl) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }} onClick={() => setShowVideoModal(false)}>
        <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl" style={{ background: '#0d1b3e', border: '2px solid rgba(155,93,229,0.4)' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #9b5de5, #ff5247)' }}>
            <div className="flex items-center gap-2 text-white font-bold text-sm">✨ Animated Illustration</div>
            <button onClick={() => setShowVideoModal(false)} className="text-white/80 hover:text-white text-xl transition-colors">✕</button>
          </div>
          <video src={modalVideoUrl} autoPlay loop controls playsInline className="w-full" style={{ maxHeight: '70vh', objectFit: 'contain', background: '#000' }} />
          <div className="flex justify-center gap-3 px-4 py-3" style={{ background: '#0d1b3e' }}>
            <a href={modalVideoUrl} download="animation.mp4" className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl transition-colors" style={{ background: '#9b5de5' }}>⬇ Download MP4</a>
            <button onClick={() => setShowVideoModal(false)} className="px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Animate Button ──
  const AnimateButton = ({ pageKey, pageIndex }: { pageKey: string; pageIndex: number }) => {
    const video = pageVideos[pageKey]
    const isAnimating = animatingPageKey === pageKey
    const progressPct = animateAvgTime > 0 ? Math.min(99, Math.round((animateElapsed / animateAvgTime) * 100)) : 0
    if (video) {
      return (
        <button onClick={() => { setModalVideoUrl(video); setShowVideoModal(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #9b5de5, #ff5247)' }}>
          ▶ Watch Animation
        </button>
      )
    }
    if (isAnimating) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-kq-spin" />
          <span>Animating… {animateQueueId ? `${progressPct}%` : 'starting'}</span>
        </div>
      )
    }
    return (
      <button onClick={() => handleAnimate(pageKey, pageIndex)} disabled={!!animatingPageKey}
        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'rgba(155,93,229,0.65)', border: '1.5px solid rgba(155,93,229,0.5)', backdropFilter: 'blur(8px)' }}>
        ✨ Animate
      </button>
    )
  }

  // ── Top Bar (shared between title page and content pages) ──
  const TopBar = () => (
    <div className="kq-top-bar">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/')} className="kq-icon-btn" title="Home">🏠</button>
        <button onClick={() => router.back()} className="kq-icon-btn" title="Back">←</button>
      </div>
      <div className="flex items-center gap-2 flex-1 justify-center px-2">
        <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: '0.95rem', color: '#fefcf5' }} className="truncate">
          {book.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: 'rgba(77,201,255,0.15)', border: '1.5px solid rgba(77,201,255,0.3)', color: '#4dc9ff' }}
          title="Share">
          ↗ <span className="hidden sm:inline">Share</span>
        </button>
        <button onClick={handleDownloadHTML}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: 'rgba(0,229,160,0.15)', border: '1.5px solid rgba(0,229,160,0.3)', color: '#00e5a0' }}
          title="Download HTML">
          {'</>'} <span className="hidden sm:inline">HTML</span>
        </button>
        <button onClick={handleDownloadPDF}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: 'rgba(255,82,71,0.15)', border: '1.5px solid rgba(255,82,71,0.3)', color: '#ff8a82' }}
          title="Download PDF">
          ⬇ <span className="hidden sm:inline">PDF</span>
        </button>
        {book.audioUrl ? (
          <button onClick={handleDownloadAudio}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{ background: 'rgba(155,93,229,0.15)', border: '1.5px solid rgba(155,93,229,0.3)', color: '#c89dff' }}
            title="Download MP3">
            🎧 <span className="hidden sm:inline">MP3</span>
          </button>
        ) : (
          <button onClick={handleGenerateAudio} disabled={isGeneratingAudio}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(77,201,255,0.15)', border: '1.5px solid rgba(77,201,255,0.3)', color: '#4dc9ff' }}
            title="Generate Audiobook">
            {isGeneratingAudio ? <><span className="animate-kq-spin">🎙</span> <span className="hidden sm:inline">Generating…</span></> : <><span>🎙</span> <span className="hidden sm:inline">Narrate</span></>}
          </button>
        )}
        {!book.songUrl && (
          <button onClick={handleGenerateSong} disabled={isGeneratingSong}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'rgba(0,196,180,0.15)', border: '1.5px solid rgba(0,196,180,0.3)', color: '#4fd6c6' }}
            title="Create an original theme song for this book">
            {isGeneratingSong ? <><span className="animate-kq-spin">🎵</span> <span className="hidden sm:inline">Composing…</span></> : <><span>🎵</span> <span className="hidden sm:inline">Theme Song</span></>}
          </button>
        )}
      </div>
    </div>
  )

  // ── Page Indicators ──
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

  // ── Nav Buttons ──
  const NavButtons = ({ onPrev, onNext, prevDisabled, nextDisabled }: {
    onPrev: () => void; onNext: () => void; prevDisabled: boolean; nextDisabled: boolean
  }) => (
    <div className="sticky bottom-0 py-3 px-4" style={{ background: 'rgba(8,15,36,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(77,201,255,0.1)' }}>
      <div className="flex justify-between gap-4 max-w-4xl mx-auto">
        <button
          onClick={onPrev} disabled={prevDisabled}
          className="flex h-12 items-center justify-center gap-2 px-6 rounded-full font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.15)', color: '#fefcf5' }}
        >
          ← Previous
        </button>
        <button
          onClick={onNext} disabled={nextDisabled}
          className="flex h-12 items-center justify-center gap-2 px-6 rounded-full font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: nextDisabled ? 'rgba(255,255,255,0.07)' : '#f5d000', color: nextDisabled ? '#a0b4d6' : '#0d1b3e', border: 'none', boxShadow: nextDisabled ? 'none' : '0 4px 0 #b89f00' }}
        >
          Next →
        </button>
      </div>
    </div>
  )

  // ── Shared page shell ──
  const pageShell = (children: React.ReactNode) => (
    <div className="kq-stars-bg relative flex min-h-screen w-full flex-col" style={{ background: '#080f24' }}>
      <VideoModal />
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )

  // ── Title Page ──
  if (isTitlePage && book.titlePage) {
    return pageShell(
      <>
        <TopBar />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full">
          <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl mb-4 transition-all duration-300 ${isPageTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <img src={book.titlePage.image} alt="Book Cover" className="w-full h-auto object-cover" />
            <div className="absolute bottom-3 right-3">
              <AnimateButton pageKey="-1" pageIndex={-1} />
            </div>
          </div>
        </main>
        <PageIndicators />
        <NavButtons
          onPrev={() => handlePageChange(0)} onNext={() => handlePageChange(1)}
          prevDisabled={true} nextDisabled={false}
        />
      </>
    )
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0d1b3e' }}>
        <p className="text-lg" style={{ color: '#fefcf5' }}>Invalid page</p>
      </div>
    )
  }

  // ── Content Page ──
  return pageShell(
    <>
      <TopBar />

      {/* Page counter badge */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="kq-chip kq-chip-electric">
          Page {currentPage + 1} of {totalPages}
        </div>
      </div>

      <main className="flex flex-1 flex-col px-4 py-3 max-w-4xl mx-auto w-full">
        {/* Illustration */}
        <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl mb-4 transition-all duration-300 ${isPageTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={{ border: '2px solid rgba(77,201,255,0.15)' }}>
          {page.image ? (
            <img src={page.image} alt={`Page ${currentPage + 1} illustration`} className="w-full h-auto object-cover animate-fadeIn" key={currentPage} />
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-6xl" style={{ background: 'linear-gradient(135deg, #1a1a6e, #2d1b5e)' }}>✨</div>
          )}
          {page.image && (
            <div className="absolute bottom-3 right-3">
              <AnimateButton pageKey={String(contentPageIndex)} pageIndex={contentPageIndex} />
            </div>
          )}
        </div>

        {/* Story text */}
        <div
          className={`rounded-2xl p-5 mb-3 transition-all duration-300 ${isPageTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
          style={{ background: 'rgba(26,42,94,0.7)', border: '1.5px solid rgba(77,201,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          <p className="text-base leading-relaxed font-medium animate-slideUp" style={{ color: '#e8f0ff', fontFamily: 'Nunito, sans-serif' }}>
            {page.text}
          </p>
        </div>

        {/* Audio player row (if audio exists) */}
        {book.audioUrl && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: 'rgba(77,201,255,0.08)', border: '1px solid rgba(77,201,255,0.2)' }}>
            <span className="text-lg">🎧</span>
            <audio ref={setAudioRef} controls className="flex-1 h-8" style={{ minWidth: 0 }}>
              <source src={book.audioUrl} type="audio/mpeg" />
            </audio>
          </div>
        )}

        {/* Theme song player (if a song exists) */}
        {book.songUrl && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: 'rgba(0,196,180,0.08)', border: '1px solid rgba(0,196,180,0.25)' }}>
            <span className="text-lg">🎵</span>
            <audio controls className="flex-1 h-8" style={{ minWidth: 0 }}>
              <source src={book.songUrl} />
            </audio>
            <a
              href={book.songUrl}
              download={`${(book.title || 'theme-song').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-theme.mp3`}
              className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(0,196,180,0.15)', border: '1px solid rgba(0,196,180,0.3)', color: '#4fd6c6' }}
              title="Download theme song"
            >
              ⬇
            </a>
          </div>
        )}
      </main>

      <PageIndicators />
      <NavButtons
        onPrev={() => handlePageChange(Math.max(0, currentPage - 1))}
        onNext={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
        prevDisabled={currentPage === 0}
        nextDisabled={currentPage === totalPages - 1}
      />

      <footer className="py-2 text-center" style={{ background: 'rgba(8,15,36,0.9)' }}>
        <p className="text-xs" style={{ color: '#a0b4d6' }}>
          Created with <span className="font-semibold" style={{ color: '#9b5de5' }}>Venice.ai</span>
        </p>
      </footer>
    </>
  )
}
