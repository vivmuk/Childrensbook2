import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'

export const metadata: Metadata = {
  title: 'KinderQuill - Create Magical Storybooks',
  description: 'Create magical, personalized storybooks for your little ones.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-display">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

