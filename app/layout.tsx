import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

/* Cosy Night-Light type: Fraunces for anything read (headlines, book pages,
   the library titles) and Inter for anything operated (buttons, labels,
   menus). Both are self-hosted by next/font, so there is no render-blocking
   request to a font CDN and no flash of the wrong face. */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KinderQuill - Make a picture book tonight',
  description:
    'Make a painted picture book for your little one in minutes. Describe an idea, we paint every page.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B1D3A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
