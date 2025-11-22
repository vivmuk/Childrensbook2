'use client'

import { useState, useEffect } from 'react'
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
  'Japanese animation style',
  'Whimsical anime art style',
  'Vintage American cartoon',
  'Indian comic book art',
  'Classic adventure comic style',
]

export default function GeneratePage() {
  const router = useRouter()
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('Japanese animation style')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Map display names to actual style instructions for API
  const getStyleInstruction = (displayName: string): string => {
    const styleMap: Record<string, string> = {
      'Japanese animation style': 'Studio Ghibli',
      'Whimsical anime art style': 'Hayao Miyazaki style',
      'Vintage American cartoon': 'Midcentury American cartoon',
      'Indian comic book art': 'Amar Chitra Katha',
      'Classic adventure comic style': 'Chacha Chaudhary',
    }
    return styleMap[displayName] || displayName
  }

  useEffect(() => {
    if (!bookId || !isGenerating) return

    const checkBookStatus = async () => {
      try {
        const response = await fetch(`/api/book-status/${bookId}`)
        if (response.ok) {
          const statusData = await response.json()
          if (statusData.status === 'completed') {
            setIsGenerating(false)
            router.push(`/book/${bookId}`)
          } else if (statusData.status === 'generating') {
            // Estimate progress based on pages generated
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
  }, [bookId, isGenerating, router])

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      alert('Please enter a story idea!')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      const response = await fetch('/api/generate-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyIdea,
          ageRange,
          illustrationStyle: getStyleInstruction(illustrationStyle),
        }),
      })

      if (!response.ok) {
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
        {isGenerating ? (
          /* Generating State - Magic Screen */
          <div className="flex flex-col items-center justify-between w-full h-full">
            <div className="mt-12 w-full max-w-md text-center sm:mt-16">
              <h2 className="font-display text-4xl font-bold text-gray-800 dark:text-gray-100 sm:text-5xl mb-2 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-5xl text-yellow-400 animate-spin">auto_awesome</span>
                <span>Mixing the magic...</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg">Creating your storybook</p>
            </div>

            <div className="relative mb-4 mt-8 flex max-w-sm flex-grow items-end justify-center w-full">
              <div className="absolute inset-0">
                <img
                  className="h-full w-full object-bottom object-contain opacity-30 dark:opacity-20"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPefRPga_iFGmdwrUpNGUlM1IPtgS7kKBTI26TfUUe0LtS6CZfjsGWd4y0sxinCV4ilV4gHi0qUTNKyE8CB-UlCw3RI1Y92E0Ya8PfnHioyuQvZRYNK8DAO1PSTGH6Pcw680UGFKVervahwP2P277pERJuscfKe98q6ku9t5UegC8xcK-ovZEC2kk4GUiQz1lOZyaELz-TSKho6F9RynfVZNSAEBtr-YNeL3D_8CIKHV8BA4xWc2T1Lt03Yd5Wlbc53U9B1mz3TQ"
                  alt="A large, whimsical tree with many branches"
                />
              </div>

              <div className="absolute bottom-0 left-1/2 h-full w-full -translate-x-1/2">
                <div className="absolute bottom-[75%] left-[60%] h-16 w-16 -translate-x-1/2 animate-bounce" style={{ animationDelay: '0s' }}>
                  <span
                    className="material-symbols-outlined text-5xl text-pink-400 drop-shadow-lg dark:text-pink-500"
                    style={{ transform: 'rotate(15deg)' }}
                  >
                    filter_vintage
                  </span>
                </div>
                <div className="absolute bottom-[60%] right-[65%] h-12 w-12 animate-pulse" style={{ animationDelay: '0.5s' }}>
                  <span
                    className="material-symbols-outlined text-4xl text-purple-400 drop-shadow-lg dark:text-purple-500"
                    style={{ transform: 'rotate(-25deg)' }}
                  >
                    local_florist
                  </span>
                </div>
                <div className="absolute bottom-[40%] left-[70%] h-14 w-14 -translate-x-1/2 animate-bounce" style={{ animationDelay: '1s' }}>
                  <span
                    className="material-symbols-outlined text-5xl text-pink-400 drop-shadow-lg dark:text-pink-500"
                    style={{ transform: 'rotate(-10deg)' }}
                  >
                    filter_vintage
                  </span>
                </div>
                <div className="absolute bottom-[25%] right-[75%] h-16 w-16 animate-pulse" style={{ animationDelay: '1.5s' }}>
                  <span
                    className="material-symbols-outlined text-4xl text-purple-400 drop-shadow-lg dark:text-purple-500"
                    style={{ transform: 'rotate(20deg)' }}
                  >
                    local_florist
                  </span>
                </div>
              </div>

              <div className="absolute bottom-[75%] left-1/2 mb-4 -translate-x-1/2 animate-bounce" style={{ animationDelay: '0.75s' }}>
                <div className="relative h-20 w-20">
                  <img
                    className="h-full w-full object-contain drop-shadow-lg"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoUqt16DwM9LYqi669g9_oh0m5Km4_2DFQYbMninxdLX082Byou8X88oRzWJM16gEeZbRc0rTbeaCR6YZy0m7sE5RWt-ELkWy71T2R2avxHZXx07z4JtOLiHMEWB9a0MYDyoV-p37_ovATNJsmVh2bPrYAzp2SvgBN8Bhm_KJdjsmOnzM_isoTmQCoorxfg5gunjOyoZy_YGds639lxfjYLpFPWEJkZxF9KKzfR7qssC91wIST0FtHCtzrSk4WV57YfUuKbfasMg"
                    alt="A cute, cartoon squirrel climbing the tree"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8 w-full max-w-md rounded-2xl bg-white/80 dark:bg-gray-800/80 p-6 shadow-xl backdrop-blur-md sm:mb-12">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                    Stirring up your story...
                  </p>
                  <span className="material-symbols-outlined animate-spin text-blue-500">sync</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out" 
                    style={{ width: `${generationProgress}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Form State */
          <>
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
              disabled={isGenerating}
              className="mb-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {showAdvanced ? (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">expand_less</span>
                  Hide Advanced Options
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                  Show Advanced Options
                </span>
              )}
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="w-full space-y-4 rounded-xl bg-white/90 dark:bg-gray-800/90 p-6 shadow-lg mb-6 backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">child_care</span>
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
                    <span className="material-symbols-outlined text-lg">palette</span>
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
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600 hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Generate My Book!
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

