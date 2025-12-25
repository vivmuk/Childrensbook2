'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: '1st', label: '1st Grade' },
  { value: '2nd', label: '2nd Grade' },
  { value: '3rd', label: '3rd Grade' },
  { value: '4th', label: '4th Grade' },
  { value: '5th', label: '5th Grade' },
]

const ILLUSTRATION_STYLES = [
  'Japanese animation style',
  'Whimsical anime art style',
  'Vintage American cartoon',
  'Indian comic book art',
  'Classic adventure comic style',
]

const STORY_PROMPTS = [
  'A brave little mouse who dreams of becoming a space explorer',
  'A magical garden where plants tell stories and flowers sing',
  'A young knight who is afraid of the dark but must save the kingdom',
  'A shy robot who learns to make friends by sharing its inventions',
  'A curious rabbit who discovers a secret door in the forest',
  'A tiny dragon who cannot breathe fire but has a special hidden talent',
  'A young girl who finds a talking compass that leads to lost toys',
  'A brave squirrel who must save the forest from a mysterious silence',
  'A friendly monster who lives under a child\'s bed and protects them from bad dreams',
  'A magical paintbrush that brings drawings to life',
  'A little penguin who loves to dance but lives where everyone waddles',
  'A wise old tree that teaches children about nature through stories',
  'A brave little star who falls from the sky and must find its way home',
  'A young explorer who discovers a hidden underwater city',
  'A magical library where books choose their readers',
  'A little fox who learns that being different makes you special',
  'A cloud who cannot make rain and must find its purpose',
  'A brave butterfly who embarks on a journey across the seasons',
  'A young inventor who creates a machine that makes everyone smile',
  'A magical seed that grows into a tree of wishes',
]

// ... imports
import { useAuth } from '@/components/AuthContext'
import { LoginModal } from '@/components/LoginModal'

// ... 

export default function GeneratePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('Japanese animation style')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')

  // ... (getStyleInstruction)

  useEffect(() => {
    // ... (checkBookStatus)
    if (!bookId || !isGenerating) return

    const checkBookStatus = async () => {
      try {
        const response = await fetch(`/api/book-status/${bookId}`)
        if (response.ok) {
          const statusData = await response.json()
          if (statusData.status === 'completed') {
            setIsGenerating(false)

            // Track free book usage if unauthenticated
            if (!user) {
              localStorage.setItem('kinderquill_free_book_generated', 'true')
            }

            router.push(`/book/${bookId}`)
          } else if (statusData.status === 'generating') {
            // Estimate progress
            const totalPages = statusData.expectedPages || 8
            const completedPages = statusData.pages?.length || 0
            const progress = Math.min(95, (completedPages / totalPages) * 100)
            setGenerationProgress(progress)
          }
        }
      } catch (error) {
        console.error('Error checking book status:', error)
      }
    }

    const interval = setInterval(checkBookStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, isGenerating, router, user])

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      alert('Please enter a story idea!')
      return
    }

    // 1. Check Auth & Limit
    if (!user) {
      // Check if they already used their free book
      const hasGeneratedFree = localStorage.getItem('kinderquill_free_book_generated')
      if (hasGeneratedFree) {
        setLoginMessage('You have already created your free book! Please sign in to create more magical stories and save them to your library.')
        setShowLoginModal(true)
        return
      }
    }

    // If user is logged in, we let the API enforce the 20 limit (we could check here too if we fetched books beforehand)

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Get token if user is logged in
      let token = ''
      if (user) {
        token = await user.getIdToken()
      }

      const response = await fetch('/api/generate-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          storyIdea,
          ageRange,
          illustrationStyle: getStyleInstruction(illustrationStyle),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // If error is 403 (Limit reached), show alert
        if (response.status === 403) {
          alert(errorData.error)
          setIsGenerating(false)
          return
        }
        throw new Error('Failed to generate book')
      }

      const data = await response.json()
      setBookId(data.bookId)
      setGenerationProgress(10)
    } catch (error) {
      console.error('Error generating book:', error)
      alert('Failed to generate book. Please try again.')
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Header title="Create Your Story" />
      {/* ... rest of the UI ... */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />


      <main className="flex grow flex-col items-center justify-start px-4 py-2 text-center max-w-2xl mx-auto w-full overflow-y-auto min-h-0">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
            <GeneratingGame />
          </div>
        ) : (
          /* Form State */
          <>
            {/* Illustration - Minimized */}
            <div className="mx-auto w-full max-w-[120px] mb-3">
              <div
                className="aspect-square w-full bg-contain bg-center bg-no-repeat rounded-xl shadow-md"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgxAGWRCcBULUnJqgvIcpUDARPA6HA7Jb_Z7cn000bl7LhpJaR1tBxt1fQWawCmnHktpfoYxghCRPlScKpEASscjupGf2qyw7977OD8DfGtKx4x951NC9lcOP1NJCRH1Kz7bUfFD8DM83wqgdp1p6tZysZVzVx53nHdI90YRbv93DH-Zzw-M49l3Rj47z3GYwx5qB3I42dznDYBXX8tH4b_B4ki_jLaygEa7ila4gWFMlbAa-5pbPnIlpel_16bbI0MQJ7LNRHxw")',
                }}
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              Dream Up a Story
            </h1>

            {/* Story Input */}
            <div className="w-full mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your Story Idea
                </label>
                <button
                  onClick={() => {
                    const randomPrompt = STORY_PROMPTS[Math.floor(Math.random() * STORY_PROMPTS.length)]
                    setStoryIdea(randomPrompt)
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate a random story idea"
                >
                  <Icon name="auto_awesome" size={16} />
                  <span>Generate Idea</span>
                </button>
              </div>
              <textarea
                value={storyIdea}
                onChange={(e) => setStoryIdea(e.target.value)}
                className="w-full min-h-32 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-md transition-all resize-none"
                placeholder="A brave knight who is afraid of spiders, or a magical treehouse that travels through time..."
                disabled={isGenerating}
              />
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {showAdvanced ? (
                <span className="flex items-center gap-1">
                  <Icon name="expand_less" className="text-lg" size={20} />
                  Hide Advanced Options
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Icon name="expand_more" className="text-lg" size={20} />
                  Show Advanced Options
                </span>
              )}
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="w-full space-y-4 rounded-xl bg-white/90 dark:bg-gray-800/90 p-4 shadow-lg mb-3 backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="child_care" className="text-lg" size={20} />
                    Age Range
                  </label>
                  <select
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-base text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={isGenerating}
                  >
                    {AGE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="palette" className="text-lg" size={20} />
                    Illustration Style
                  </label>
                  <select
                    value={illustrationStyle}
                    onChange={(e) => setIllustrationStyle(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-base text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={isGenerating}
                  >
                    {ILLUSTRATION_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="w-full pt-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !storyIdea.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600 hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Icon name="sync" className="animate-spin" size={24} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" size={24} />
                    Generate My Book!
                    <Icon name="auto_awesome" size={24} />
                  </>
                )}
              </button>
            </div>
          </>
        )
        }
      </main>

      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div >
  )
}

