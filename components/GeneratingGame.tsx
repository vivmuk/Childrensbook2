'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from './Icons'

interface Star {
  id: number
  x: number
  y: number
  size: number
  speed: number
  type: 'star' | 'sparkle' | 'book'
}

export function GeneratingGame() {
  const [score, setScore] = useState(0)
  const [stars, setStars] = useState<Star[]>([])
  const [gameActive, setGameActive] = useState(true)
  const [missed, setMissed] = useState(0)
  const [combo, setCombo] = useState(0)

  const createStar = useCallback((): Star => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: -5,
      size: Math.random() * 20 + 15,
      speed: Math.random() * 2 + 1,
      type: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'sparkle' : 'book') : 'star',
    }
  }, [])

  useEffect(() => {
    if (!gameActive) return

    const interval = setInterval(() => {
      setStars((prev) => {
        const newStars = [...prev, createStar()]
        // Keep only last 20 stars for performance
        return newStars.slice(-20)
      })
    }, 800)

    return () => clearInterval(interval)
  }, [gameActive, createStar])

  useEffect(() => {
    if (!gameActive) return

    let animationId: number
    const animate = () => {
      setStars((prev) => {
        return prev
          .map((star) => ({
            ...star,
            y: star.y + star.speed * 0.5,
          }))
          .filter((star) => {
            if (star.y > 105) {
              setMissed((m) => m + 1)
              setCombo(0)
              return false
            }
            return true
          })
      })
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [gameActive])

  const handleStarClick = (star: Star) => {
    let points = 1
    if (star.type === 'sparkle') points = 2
    if (star.type === 'book') points = 3

    const comboBonus = combo > 0 ? Math.floor(combo / 3) : 0
    const totalPoints = points + comboBonus

    setScore((s) => s + totalPoints)
    setCombo((c) => c + 1)
    setStars((prev) => prev.filter((s) => s.id !== star.id))
  }

  const resetGame = () => {
    setScore(0)
    setMissed(0)
    setCombo(0)
    setStars([])
    setGameActive(true)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 shadow-xl backdrop-blur-md border-2 border-purple-200 dark:border-purple-800">
        {/* Game Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Catch the Magic! ✨</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Click the falling stars!</p>
          </div>
          <button
            onClick={resetGame}
            className="px-3 py-1.5 text-xs font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-200 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Score Display */}
        <div className="flex gap-4 mb-4 text-center">
          <div className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Score</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{score}</p>
          </div>
          <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Combo</p>
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{combo}x</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">Missed</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{missed}</p>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl overflow-hidden border-2 border-purple-200 dark:border-purple-800" style={{ height: '300px', position: 'relative' }}>
          {stars.map((star) => (
            <button
              key={star.id}
              onClick={() => handleStarClick(star)}
              className="absolute transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {star.type === 'star' && (
                <Icon name="star" className="text-yellow-400 drop-shadow-lg" size={star.size} />
              )}
              {star.type === 'sparkle' && (
                <Icon name="auto_awesome" className="text-pink-400 drop-shadow-lg animate-pulse" size={star.size} />
              )}
              {star.type === 'book' && (
                <Icon name="auto_stories" className="text-purple-500 drop-shadow-lg" size={star.size} />
              )}
            </button>
          ))}

          {/* Instructions Overlay (when no stars) */}
          {stars.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <Icon name="star" className="text-yellow-400 mx-auto mb-2 animate-bounce" size={48} />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Click the falling stars to score points!
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Books = 3pts • Sparkles = 2pts • Stars = 1pt
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            💡 Build combos for bonus points! • Don't let stars fall!
          </p>
        </div>
      </div>
    </div>
  )
}

