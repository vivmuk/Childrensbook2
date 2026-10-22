'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { bookFileName, renderBookHTML, type ExportBook } from '@/lib/book-export'

/**
 * The print preview. It shows the book exactly as it will print, from the same
 * renderer the PDF file is made from, so what a parent sees here is what comes
 * out of the printer: one sheet per page, the cover whole, nothing cropped.
 *
 * "Download PDF" asks the server for a real PDF file. If the server cannot make
 * one (no Chromium in a dev container, say) it falls back to the browser's own
 * print dialog, where "Save as PDF" gives the same pages.
 */
export default function PDFViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const [book, setBook] = useState<ExportBook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const autoPrinted = useRef(false)

  useEffect(() => {
    fetch(`/api/book/${bookId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => setBook(data))
      .catch(() => setBook(null))
      .finally(() => setIsLoading(false))
  }, [bookId])

  const printFrame = () => {
    const w = frameRef.current?.contentWindow
    if (w) { w.focus(); w.print() } else window.print()
  }

  const handleDownload = async () => {
    if (!book) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/pdf/${bookId}`)
      if (!res.ok || !(res.headers.get('content-type') || '').includes('pdf')) throw new Error('no pdf')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = bookFileName(book.title, 'pdf')
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch {
      printFrame()
    } finally {
      setIsDownloading(false)
    }
  }

  // ?download=true opens straight into the print dialog once the pictures are in.
  const onFrameLoad = () => {
    if (autoPrinted.current || searchParams.get('download') !== 'true') return
    autoPrinted.current = true
    setTimeout(printFrame, 600)
  }

  if (isLoading) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <p className="text-kq-text">Setting the pages</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="kq-ground-flat flex min-h-screen items-center justify-center px-4">
        <p className="text-kq-text">We could not find this book</p>
      </div>
    )
  }

  return (
    <div className="kq-ground-flat flex min-h-[100dvh] flex-col">
      <div className="kq-top-bar">
        <button onClick={() => history.back()} className="kq-icon-btn" aria-label="Back">
          <Icon name="arrow_back" size={18} />
        </button>
        <span className="min-w-0 flex-1 truncate px-2 text-center font-display text-base text-kq-text">
          {book.title}
        </span>
        <div className="flex gap-2">
          <button onClick={printFrame} className="kq-btn-secondary !w-auto !px-3 !py-2 !text-sm" aria-label="Print">
            <Icon name="print" size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button onClick={handleDownload} disabled={isDownloading} className="kq-btn-primary !w-auto !px-4 !py-2 !text-sm">
            <Icon name="download" size={18} />
            {isDownloading ? 'Making PDF' : 'Download PDF'}
          </button>
        </div>
      </div>
      <p className="px-4 pt-3 text-center text-xs text-kq-dim">
        Each page prints on its own sheet, A4 landscape.
      </p>
      <iframe
        ref={frameRef}
        title={`${book.title}, print preview`}
        srcDoc={renderBookHTML(book, { mode: 'print' })}
        onLoad={onFrameLoad}
        className="w-full flex-1 border-0"
        style={{ minHeight: '80vh' }}
      />
    </div>
  )
}
