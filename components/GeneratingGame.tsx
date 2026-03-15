'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface GeneratingGameProps {
  progress?: number
}

// ── Game constants ──────────────────────────────────────────────────────────
const COLS = 20
const ROWS = 12
const CANVAS_W = 400
const CANVAS_H = 240
const CELL_W = CANVAS_W / COLS  // 20
const CELL_H = CANVAS_H / ROWS  // 20
const BASE_SPEED = 155 // ms per tick

// ── AI education facts ──────────────────────────────────────────────────────
const AI_FACTS = [
  '🤖 AI stands for Artificial Intelligence — it learns from examples, just like you do at school!',
  '🧠 The AI writing your story has learned from millions of children\'s books to understand what makes a great story!',
  '🎨 AI can generate unique illustrations that have never existed before in the history of the world!',
  '💡 Large Language Models (LLMs) are the type of AI creating your story — they predict the best next word!',
  '⚡ Venice AI runs powerful computers called GPUs to process your story and pictures at lightning speed!',
  '🔬 AI doesn\'t truly "think" or "feel" — it finds clever patterns in huge amounts of text and images!',
  '🚀 The first AI program was written in 1956 — modern AI has become millions of times more powerful since then!',
  '🎭 AI can write in different styles: funny, scary, adventurous, or calm — you choose the mood!',
  '🌟 Your story is completely unique — no one in the world has ever read exactly this story before!',
  '🦾 Venice AI keeps your stories private — your ideas belong to you!',
  '📚 Kids who read 20 minutes a day are exposed to 1.8 million words per year!',
  '🤔 When AI makes a mistake in a story, it\'s because it\'s still learning — just like all of us!',
]

// ── Generation step labels ──────────────────────────────────────────────────
const STEPS = [
  { emoji: '✨', label: 'Dreaming up your story...' },
  { emoji: '✍️', label: 'Writing magical words...' },
  { emoji: '🎨', label: 'Painting beautiful pictures...' },
  { emoji: '📚', label: 'Binding your book together...' },
]

// ── Types ───────────────────────────────────────────────────────────────────
type Dir = 'U' | 'D' | 'L' | 'R'
type Pt = { x: number; y: number }
type Phase = 'idle' | 'play' | 'over'

const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' }
const KEY_MAP: Record<string, Dir> = {
  ArrowUp: 'U', w: 'U', W: 'U',
  ArrowDown: 'D', s: 'D', S: 'D',
  ArrowLeft: 'L', a: 'L', A: 'L',
  ArrowRight: 'R', d: 'R', D: 'R',
}

function randFood(snake: Pt[]): Pt {
  let p: Pt
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
  } while (snake.some(s => s.x === p.x && s.y === p.y))
  return p
}

