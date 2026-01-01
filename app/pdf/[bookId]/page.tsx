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
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading book...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Book not found</p>
      </div>
    )
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/generate-pdf/${bookId}`)
      if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        window.print()
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      window.print()
    }
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
            gap: 10px;
          }
          
          .print-controls button {
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.2s;
          }
          
          .print-controls button:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          }
          
          @media print {
            .print-controls {
              display: none;
            }
          }
        `}</style>
        <button onClick={handleDownload}>
          <Icon name="download" size={20} />
          Download PDF
        </button>
        <button onClick={() => window.print()}>
          <span style={{ fontSize: '20px' }}>🖨️</span>
          Print
        </button>
      </div>
      
      <div className="pdf-container">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style jsx global>{`
        /* Common styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
            background: #f8f9fa;
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
            font-size: 12pt;
            font-weight: 400;
            line-height: 1.4;
            color: #1a1a1a;
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
            color: #999;
          }
        }
        
        /* Screen preview styles */
        @media screen {
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
          }
          
          .pdf-container {
            max-width: 650px;
            margin: 0 auto;
          }
          
          .page {
            background: white;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
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
            border-radius: 8px;
            background: #f8f9fa;
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
            font-size: clamp(12px, 2vw, 16px);
            font-weight: 400;
            line-height: 1.5;
            color: #1a1a1a;
            text-align: center;
            overflow: hidden;
          }
          
          .page-number {
            position: absolute;
            bottom: 12px;
            right: 20px;
            font-size: 12px;
            font-weight: 500;
            color: #999;
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

