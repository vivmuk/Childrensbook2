import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  let browser: Browser | null = null
  try {
    const book = getBook(params.bookId)

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    if (book.status !== 'completed') {
      return NextResponse.json(
        { error: 'Book is not ready yet' },
        { status: 400 }
      )
    }

    // Get the base URL for generating absolute URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (request.headers.get('host') ? 
                   `https://${request.headers.get('host')}` : 
                   'http://localhost:3000')

    // Launch browser with system Chrome/Chromium
    // Railway has Chromium installed, so we can use it directly
    const chromiumPaths = [
      process.env.CHROMIUM_PATH,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ].filter(Boolean)

    let browserLaunched = false
    let lastError: Error | null = null

    for (const executablePath of chromiumPaths) {
      try {
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
          ],
          executablePath,
          headless: true,
        })
        browserLaunched = true
        break
      } catch (error: any) {
        lastError = error
        continue
      }
    }

    if (!browserLaunched || !browser) {
      throw new Error(`Failed to launch browser. Tried paths: ${chromiumPaths.join(', ')}. Last error: ${lastError?.message}`)
    }

    const page = await browser.newPage()
    
    // Navigate to the PDF view page
    const pdfUrl = `${baseUrl}/pdf/${params.bookId}`
    await page.goto(pdfUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // Wait a bit for fonts to load
    await page.waitForTimeout(1000)

    // Generate PDF with proper formatting for children's book
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    })

    await browser.close()

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      },
    })
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        // Ignore close errors
      }
    }
    console.error('Error generating PDF:', error)
    
    // Fallback: redirect to print page if puppeteer fails
    return NextResponse.redirect(new URL(`/pdf/${params.bookId}`, request.url))
  }
}

