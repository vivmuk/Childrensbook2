import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import PDFDocument from 'pdfkit'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
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

    // Create a PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    })

    // Create a stream to collect PDF data
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Helper function to convert base64 image to buffer
    const base64ToBuffer = (base64: string): Buffer => {
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
      return Buffer.from(base64Data, 'base64')
    }

    // Helper function to add image to PDF with proper sizing
    const addImageToPage = (imageBase64: string, maxHeight?: number) => {
      try {
        const imageBuffer = base64ToBuffer(imageBase64)
        
        // Calculate dimensions to fit page while maintaining aspect ratio
        const pageWidth = doc.page.width - 100 // margins
        const availableHeight = maxHeight || (doc.page.height - 200) // Leave space for text
        
        // Use fit to maintain aspect ratio
        doc.image(imageBuffer, 50, 50, { 
          fit: [pageWidth, availableHeight],
          align: 'center',
        })
        
        return doc.y + 20 // Return Y position after image
      } catch (error) {
        console.error('Error adding image to PDF:', error)
        return 50
      }
    }

    // Add title page if it exists
    if (book.titlePage) {
      addImageToPage(book.titlePage.image)
      
      // Add title overlay with semi-transparent background
      doc.rect(0, doc.page.height / 2 - 60, doc.page.width, 120)
        .fillOpacity(0.7)
        .fillColor('#ffffff')
        .fill()
        .fillOpacity(1.0)
      
      doc.fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(book.title, 50, doc.page.height / 2 - 30, {
          align: 'center',
          width: doc.page.width - 100,
        })
      
      doc.addPage()
    }

    // Add content pages - image and text on same page
    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i]
      
      // Add image at top (taking up about 60% of page height)
      const imageHeight = (doc.page.height - 100) * 0.6
      const yAfterImage = addImageToPage(page.image, imageHeight)
      
      // Add text below image with beautiful formatting
      doc.fontSize(16)
        .font('Helvetica')
        .fillColor('#2d2d2d')
        .text(page.text, 50, yAfterImage, {
          align: 'left',
          width: doc.page.width - 100,
          lineGap: 6,
          paragraphGap: 4,
        })
      
      // Add page number at bottom
      doc.fontSize(10)
        .fillColor('#999999')
        .text(
          `Page ${page.pageNumber}`,
          50,
          doc.page.height - 40
        )
      
      if (i < book.pages.length - 1) {
        doc.addPage()
      }
    }

    // Finalize PDF
    doc.end()

    // Wait for PDF to be generated
    await new Promise<void>((resolve) => {
      doc.on('end', resolve)
    })

    // Combine all chunks
    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

