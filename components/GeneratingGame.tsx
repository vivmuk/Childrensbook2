'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from './Icons'

interface GeneratingGameProps {
  progress?: number
}

const FUN_FACTS = [
  "Did you know? The first children's picture book was published in 1658!",
  "Fun fact: Kids who read for 20 minutes a day are exposed to 1.8 million words per year!",
  "Magic happening: Your story is being written by AI trained on thousands of children's books!",
  "Story time: The best children's books have been read millions of times around the world!",
  "Creating wonder: Every illustration is being crafted just for your story!",
  "Book magic: Reading together builds stronger bonds between children and parents!",
  "Did you know? Children's books help develop empathy and emotional intelligence!",
  "Fun fact: Picture books help children learn to read by connecting words to images!",
  "Story magic: Your unique story has never existed before in the whole world!",
  "Creating memories: This book could become a treasured keepsake for years to come!",
]

const GENERATING_STEPS = [
  { icon: 'auto_awesome', text: 'Dreaming up your story...', color: 'text-purple-500' },
  { icon: 'edit_note', text: 'Writing magical words...', color: 'text-blue-500' },
  { icon: 'palette', text: 'Painting beautiful pictures...', color: 'text-pink-500' },
  { icon: 'auto_stories', text: 'Binding your book together...', color: 'text-amber-500' },
]

// Falling star interface
interface FallingStar {
  id: number
  x: number
  y: number
  emoji: string
  speed: number
  size: number
}

export function GeneratingGame({ progress = 0 }: GeneratingGameProps) {
  const [currentFact, setCurrentFact] = useState(0)
  const [showGame, setShowGame] = useState(true)
  const [score, setScore] = useState(0)
  const [stars, setStars] = useState<FallingStar[]>([])
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([])
  const gameRef = useRef<HTMLDivElement>(null)
  const nextStarId = useRef(0)
  const animationRef = useRef<number>()

  // Rotate fun facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % FUN_FACTS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Spawn new stars
  useEffect(() => {
    if (!showGame) return
    
    const spawnStar = () => {
      const emojis = ['⭐', '🌟', '✨', '💫', '🎁', '💎', '🦋', '🌸', '🍀', '🎈']
      const newStar: FallingStar = {
        id: nextStarId.current++,
        x: Math.random() * 85 + 5, // 5-90% of width
        y: -10,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        speed: 0.3 + Math.random() * 0.4, // Slower fall speed
        size: 24 + Math.floor(Math.random() * 16), // 24-40px
      }
      setStars(prev => [...prev, newStar])
    }

    const interval = setInterval(spawnStar, 1200) // Spawn every 1.2s
    return () => clearInterval(interval)
  }, [showGame])

  // Animate stars falling
  useEffect(() => {
    if (!showGame) return

    const animate = () => {
      setStars(prev => 
        prev
          .map(star => ({ ...star, y: star.y + star.speed }))
          .filter(star => star.y < 110) // Remove stars that fell off screen
      )
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [showGame])

  // Handle star click/tap
  const catchStar = useCallback((star: FallingStar, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Remove the star
    setStars(prev => prev.filter(s => s.id !== star.id))
    
    // Add score
    setScore(prev => prev + 10)
    
    // Add pop animation
    const popId = Date.now()
    setPops(prev => [...prev, { id: popId, x: star.x, y: star.y }])
    
    // Remove pop after animation
    setTimeout(() => {
      setPops(prev => prev.filter(p => p.id !== popId))
    }, 500)
  }, [])

  // Determine current step based on progress
  const currentStep = Math.min(Math.floor(progress / 25), GENERATING_STEPS.length - 1)

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/95 dark:bg-gray-800/95 rounded-3xl p-6 shadow-2xl backdrop-blur-md border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
        
        {/* Progress Section */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
            Creating Your Story
          </h2>
          <div className="flex items-center justify-center gap-2">
            <Icon 
              name={GENERATING_STEPS[currentStep].icon} 
              className={`${GENERATING_STEPS[currentStep].color} animate-pulse`} 
              size={18} 
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {GENERATING_STEPS[currentStep].text}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${Math.max(progress, 3)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-4 px-2">
          {GENERATING_STEPS.map((step, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}
              >
                <Icon name={step.icon} size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* Game Toggle */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setShowGame(!showGame)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            {showGame ? '🎮 Hide Game' : '🎮 Play Game While Waiting!'}
          </button>
        </div>

        {/* Star Catching Game */}
        {showGame && (
          <div 
            ref={gameRef}
            className="relative h-48 bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 rounded-xl overflow-hidden mb-4 cursor-pointer touch-none select-none"
            style={{ touchAction: 'none' }}
          >
            {/* Starry background */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                  }}
                />
              ))}
            </div>

            {/* Score */}
            <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm font-bold z-10">
              ⭐ {score}
            </div>

            {/* Instructions */}
            <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs z-10">
              Tap stars!
            </div>

            {/* Falling Stars */}
            {stars.map(star => (
              <button
                key={star.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 active:scale-90 cursor-pointer z-20"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  fontSize: `${star.size}px`,
                }}
                onClick={(e) => catchStar(star, e)}
                onTouchStart={(e) => catchStar(star, e)}
              >
                {star.emoji}
              </button>
            ))}

            {/* Pop Animations */}
            {pops.map(pop => (
              <div
                key={pop.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                style={{
                  left: `${pop.x}%`,
                  top: `${pop.y}%`,
                }}
              >
                <span className="text-yellow-300 font-bold text-sm animate-pop">+10</span>
              </div>
            ))}

            {/* Moon decoration */}
            <div className="absolute bottom-4 right-4 w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-full opacity-30" />
          </div>
        )}

        {/* Fun Fact */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 border border-purple-200 dark:border-purple-700">
          <div className="flex items-start gap-2">
            <span className="text-xl">💡</span>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {FUN_FACTS[currentFact]}
            </p>
          </div>
        </div>

        {/* Reassuring message */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
          Usually takes 1-2 minutes. Your magical story is worth the wait! ✨
        </p>
      </div>
    </div>
  )
}
