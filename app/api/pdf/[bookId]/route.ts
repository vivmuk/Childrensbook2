import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import { bookFileName, renderBookHTML } from '@/lib/book-export'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export const maxDuration = 120

/**
 * The book as a real PDF file. It is rendered from exactly the same HTML as
 * the download and the print preview (lib/book-export.ts, print mode), so
 * every sheet is one A4 landscape page: the cover with its painted title,
 * then one page per story page, then The End.
 */
export async function GET(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    if (book.status !== 'completed') return NextResponse.json({ error: 'Book is still being generated' }, { status: 400 })

    const html = renderBookHTML(book, { mode: 'print', baseUrl: request.nextUrl.origin })

    // The container's Chromium when the Docker image provides one, otherwise
    // the serverless build.
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath())
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1123, height: 794 },
      executablePath,
      headless: true,
    })

    try {
      const page = await browser.newPage()
      await page.emulateMediaType('print')
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 })
      await page.evaluateHandle('document.fonts.ready')
      const pdf = await page.pdf({
        width: '297mm',
        height: '210mm',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${bookFileName(book.title, 'pdf')}"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error?.message)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
