'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: '1st', label: '1st Grade' },
  { value: '2nd', label: '2nd Grade' },
  { value: '3rd', label: '3rd Grade' },
  { value: '4th', label: '4th Grade' },
  { value: '5th', label: '5th Grade' },
]

const ILLUSTRATION_STYLES = [
  'Studio Ghibli',
  'Hayao Miyazaki style',
  'Midcentury American cartoon',
  'Amar Chitra Katha',
  'Chacha Chaudhary',
]

export default function GeneratePage() {
  const router = useRouter()
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('Studio Ghibli')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      alert('Please enter a story idea!')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyIdea,
          ageRange,
          illustrationStyle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate book')
      }

      const data = await response.json()
      router.push(`/generating/${data.bookId}`)
    } catch (error) {
      console.error('Error generating book:', error)
      alert('Failed to generate book. Please try again.')
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-gray-800 dark:text-gray-100">
          Create Your Story
        </h2>
        <div className="w-10" />
      </div>

      <main className="flex grow flex-col items-center justify-center px-4 py-8 text-center max-w-2xl mx-auto w-full">
        {/* Illustration */}
        <div className="mx-auto w-full max-w-xs mb-8">
          <div
            className="aspect-square w-full bg-contain bg-center bg-no-repeat rounded-2xl shadow-lg"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgxAGWRCcBULUnJqgvIcpUDARPA6HA7Jb_Z7cn000bl7LhpJaR1tBxt1fQWawCmnHktpfoYxghCRPlScKpEASscjupGf2qyw7977OD8DfGtKx4x951NC9lcOP1NJCRH1Kz7bUfFD8DM83wqgdp1p6tZysZVzVx53nHdI90YRbv93DH-Zzw-M49l3Rj47z3GYwx5qB3I42dznDYBXX8tH4b_B4ki_jLaygEa7ila4gWFMlbAa-5pbPnIlpel_16bbI0MQJ7LNRHxw")',
            }}
          />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Dream Up a Story
        </h1>

        {/* Story Input */}
        <div className="w-full mb-6">
          <label className="flex flex-col">
            <textarea
              value={storyIdea}
              onChange={(e) => setStoryIdea(e.target.value)}
              className="w-full min-h-40 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-md transition-all resize-none"
              placeholder="A brave knight who is afraid of spiders, or a magical treehouse that travels through time..."
              disabled={isGenerating}
            />
          </label>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Options
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="w-full space-y-4 rounded-xl bg-white/90 dark:bg-gray-800/90 p-6 shadow-lg mb-6 backdrop-blur-sm">
            <div className="flex flex-col gap-2">
              <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
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
              <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
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
        <div className="w-full pt-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !storyIdea.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600 hover:shadow-xl active:scale-98"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">sync</span>
                Generating...
              </span>
            ) : (
              '✨ Generate My Book! ✨'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

