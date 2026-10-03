'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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
}

/* The PDF view prints A4 pages, so the printed sheet stays plain white paper
   with black story text. Only the on-screen preview wears the night world:
   the app ground behind warm cream pages. Fonts come from the app (Fraunces
   for the story, Inter for the controls); no font CDN is fetched here. */
export default function PDFViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [downloadTriggered, setDownloadTriggered] = useState(false)

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

  // Auto-trigger print dialog for download
  useEffect(() => {
    if (!isLoading && book && searchParams.get('download') === 'true' && !downloadTriggered) {
      setDownloadTriggered(true)
      // Wait for images to load, then trigger print
      setTimeout(() => {
        window.print()
      }, 1000)
    }
  }, [isLoading, book, searchParams, downloadTriggered])

  if (isLoading) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <p className="text-kq-text">Loading book...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <p className="text-kq-text">Book not found</p>
      </div>
    )
  }

  const handleDownload = () => {
    window.print()
  }

  return (
    <>
      {/* Download/Print Controls - Hidden when printing */}
      <div className="print-controls">
        <style jsx>{`
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
            max-width: calc(100vw - 40px);
          }

          /* The design buttons stretch by default. On this floating bar they
             should hug their label instead. */
          .print-controls button {
            width: auto;
            padding: 12px 20px;
            font-size: 0.95rem;
          }

          @media print {
            .print-controls {
              display: none;
            }
          }
        `}</style>
        <button onClick={handleDownload} className="kq-btn-primary">
          <Icon name="download" size={20} />
          Download PDF
        </button>
        <button onClick={() => window.print()} className="kq-btn-secondary">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            print
          </span>
          Print
        </button>
      </div>

      <div className="pdf-container">
        <style jsx global>{`
        /* Common styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--kq-font-ui);
        }

        /* Print styles - optimized for single page per spread */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
          }

          .pdf-container {
            width: 100%;
            margin: 0;
            padding: 0;
          }

          .page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: column;
            background: white;
          }

          .page:last-child {
            page-break-after: auto;
          }

          /* Title Page - Full bleed cover */
          .title-page {
            width: 210mm;
            height: 297mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
          }

          .title-page img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Content Pages - Image on top, text below */
          .content-page {
            width: 210mm;
            height: 297mm;
            padding: 10mm 12mm 10mm 12mm;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            justify-content: space-between;
          }

          .image-container {
            width: 100%;
            height: 190mm;
            max-height: 190mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: white;
            flex-shrink: 0;
            margin-bottom: 6mm;
          }

          .page-image {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }

          .text-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0;
            min-height: 75mm;
            max-height: 80mm;
            overflow: hidden;
          }

          .page-text {
            font-family: var(--kq-font-display);
            font-size: 13pt;
            font-weight: 400;
            line-height: 1.45;
            color: black;
            text-align: center;
            overflow: hidden;
            word-wrap: break-word;
          }

          .page-number {
            position: absolute;
            bottom: 8mm;
            right: 15mm;
            font-size: 10pt;
            font-weight: 500;
            color: rgb(102, 102, 102);
          }
        }

        /* Screen preview styles */
        @media screen {
          body {
            background: linear-gradient(170deg, var(--kq-navy) 0%, var(--kq-plum) 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }

          .pdf-container {
            max-width: 650px;
            margin: 0 auto;
          }

          .page {
            background: var(--kq-cream);
            color: var(--kq-amber-ink);
            margin-bottom: 30px;
            border-radius: var(--kq-radius-lg);
            border: 1px solid var(--kq-line-soft);
            overflow: hidden;
            aspect-ratio: 210 / 297;
            display: flex;
            flex-direction: column;
          }

          /* Title Page Preview */
          .title-page {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            height: 100%;
          }

          .title-page img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Content Page Preview */
          .content-page {
            padding: 5% 6% 6% 6%;
            display: flex;
            flex-direction: column;
            height: 100%;
            position: relative;
          }

          .image-container {
            width: 100%;
            height: 65%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: var(--kq-radius);
            background: var(--kq-navy-mid);
            flex-shrink: 0;
          }

          .page-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .text-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 16px 10px 0 10px;
            min-height: 0;
          }

          .page-text {
            font-family: var(--kq-font-display);
            font-size: clamp(13px, 2vw, 17px);
            font-weight: 400;
            line-height: 1.5;
            color: var(--kq-amber-ink);
            text-align: center;
            overflow: hidden;
          }

          .page-number {
            position: absolute;
            bottom: 12px;
            right: 20px;
            font-size: 12px;
            font-weight: 500;
            color: var(--kq-dim);
          }
        }
      `}</style>

        {/* Title Page */}
        {book.titlePage && (
          <div className="page title-page">
            <img src={book.titlePage.image} alt={book.title} />
          </div>
        )}

        {/* Content Pages */}
        {book.pages.map((page, index) => (
          <div key={index} className="page content-page">
            <div className="image-container">
              <img src={page.image} alt={`Page ${index + 1}`} className="page-image" />
            </div>
            <div className="text-container">
              <div className="page-text">{page.text}</div>
            </div>
            <div className="page-number">Page {index + 1}</div>
          </div>
        ))}
      </div>
    </>
  )
}
