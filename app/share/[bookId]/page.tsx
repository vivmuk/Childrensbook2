'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface BookPage {
  pageNumber: number
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
}

/* The share page is what a family forwards to grandparents, so it reads like a
   real book: a painted plate, cream paper for the words, quiet page dots, and
   only one amber control (the invite to make their own). The top bar and the
   page controls hide when printed, so a forwarded printout is just the story. */

const LOGO_SRC = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA'

function ShareTopBar({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="kq-top-bar print:hidden">
      <div className="flex items-center gap-2.5">
        <span className="kq-cover flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
          <img src={LOGO_SRC} alt="KinderQuill" className="h-full w-full object-cover" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-kq-text">
          KinderQuill
        </span>
      </div>
      <button onClick={onCreate} className="kq-btn-primary w-auto px-5 py-2.5 text-sm">
        Create your own
      </button>
    </div>
  )
}

/* Page dots: the one amber mark on this screen is the active dot, which is an
   indicator, not a second action. */
function PageDots({
  totalPages,
  currentPage,
  onSelect,
}: {
  totalPages: number
  currentPage: number
  onSelect: (index: number) => void
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4 py-4 print:hidden">
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`kq-page-dot ${index === currentPage ? 'active' : ''}`}
          aria-label={`Go to page ${index + 1}`}
        />
      ))}
    </div>
  )
}

function ReaderNav({
  currentPage,
  totalPages,
  onGo,
}: {
  currentPage: number
  totalPages: number
  onGo: (page: number) => void
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-kq-line bg-kq-ink/85 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <button
          onClick={() => onGo(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="kq-btn-secondary w-auto px-5 py-3 text-sm"
        >
          <Icon name="chevron_left" size={20} />
          <span>Previous</span>
        </button>
        <button
          onClick={() => onGo(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage === totalPages - 1}
          className="kq-btn-secondary w-auto px-5 py-3 text-sm"
        >
          <span>Next</span>
          <Icon name="chevron_right" size={20} />
        </button>
      </div>
    </div>
  )
}

export default function SharePage() {
  const params = useParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)

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

  const handlePageChange = (newPage: number) => {
    setIsPageTransitioning(true)
    setTimeout(() => {
      setCurrentPage(newPage)
      setIsPageTransitioning(false)
    }, 150)
  }

  const handleCreateYourOwn = () => {
    window.location.href = '/generate'
  }

  if (isLoading) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Icon name="auto_awesome" className="animate-kq-spin text-kq-amber" size={56} />
          </div>
          <p className="text-lg text-kq-text">Loading story...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-lg text-kq-text">Story not found</p>
          <button onClick={handleCreateYourOwn} className="kq-btn-primary mt-5">
            Create your own story
          </button>
        </div>
      </div>
    )
  }

  // Calculate total pages including title page
  const hasTitlePage = !!book.titlePage
  const totalPages = book.pages.length + (hasTitlePage ? 1 : 0)
  const isTitlePage = hasTitlePage && currentPage === 0
  const contentPageIndex = hasTitlePage ? currentPage - 1 : currentPage
  const page = isTitlePage ? null : book.pages[contentPageIndex]

  // Title page view
  if (isTitlePage && book.titlePage) {
    return (
      <div className="kq-ground relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <ShareTopBar onCreate={handleCreateYourOwn} />

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-6">
          <div className="kq-cover mb-6 w-full">
            <img
              src={book.titlePage.image}
              alt={book.title}
              className="h-auto w-full object-cover"
            />
          </div>
          <h1 className="kq-hero-title text-center text-3xl">{book.title}</h1>
          <p className="mt-2 text-center text-kq-dim">A magical story created with KinderQuill</p>
        </main>

        <PageDots totalPages={totalPages} currentPage={currentPage} onSelect={handlePageChange} />
        <ReaderNav currentPage={currentPage} totalPages={totalPages} onGo={handlePageChange} />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <p className="text-lg text-kq-text">Invalid page</p>
      </div>
    )
  }

  return (
    <div className="kq-ground relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <ShareTopBar onCreate={handleCreateYourOwn} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {/* The painted plate */}
        <div
          className={`kq-cover mb-5 transition-all duration-500 ${
            isPageTransitioning ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {page.image ? (
            <img
              src={page.image}
              alt={`Page ${currentPage + 1} illustration`}
              className="h-auto w-full object-cover"
              key={currentPage}
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-kq-navy-mid">
              <Icon name="image" className="animate-progress-pulse text-kq-dim" size={56} />
            </div>
          )}
        </div>

        {/* The words, on cream paper */}
        <div
          className={`kq-sheet transition-all duration-500 ${
            isPageTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <p>{page.text}</p>
        </div>
      </main>

      <PageDots totalPages={totalPages} currentPage={currentPage} onSelect={handlePageChange} />
      <ReaderNav currentPage={currentPage} totalPages={totalPages} onGo={handlePageChange} />
    </div>
  )
}
