import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  try {
    const book = await getBook(params.bookId)

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      )
    }

    if (book.status !== 'completed') {
      return NextResponse.json(
        { error: 'Book is still being generated' },
        { status: 400 }
      )
    }

    // Generate HTML content for PDF
    const htmlContent = generatePDFHTML(book)

    // Launch puppeteer with @sparticuz/chromium for serverless environments
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    try {
      const page = await browser.newPage()
      
      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      })

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready')

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      })

      // Convert Buffer to Uint8Array for NextResponse
      const pdf = new Uint8Array(pdfBuffer)

      // Return PDF
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}

function generatePDFHTML(book: any): string {
  const pages = book.pages || []
  const titlePage = book.titlePage

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${book.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Quicksand', 'Comic Neue', cursive, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 30px;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    .cover {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      text-align: center;
    }
    
    .cover-image {
      width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      margin-bottom: 30px;
    }
    
    .cover-title {
      font-size: 42px;
      font-weight: 700;
      color: #4a5568;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    .cover-subtitle {
      font-size: 18px;
      color: #718096;
    }
    
    .content-page {
      background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
    }
    
    .page-image {
      width: 100%;
      max-height: 350px;
      object-fit: contain;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      margin-bottom: 30px;
    }
    
    .page-text {
      font-size: 18px;
      line-height: 1.8;
      color: #2d3748;
      text-align: center;
      max-width: 90%;
      padding: 25px;
      background: rgba(255,255,255,0.9);
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .page-number {
      position: absolute;
      bottom: 20px;
      font-size: 14px;
      color: #a0aec0;
    }
    
    .the-end {
      background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
    }
    
    .the-end h1 {
      font-size: 56px;
      color: #d63031;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.2);
    }
    
    @media print {
      body {
        background: white;
      }
      .page {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${titlePage ? `
  <!-- Cover Page -->
  <div class="page cover">
    <img src="${titlePage.image}" alt="${book.title}" class="cover-image">
    <h1 class="cover-title">${book.title}</h1>
    <p class="cover-subtitle">A KinderQuill Story</p>
  </div>
  ` : ''}
  
  ${pages.map((page: any, index: number) => `
  <!-- Page ${index + 1} -->
  <div class="page content-page">
    <img src="${page.image}" alt="Page ${index + 1}" class="page-image">
    <div class="page-text">
      ${page.text}
    </div>
  </div>
  `).join('')}
  
  <!-- The End Page -->
  <div class="page the-end">
    <h1>The End</h1>
    <p style="font-size: 20px; color: #636e72; margin-top: 20px;">
      Created with 💜 using KinderQuill
    </p>
  </div>
</body>
</html>`
}
