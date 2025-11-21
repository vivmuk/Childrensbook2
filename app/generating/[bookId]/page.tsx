'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function GeneratingPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  useEffect(() => {
    // Poll for book completion
    const checkBookStatus = async () => {
      try {
        const response = await fetch(`/api/book-status/${bookId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'completed') {
            router.push(`/book/${bookId}`)
          }
        }
      } catch (error) {
        console.error('Error checking book status:', error)
      }
    }

    const interval = setInterval(checkBookStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, router])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <div className="mt-12 w-full max-w-md text-center sm:mt-16">
        <h2 className="font-display text-4xl font-bold text-gray-800 dark:text-gray-100 sm:text-5xl mb-2">
          ✨ Mixing the magic...
        </h2>
        <p className="text-gray-600 dark:text-gray-300">Creating your storybook</p>
      </div>

      <div className="relative mb-4 mt-8 flex max-w-sm flex-grow items-end justify-center">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-bottom object-contain opacity-20 dark:opacity-10"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPefRPga_iFGmdwrUpNGUlM1IPtgS7kKBTI26TfUUe0LtS6CZfjsGWd4y0sxinCV4ilV4gHi0qUTNKyE8CB-UlCw3RI1Y92E0Ya8PfnHioyuQvZRYNK8DAO1PSTGH6Pcw680UGFKVervahwP2P277pERJuscfKe98q6ku9t5UegC8xcK-ovZEC2kk4GUiQz1lOZyaELz-TSKho6F9RynfVZNSAEBtr-YNeL3D_8CIKHV8BA4xWc2T1Lt03Yd5Wlbc53U9B1mz3TQ"
            alt="A large, whimsical tree with many branches"
          />
        </div>

        <div className="absolute bottom-0 left-1/2 h-full w-full -translate-x-1/2">
          <div className="absolute bottom-[75%] left-[60%] h-16 w-16 -translate-x-1/2 animate-bounce">
            <span
              className="material-symbols-outlined text-5xl text-pink-400 drop-shadow-lg dark:text-pink-500"
              style={{ transform: 'rotate(15deg)' }}
            >
              filter_vintage
            </span>
          </div>
          <div className="absolute bottom-[60%] right-[65%] h-12 w-12 animate-pulse">
            <span
              className="material-symbols-outlined text-4xl text-purple-400 drop-shadow-lg dark:text-purple-500"
              style={{ transform: 'rotate(-25deg)' }}
            >
              local_florist
            </span>
          </div>
        </div>

        <div className="absolute bottom-[75%] left-1/2 mb-4 -translate-x-1/2 animate-bounce" style={{ animationDelay: '0.5s' }}>
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
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

