'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface BookPage {
  text: string
  image: string
}

interface Book {
  id: string
  title: string
  pages: BookPage[]
  ageRange: string
  illustrationStyle: string
  audioUrl?: string
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
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/book/${bookId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch book')
        }
        const data = await response.json()
        setBook(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching book:', error)
        setIsLoading(false)
      }
    }

    fetchBook()
  }, [bookId])

  const handleGenerateAudio = async () => {
    if (!book) return

    setIsGeneratingAudio(true)
    try {
      const response = await fetch(`/api/generate-audio/${bookId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio')
      }

      const data = await response.json()
      setBook({ ...book, audioUrl: data.audioUrl })
    } catch (error) {
      console.error('Error generating audio:', error)
      alert('Failed to generate audio. Please try again.')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setIsPageTransitioning(true)
    setTimeout(() => {
      setCurrentPage(newPage)
      setIsPageTransitioning(false)
    }, 150)
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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;
      background: linear-gradient(to bottom right, #f3e8ff, #fce7f3, #fef3c7);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    .book-container {
      max-width: 800px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .page {
      display: none;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      animation: fadeIn 0.5s ease-in;
    }
    .page.active {
      display: flex;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .page-image {
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: zoomIn 0.6s ease-out;
    }
    @keyframes zoomIn {
      from { transform: scale(0.95); opacity: 0.8; }
      to { transform: scale(1); opacity: 1; }
    }
    .page-text {
      background: rgba(255, 255, 255, 0.9);
      padding: 24px;
      border-radius: 16px;
      font-size: 18px;
      line-height: 1.8;
      color: #1f2937;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      animation: slideUp 0.6s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .header {
      width: 100%;
      text-align: center;
      padding: 20px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 16px;
      margin-bottom: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .navigation {
      display: flex;
      justify-content: space-between;
      width: 100%;
      gap: 15px;
      margin-top: 20px;
      position: sticky;
      bottom: 20px;
    }
    .nav-button {
      flex: 1;
      padding: 15px 25px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .nav-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    .nav-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .nav-button.prev {
      background: #f3f4f6;
      color: #374151;
    }
    .nav-button.next {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
    }
    .page-indicators {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }
    .indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d1d5db;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .indicator.active {
      width: 32px;
      background: #3b82f6;
      border-radius: 4px;
    }
    @media (max-width: 768px) {
      .page-text {
        font-size: 16px;
        padding: 20px;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="book-container">
      <div class="header">
        <h1>${book.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
      </div>
      ${book.pages.map((page, index) => `
      <div class="page ${index === 0 ? 'active' : ''}" id="page-${index}">
        <img src="${page.image}" alt="Page ${index + 1}" class="page-image" />
        <div class="page-text">${page.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    `).join('')}
    <div class="page-indicators">
      ${book.pages.map((_, index) => `
        <div class="indicator ${index === 0 ? 'active' : ''}" onclick="goToPage(${index})"></div>
      `).join('')}
    </div>
    <div class="navigation">
      <button class="nav-button prev" onclick="previousPage()" id="prevBtn">
        ← Previous
      </button>
      <button class="nav-button next" onclick="nextPage()" id="nextBtn">
        Next →
      </button>
    </div>
  </div>
  <script>
    let currentPage = 0;
    const totalPages = ${book.pages.length};
    
    function showPage(index) {
      document.querySelectorAll('.page').forEach((page, i) => {
        page.classList.toggle('active', i === index);
      });
      document.querySelectorAll('.indicator').forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
      });
      document.getElementById('prevBtn').disabled = index === 0;
      document.getElementById('nextBtn').disabled = index === totalPages - 1;
    }
    
    function nextPage() {
      if (currentPage < totalPages - 1) {
        currentPage++;
        showPage(currentPage);
      }
    }
    
    function previousPage() {
      if (currentPage > 0) {
        currentPage--;
        showPage(currentPage);
      }
    }
    
    function goToPage(index) {
      currentPage = index;
      showPage(currentPage);
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') previousPage();
      if (e.key === 'ArrowRight') nextPage();
    });
    
    // Initialize
    showPage(0);
  </script>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
        <div className="text-center">
          <Icon name="auto_awesome" className="text-purple-500 animate-spin mb-4" size={64} />
          <p className="text-lg font-semibold text-gray-800">Loading book...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Book not found</p>
          <button
            onClick={() => router.push('/generate')}
            className="mt-4 rounded-lg bg-primary px-6 py-2 text-white hover:opacity-90"
          >
            Create New Book
          </button>
        </div>
      </div>
    )
  }

  if (!book.pages || book.pages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Book is still being generated...</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please wait a moment and refresh.</p>
        </div>
      </div>
    )
  }

  const page = book.pages[currentPage]
  const totalPages = book.pages.length

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-lg">Invalid page</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 dark:bg-gray-900/90 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
            title="Home"
          >
            <Icon name="home" className="text-purple-700 dark:text-purple-300" size={24} />
          </button>
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            title="Back"
          >
            <Icon name="arrow_back" className="text-gray-700 dark:text-gray-300" size={24} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA"
              alt="KinderQuill"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate px-4">
            {book.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHTML}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-all shadow-md hover:scale-110 active:scale-95"
            title="Download as HTML"
          >
            <Icon name="download" className="text-lg" size={24} />
          </button>
          {book.audioUrl ? (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-full px-3 py-2 border border-blue-200 dark:border-blue-800">
              <audio 
                ref={setAudioRef}
                controls 
                className="h-8 rounded-lg"
                style={{ minWidth: '140px', maxWidth: '200px' }}
              >
                <source src={book.audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          ) : (
            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:scale-110 active:scale-95"
              title="Generate Audio"
            >
              <Icon 
                name={isGeneratingAudio ? 'hourglass_empty' : 'volume_up'} 
                className={`text-lg ${isGeneratingAudio ? 'animate-spin' : ''}`}
                size={24} 
              />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col px-4 py-6 max-w-4xl mx-auto w-full">
        {/* Image with animation */}
        <div className={`w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-white dark:bg-gray-800 transition-all duration-500 ${
          isPageTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}>
          {page.image ? (
            <img
              src={page.image}
              alt={`Page ${currentPage + 1} illustration`}
              className="w-full h-auto object-cover animate-fadeIn"
              key={currentPage}
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 flex items-center justify-center">
              <Icon name="image" className="text-white/50 animate-pulse" size={64} />
            </div>
          )}
        </div>

        {/* Text with animation */}
        <div className={`bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 shadow-lg backdrop-blur-sm transition-all duration-500 ${
          isPageTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}>
          <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 font-medium animate-slideUp">
            {page.text}
          </p>
        </div>
      </main>

      {/* Page Indicators */}
      <div className="flex w-full flex-row items-center justify-center gap-2 py-4">
        {book.pages.map((_, index) => (
          <button
            key={index}
            onClick={() => handlePageChange(index)}
            className={`h-2 rounded-full transition-all duration-300 hover:scale-125 ${
              index === currentPage
                ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 shadow-lg'
                : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-1 justify-between gap-4 px-4 py-4 max-w-4xl mx-auto">
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-6 text-base font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <Icon name="chevron_left" size={24} />
            <span>Previous</span>
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 dark:from-blue-600 dark:hover:bg-blue-700 px-6 text-base font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            <span>Next</span>
            <Icon name="chevron_right" size={24} />
          </button>
        </div>
      </div>

      {/* Footer - Created with Venice.ai */}
      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div>
  )
}

