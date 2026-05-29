'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FeaturedBooksCarousel } from '@/components/FeaturedBooksCarousel'
import { HowItWorksModal } from '@/components/HowItWorksModal'

export default function WelcomePage() {
  const router = useRouter()
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <div
      className="kq-stars-bg relative flex min-h-screen w-full flex-col overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #1a0a3e 50%, #0d2a40 100%)' }}
    >
      {/* Content layer (above stars) */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-4 lg:px-8 py-10 max-w-lg lg:max-w-6xl mx-auto w-full">

        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-8">
          <div>
            <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.6rem', color: '#f5d000', lineHeight: 1 }}>
              KinderQuill
            </div>
            <div style={{ fontSize: '0.7rem', color: '#4dc9ff', fontWeight: 700, marginTop: 2 }}>
              ✦ Powered by Venice AI ✦
            </div>
          </div>
          <button
            onClick={() => router.push('/library')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(77,201,255,0.12)', border: '1.5px solid rgba(77,201,255,0.3)', color: '#4dc9ff' }}
          >
            📚 My Books
          </button>
        </div>

        {/* Desktop two-column hero (mobile keeps the original single-column stack) */}
        <div className="w-full lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-center lg:flex-1 lg:content-center">

        {/* Hero area */}
        <div className="relative flex justify-center mb-6 w-full lg:col-start-1 lg:row-start-1">
          {/* Decorative planets */}
          <div
            className="absolute animate-kq-float"
            style={{
              top: 8, left: '8%',
              width: 38, height: 38, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ff8a65, #d84315)',
              boxShadow: '0 0 16px rgba(255,138,101,0.4)',
              animationDelay: '0s',
            }}
          />
          <div
            className="absolute animate-kq-float"
            style={{
              top: 16, right: '10%',
              width: 26, height: 26, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #80deea, #00acc1)',
              boxShadow: '0 0 12px rgba(128,222,234,0.4)',
              animationDelay: '1s',
            }}
          />
          <div
            className="absolute animate-kq-float"
            style={{
              bottom: 0, right: '22%',
              width: 16, height: 16, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ce93d8, #7b1fa2)',
              animationDelay: '0.5s',
            }}
          />

          {/* Logo circle */}
          <div
            className="animate-hero-float relative z-10"
            style={{
              width: 160, height: 160, borderRadius: '50%',
              border: '4px solid #f5d000',
              boxShadow: '0 0 0 10px rgba(245,208,0,0.1), 0 16px 48px rgba(0,0,0,0.5)',
              background: 'linear-gradient(135deg, #152352, #1a0a3e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '5rem',
            }}
          >
            📖
          </div>
        </div>

        {/* Headline */}
        <div className="text-center lg:text-left mb-6 lg:col-start-1 lg:row-start-2">
          <h1 style={{ fontFamily: 'Fredoka One, cursive', lineHeight: 1.15 }} className="text-4xl lg:text-5xl mb-3">
            <span style={{ color: '#f5d000' }}>Magic Stories</span>
            <br />
            <span style={{ color: '#fefcf5' }}>Born From Your</span>
            <br />
            <span style={{ color: '#00e5a0' }}>Imagination ✦</span>
          </h1>
          <p className="font-body font-semibold text-sm lg:text-base max-w-xs lg:max-w-md mx-auto lg:mx-0 leading-relaxed" style={{ color: '#a0b4d6' }}>
            Create personalized AI storybooks with custom illustrations — in seconds!
          </p>
        </div>

        {/* Featured Books Carousel */}
        <div className="w-full mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1">
          <FeaturedBooksCarousel />
        </div>

        {/* Action buttons */}
        <div className="flex w-full flex-col items-center gap-3 lg:col-start-2 lg:row-start-2 lg:mt-6">
          <button
            onClick={() => router.push('/generate')}
            className="kq-btn-primary"
            style={{ fontSize: '1.3rem', padding: '18px 32px' }}
          >
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            Start Your Story!
            <span style={{ fontSize: '1.5rem' }}>📖</span>
          </button>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button onClick={() => router.push('/gallery')} className="kq-btn-secondary">
              🖼️ Gallery
            </button>
            <button onClick={() => router.push('/ai-stories')} className="kq-btn-secondary kq-btn-sky">
              🤖 AI Stories
            </button>
          </div>

          <button onClick={() => router.push('/video-studio')} className="kq-btn-secondary kq-btn-purple">
            🎬 AI Video Lab
          </button>

          <button
            onClick={() => setShowHowItWorks(true)}
            className="mt-1 text-sm font-semibold underline transition-colors"
            style={{ color: '#a0b4d6' }}
            onMouseOver={e => (e.currentTarget.style.color = '#fefcf5')}
            onMouseOut={e => (e.currentTarget.style.color = '#a0b4d6')}
          >
            How does it work?
          </button>
        </div>

        {/* Venice badge */}
        <div className="mt-8 lg:mt-6 text-center lg:text-left lg:col-start-1 lg:row-start-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }}
          >
            <span>⚡</span>
            <span className="font-body font-bold text-xs" style={{ color: '#a0b4d6' }}>
              Powered by <strong style={{ color: '#fff' }}>Venice.ai</strong> — private AI
            </span>
          </div>
        </div>

        </div>{/* end desktop two-column hero */}
      </div>

      {/* Footer */}
      <footer
        className="relative z-10 w-full py-3 text-center"
        style={{ background: 'rgba(10,18,48,0.9)', borderTop: '1px solid rgba(77,201,255,0.1)' }}
      >
        <p className="font-body text-xs font-medium" style={{ color: '#a0b4d6' }}>
          Created with <span className="font-bold text-white">Venice.ai</span>
        </p>
      </footer>

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  )
}