// ── Component ───────────────────────────────────────────────────────────────
export function GeneratingGame({ progress = 0 }: GeneratingGameProps) {
  const [factIdx, setFactIdx] = useState(0)
  const [showGame, setShowGame] = useState(true)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<Phase>('idle')
  const snakeRef = useRef<Pt[]>([{ x: 10, y: 6 }])
  const dirRef = useRef<Dir>('R')
  const nextDirRef = useRef<Dir>('R')
  const foodRef = useRef<Pt>({ x: 15, y: 6 })
  const scoreRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const touchStartRef = useRef<Pt | null>(null)

  // ── Rotate facts ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setFactIdx(i => (i + 1) % AI_FACTS.length), 6000)
    return () => clearInterval(t)
  }, [])

  // ── Canvas drawing ───────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    bg.addColorStop(0, '#1e1b4b')
    bg.addColorStop(0.5, '#3b0764')
    bg.addColorStop(1, '#4a044e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL_W, 0); ctx.lineTo(x * CELL_W, CANVAS_H); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL_H); ctx.lineTo(CANVAS_W, y * CELL_H); ctx.stroke()
    }

    // Draw snake segments
    const snake = snakeRef.current
    snake.forEach((seg, i) => {
      const isHead = i === 0
      const t = 1 - i / Math.max(snake.length, 1)
      ctx.fillStyle = isHead ? '#c084fc' : `rgba(139,92,246,${0.25 + t * 0.75})`

      const pad = isHead ? 1 : 2
      const rx = seg.x * CELL_W + pad
      const ry = seg.y * CELL_H + pad
      const rw = CELL_W - pad * 2
      const rh = CELL_H - pad * 2

      ctx.fillRect(rx, ry, rw, rh)
    })

    // Draw food (star)
    const fx = foodRef.current.x * CELL_W + CELL_W / 2
    const fy = foodRef.current.y * CELL_H + CELL_H / 2
    ctx.font = `${Math.round(CELL_W * 0.8)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⭐', fx, fy)

    // Score inside the canvas
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(4, 4, 60, 20)
    ctx.fillStyle = '#fde68a'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`⭐ ${scoreRef.current}`, 10, 14)

    // Overlay for idle / game over
    const p = phaseRef.current
    if (p === 'idle' || p === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.68)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (p === 'idle') {
        ctx.fillStyle = '#c084fc'
        ctx.font = 'bold 22px sans-serif'
        ctx.fillText('🐍 Snake Game', CANVAS_W / 2, CANVAS_H / 2 - 24)
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '13px sans-serif'
        ctx.fillText('Arrow keys / WASD   •   Swipe on mobile', CANVAS_W / 2, CANVAS_H / 2 + 2)
        ctx.fillStyle = '#a78bfa'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText('Tap or press any arrow key to start!', CANVAS_W / 2, CANVAS_H / 2 + 24)
      } else {
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 20px sans-serif'
        ctx.fillText('Game Over! 🎮', CANVAS_W / 2, CANVAS_H / 2 - 22)
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '14px sans-serif'
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 2)
        ctx.fillStyle = '#a78bfa'
        ctx.font = '12px sans-serif'
        ctx.fillText('Tap or press any key to play again', CANVAS_W / 2, CANVAS_H / 2 + 22)
      }
    }
  }, [])

  // ── Game logic ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const initSnake = [{ x: 10, y: 6 }]
    snakeRef.current = initSnake
    dirRef.current = 'R'
    nextDirRef.current = 'R'
    foodRef.current = randFood(initSnake)
    scoreRef.current = 0
    setScore(0)
    phaseRef.current = 'play'
    setPhase('play')
  }, [])

  const changeDir = useCallback((nd: Dir) => {
    if (phaseRef.current !== 'play') return
    if (nd !== OPPOSITE[dirRef.current]) {
      nextDirRef.current = nd
    }
  }, [])

  const tick = useCallback(() => {
    if (phaseRef.current !== 'play') return

    dirRef.current = nextDirRef.current
    const dir = dirRef.current
    const head = snakeRef.current[0]
    const next: Pt = {
      x: dir === 'L' ? head.x - 1 : dir === 'R' ? head.x + 1 : head.x,
      y: dir === 'U' ? head.y - 1 : dir === 'D' ? head.y + 1 : head.y,
    }

    // Wall collision
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      phaseRef.current = 'over'
      setPhase('over')
      setBest(b => Math.max(b, scoreRef.current))
      draw()
      return
    }

    // Self collision
    if (snakeRef.current.some(s => s.x === next.x && s.y === next.y)) {
      phaseRef.current = 'over'
      setPhase('over')
      setBest(b => Math.max(b, scoreRef.current))
      draw()
      return
    }

    const ate = next.x === foodRef.current.x && next.y === foodRef.current.y
    const newSnake = [next, ...snakeRef.current]
    if (!ate) {
      newSnake.pop()
    } else {
      const ns = scoreRef.current + 10
      scoreRef.current = ns
      setScore(ns)
      foodRef.current = randFood(newSnake)
    }

    snakeRef.current = newSnake
    draw()

    // Speed up as score grows
    const speed = Math.max(75, BASE_SPEED - Math.floor(scoreRef.current / 50) * 10)
    timerRef.current = setTimeout(tick, speed)
  }, [draw])

  // Start loop when phase becomes 'play'
  useEffect(() => {
    if (phase === 'play') {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(tick, BASE_SPEED)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, tick])

  // Initial draw
  useEffect(() => { draw() }, [showGame, draw])

  // ── Keyboard controls ────────────────────────────────────────────────────
  useEffect(() => {
    if (!showGame) return
    const onKey = (e: KeyboardEvent) => {
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      if (isArrow) e.preventDefault()

      if (phaseRef.current !== 'play') {
        startGame()
        return
      }
      const nd = KEY_MAP[e.key]
      if (nd && nd !== OPPOSITE[dirRef.current]) nextDirRef.current = nd
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showGame, startGame])

  // ── Touch controls (non-passive to prevent scroll) ───────────────────────
  useEffect(() => {
    if (!showGame) return
    const canvas = canvasRef.current
    if (!canvas) return

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY }
      if (phaseRef.current !== 'play') startGame()
    }

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      if (!touchStartRef.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStartRef.current.x
      const dy = t.clientY - touchStartRef.current.y
      touchStartRef.current = null
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return // tap, not swipe
      let nd: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')
      if (nd !== OPPOSITE[dirRef.current]) nextDirRef.current = nd
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [showGame, startGame])

  // ── Derived display values ───────────────────────────────────────────────
  const stepIdx = Math.min(Math.floor(progress / 25), STEPS.length - 1)

  const timeMsg = () => {
    if (progress < 5) return 'Starting up...'
    if (progress < 15) return '~2–3 min remaining'
    if (progress < 25) return 'Story written! Now illustrating pages...'
    if (progress < 55) return '~1–2 min remaining'
    if (progress < 80) return 'Painting the last few pages...'
    if (progress < 95) return 'Almost done! ~30 sec left'
    return 'Finishing touches...'
  }

  return (
    <div className="w-full max-w-md mx-auto px-2">
      <div className="bg-white/95 dark:bg-gray-800/95 rounded-3xl p-4 shadow-2xl border-2 border-purple-200 dark:border-purple-700">

        {/* Header */}
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Creating Your Story ✨
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="animate-pulse">{STEPS[stepIdx].emoji}</span>{' '}
            {STEPS[stepIdx].label}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">{timeMsg()}</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-6 mb-3">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex flex-col items-center transition-all ${i <= stepIdx ? 'opacity-100 scale-110' : 'opacity-30'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${i <= stepIdx ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-md' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {s.emoji}
              </div>
            </div>
          ))}
        </div>

        {/* Game toggle + score */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowGame(v => !v)}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
          >
            {showGame ? '🎮 Hide Snake' : '🐍 Play Snake While Waiting!'}
          </button>
          {showGame && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">
              ⭐ {score}{best > 0 ? ` · Best: ${best}` : ''}
            </span>
          )}
        </div>

        {/* Snake canvas */}
        {showGame && (
          <>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full rounded-none mb-1 cursor-pointer select-none block"
              style={{ touchAction: 'none' }}
              onClick={() => { if (phaseRef.current !== 'play') startGame() }}
            />

            {/* D-pad for mobile / touch users */}
            <div className="flex justify-center mb-2">
              <div className="grid grid-cols-3 gap-1 w-28">
                <div />
                <button
                  className="h-9 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-bold text-sm transition-colors select-none"
                  onPointerDown={() => { if (phaseRef.current !== 'play') startGame(); else changeDir('U') }}
                >▲</button>
                <div />
                <button
                  className="h-9 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-bold text-sm transition-colors select-none"
                  onPointerDown={() => { if (phaseRef.current !== 'play') startGame(); else changeDir('L') }}
                >◀</button>
                <button
                  className="h-9 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-lg text-xs font-bold transition-colors select-none"
                  onPointerDown={() => { if (phaseRef.current !== 'play') startGame() }}
                >▶︎</button>
                <button
                  className="h-9 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-bold text-sm transition-colors select-none"
                  onPointerDown={() => { if (phaseRef.current !== 'play') startGame(); else changeDir('R') }}
                >▶</button>
                <div />
                <button
                  className="h-9 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-bold text-sm transition-colors select-none"
                  onPointerDown={() => { if (phaseRef.current !== 'play') startGame(); else changeDir('D') }}
                >▼</button>
                <div />
              </div>
            </div>
          </>
        )}

        {/* AI education fact */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
          <div className="flex gap-2 items-start">
            <span className="text-base shrink-0">💡</span>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {AI_FACTS[factIdx]}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          Your magical book is being created with AI — worth every second! ✨
        </p>
      </div>
    </div>
  )
}
