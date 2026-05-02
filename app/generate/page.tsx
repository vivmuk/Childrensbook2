'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingGame } from '@/components/GeneratingGame'
import { Header } from '@/components/Header'

// ── Static data ─────────────────────────────────────────────────────────────

const FREE_BOOK_LIMIT = 3

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten (age 5–6)' },
  { value: '1st', label: '1st Grade (age 6–7)' },
  { value: '2nd', label: '2nd Grade (age 7–8)' },
  { value: '3rd', label: '3rd Grade (age 8–9)' },
  { value: '4th', label: '4th Grade (age 9–10)' },
  { value: '5th', label: '5th Grade (age 10–11)' },
]

const ILLUSTRATION_STYLES = [
  { value: 'ghibli',          label: 'Anime Watercolor',    emoji: '🌸', prompt: 'Studio Ghibli anime style, soft watercolor backgrounds, detailed hand-drawn characters, warm lighting, magical realism, Hayao Miyazaki inspired, whimsical and dreamy atmosphere' },
  { value: 'american-classic',label: 'Classic Cartoon',     emoji: '🎨', prompt: 'Classic 1950s American cartoon style, bold outlines, bright primary colors, expressive characters, vintage Disney/Hanna-Barbera inspired, cheerful and nostalgic' },
  { value: 'watercolor',      label: 'Whimsical Watercolor',emoji: '💧', prompt: 'Soft whimsical watercolor illustration, gentle pastel colors, flowing brushstrokes, dreamy and ethereal, delicate details, storybook illustration style' },
  { value: 'amar-chitra',     label: 'Indian Illustrated',  emoji: '🏵️', prompt: 'Amar Chitra Katha Indian comic style, bold black outlines, vibrant colors, detailed traditional Indian art elements, expressive faces, classic Indian illustration' },
  { value: 'chacha-chaudhary',label: 'Retro Bold Comic',    emoji: '💥', prompt: 'Chacha Chaudhary Indian comic style, simple bold lines, flat bright colors, exaggerated expressions, humorous cartoon style, Pran Kumar Sharma inspired' },
  { value: 'tintin',          label: 'European Comic',      emoji: '🔎', prompt: 'Hergé Tintin clear line style (ligne claire), clean precise outlines, flat colors, detailed backgrounds, European comic book style, adventure illustration' },
]

const STORY_LENGTHS = [
  { value: '5',  label: 'Quick',    pages: 5,  description: '~1 min' },
  { value: '8',  label: 'Standard', pages: 8,  description: '~2 min' },
  { value: '12', label: 'Epic',     pages: 12, description: '~3 min' },
]

const CHARACTER_TYPES = [
  { value: 'animal',  label: '🐾 Animal',           description: 'Furry or feathered' },
  { value: 'person',  label: '👤 Person',            description: 'Boy, girl, or adult' },
  { value: 'fantasy', label: '🦄 Fantasy Creature',  description: 'Dragons, unicorns…' },
  { value: 'robot',   label: '🤖 Robot',             description: 'Mechanical friend' },
  { value: 'alien',   label: '👽 Alien',             description: 'From another world' },
]

const CHARACTER_TRAITS = [
  'brave', 'curious', 'kind', 'funny', 'shy', 'clever',
  'adventurous', 'gentle', 'mischievous', 'loyal', 'creative', 'determined',
]

const IMAGE_MODELS = [
  { value: 'grok-imagine-image', label: 'Grok Imagine',  description: 'Best for cartoon books (default)' },
  { value: 'flux-2-pro',         label: 'Flux 2 Pro',    description: 'High quality, detailed' },
  { value: 'recraft-v4',         label: 'Recraft v4',    description: 'Sharp, stylized' },
  { value: 'qwen-image',         label: 'Qwen Image',    description: 'Strong text rendering' },
]

const NARRATOR_VOICES = [
  { value: 'default', label: 'Default',  description: 'Warm and friendly' },
  { value: 'nova',    label: 'Nova',     description: 'Warm, slightly British' },
  { value: 'alloy',   label: 'Alloy',   description: 'Versatile, balanced' },
  { value: 'echo',    label: 'Echo',    description: 'Soft, gentle' },
  { value: 'fable',   label: 'Fable',   description: 'Perfect for storytelling' },
  { value: 'onyx',    label: 'Onyx',    description: 'Deep, calming' },
  { value: 'shimmer', label: 'Shimmer', description: 'Bright and cheerful' },
]

const STORY_TEMPLATES = [
  { id: 'bedtime',      name: '🌙 Bedtime',     description: 'Calm, soothing tales', prompt: 'A gentle bedtime story with a calm, soothing tone. Include soft imagery, peaceful settings, and a comforting ending that helps children relax and feel safe. The story should have a sleepy, dreamlike quality.', example: 'A little cloud who helps the moon put the stars to sleep' },
  { id: 'adventure',    name: '🗺️ Adventure',   description: 'Exciting journeys',    prompt: 'An exciting adventure story with brave characters, mysterious places to explore, and a quest or mission. Include moments of wonder, discovery, and triumph over challenges.', example: 'A young explorer who discovers a map to a hidden treasure' },
  { id: 'friendship',   name: '🤝 Friendship',  description: 'Kindness & connection',prompt: 'A heartwarming story about friendship, kindness, and connection. Show characters learning to understand each other, helping one another, and the joy of true friendship.', example: 'Two unlikely animals who become best friends' },
  { id: 'learning',     name: '📚 Learning',    description: 'Educational fun',      prompt: 'An educational story that teaches a valuable lesson or introduces interesting facts about nature, science, or the world. Make learning fun through engaging characters and situations.', example: 'A curious caterpillar who learns about metamorphosis' },
  { id: 'ai-adventure', name: '🤖 AI World',    description: 'Learn about AI magically', prompt: 'An educational and imaginative story that introduces children to Artificial Intelligence. Include a friendly AI or robot character who learns from examples, sometimes makes mistakes and improves, and helps people with kindness and creativity. Weave in age-appropriate concepts: AI learns from lots of data, AI can help with creative tasks, and humans and AI work best as partners. Make it magical, inspiring, and show that technology should be used responsibly and with heart.', example: 'A curious little robot named Pixel who learns to paint' },
  { id: 'birthday',     name: '🎂 Birthday',    description: 'Celebration special!', prompt: 'A festive birthday story full of joy, celebration, and special surprises. Include party elements, gifts, cake, and the magic of birthday wishes coming true.', example: 'A magical birthday party where balloons come to life' },
  { id: 'custom',       name: '✨ My Idea',      description: 'Your own unique tale', prompt: '', example: 'Write your own story idea below' },
]

const RANDOM_PROMPTS = [
  'A brave little mouse who dreams of becoming a space explorer',
  'A magical garden where plants tell stories and flowers sing',
  'A young knight who is afraid of the dark but must save the kingdom',
  'A curious little robot named Pixel who learns to paint by studying millions of beautiful pictures',
  'A friendly AI who lives inside a library and helps children find the perfect book',
  'A tiny dragon who cannot breathe fire but has a special hidden talent',
  'A young girl who finds a talking compass that leads to lost toys',
  'A brave squirrel who must save the forest from a mysterious silence',
  'A robot who learns that the best way to help people is to listen first',
  'A magical paintbrush that brings drawings to life',
  'A little penguin who loves to dance but lives where everyone waddles',
  'A wise old tree that teaches children about nature through stories',
  'A brave little star who falls from the sky and must find its way home',
  'A young explorer who discovers a hidden underwater city',
  'A magical library where books choose their readers',
]

// ── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_BOOK_COUNT = 'kinderquill_free_book_count'
const LS_API_KEY    = 'kinderquill_venice_api_key'
const LS_MY_BOOKS   = 'kinderquill_my_books'

function getFreeBookCount(): number {
  try { return parseInt(localStorage.getItem(LS_BOOK_COUNT) || '0', 10) || 0 } catch { return 0 }
}
function incrementFreeBookCount() {
  try { localStorage.setItem(LS_BOOK_COUNT, String(getFreeBookCount() + 1)) } catch {}
}
function saveBookToLibrary(meta: {
  id: string; title: string; ageRange: string; illustrationStyle: string;
  createdAt: string; titlePageImage?: string | null
}) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_MY_BOOKS) || '[]')
    const filtered = existing.filter((b: { id: string }) => b.id !== meta.id)
    filtered.unshift(meta)
    localStorage.setItem(LS_MY_BOOKS, JSON.stringify(filtered.slice(0, 50)))
  } catch {}
}

// ── Venice API Key Modal ─────────────────────────────────────────────────────

interface ApiKeyModalProps {
  onClose: () => void
  onSave: (key: string) => void
  booksUsed: number
}

function VeniceApiKeyModal({ onClose, onSave, booksUsed }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('')
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-3xl p-5 max-w-sm w-full shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ background: '#1a2a5e', border: '2px solid rgba(155,93,229,0.4)' }}
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🎉</div>
          <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.3rem', color: '#fefcf5' }}>
            {booksUsed >= FREE_BOOK_LIMIT ? `You've used all ${FREE_BOOK_LIMIT} free books!` : 'Add Your Venice API Key'}
          </h2>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: '#a0b4d6' }}>
            Get your own Venice AI API key with{' '}
            <span className="font-bold" style={{ color: '#00e5a0' }}>$10 in free credits</span> and generate unlimited books!
          </p>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.25)' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#a0b4d6' }}>
            <span className="font-bold" style={{ color: '#fefcf5' }}>Venice AI</span> is the AI service that powers your story and illustrations.
            Sign up with our link and get <span className="font-bold" style={{ color: '#00e5a0' }}>$10 in free credits</span> — enough for many books!
          </p>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-1" style={{ color: '#fefcf5' }}>
            🗝️ How to get your free API key:
          </h3>
          <ol className="space-y-2.5">
            {[
              { step: '1', text: 'Visit ', link: 'venice.ai/chat?ref=yN8qqI', href: 'https://venice.ai/chat?ref=yN8qqI', after: ' — get $10 free!' },
              { step: '2', text: 'Create a free account and sign in', link: '', href: '', after: '' },
              { step: '3', text: 'Click your profile → ', link: '"API Keys"', href: 'https://venice.ai/chat?ref=yN8qqI', after: '' },
              { step: '4', text: 'Click ', link: '"Create API Key"', href: '', after: ' and name it' },
              { step: '5', text: 'Copy your key and paste it below!', link: '', href: '', after: '' },
            ].map(({ step, text, link, href, after }) => (
              <li key={step} className="flex gap-2.5 items-start">
                <span
                  className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: '#9b5de5', color: '#fff' }}
                >{step}</span>
                <span className="text-sm" style={{ color: '#a0b4d6' }}>
                  {text}
                  {link && href && <a href={href} target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: '#9b5de5' }}>{link}</a>}
                  {link && !href && <span className="font-medium" style={{ color: '#fefcf5' }}>{link}</span>}
                  {after}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex justify-center mb-4">
          <a
            href="https://venice.ai/chat?ref=yN8qqI"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #9b5de5, #ff5247)' }}
          >
            🌐 Get $10 Free Credits on Venice.ai
          </a>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1" style={{ color: '#a0b4d6' }}>Paste Your Venice API Key</label>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="venice-api-..."
            className="kq-input"
          />
          <p className="text-xs mt-1.5" style={{ color: '#a0b4d6' }}>
            🔒 Stored only in your browser — never sent to our servers.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ border: '2px solid rgba(255,255,255,0.15)', color: '#a0b4d6', background: 'transparent' }}
          >Cancel</button>
          <button
            onClick={() => { const t = keyInput.trim(); if (!t) { alert('Please enter your Venice API key'); return } onSave(t) }}
            disabled={!keyInput.trim()}
            className="flex-[2] py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            style={{ background: 'linear-gradient(135deg, #9b5de5, #ff5247)' }}
          >Save &amp; Generate ✨</button>
        </div>
      </div>
    </div>
  )
}

// ── Free books counter badge ─────────────────────────────────────────────────

function FreeBooksBadge({ used, hasApiKey }: { used: number; hasApiKey: boolean }) {
  const remaining = Math.max(0, FREE_BOOK_LIMIT - used)

  if (hasApiKey) {
    return (
      <div className="w-full mb-3 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,229,160,0.08)', border: '1.5px solid rgba(0,229,160,0.25)' }}>
        <span className="text-lg">🔑</span>
        <p className="text-xs font-medium" style={{ color: '#00e5a0' }}>Venice API key active — unlimited books!</p>
      </div>
    )
  }

  if (remaining === 0) {
    return (
      <div className="w-full mb-3 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,82,71,0.08)', border: '1.5px solid rgba(255,82,71,0.3)' }}>
        <span className="text-lg">⚠️</span>
        <p className="text-xs" style={{ color: '#ff8a82' }}>
          <span className="font-bold">All {FREE_BOOK_LIMIT} free books used.</span>{' '}
          Get your own API key from{' '}
          <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="underline font-bold">Venice.ai</a>
          {' '}— includes <span className="font-bold">$10 in free credits</span>!
        </p>
      </div>
    )
  }

  return (
    <div className="w-full mb-3 rounded-xl px-3 py-2" style={{ background: 'rgba(0,229,160,0.06)', border: '1.5px solid rgba(0,229,160,0.2)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎁</span>
          <p className="text-xs font-bold" style={{ color: '#00e5a0' }}>
            {remaining} free {remaining === 1 ? 'book' : 'books'} remaining
          </p>
        </div>
        <span className="text-xs font-semibold" style={{ color: '#a0b4d6' }}>{used}/{FREE_BOOK_LIMIT} used</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: FREE_BOOK_LIMIT }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-all`}
            style={{ background: i < used ? '#00e5a0' : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <p className="text-xs mt-1" style={{ color: '#a0b4d6' }}>
        {FREE_BOOK_LIMIT} books free, then get your own API key from{' '}
        <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="underline font-bold" style={{ color: '#9b5de5' }}>Venice.ai</a>
        {' '}with <span className="font-bold">$10 in free credits</span>!
      </p>
    </div>
  )
}

// ── Main page component ──────────────────────────────────────────────────────

export default function GeneratePage() {
  const router = useRouter()

  // Form state
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('ghibli')
  const [storyLength, setStoryLength] = useState('8')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [narratorVoice, setNarratorVoice] = useState('default')
  const [imageModel, setImageModel] = useState('grok-imagine-image')

  // Character Builder
  const [characterName, setCharacterName] = useState('')
  const [characterType, setCharacterType] = useState('animal')
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['brave', 'curious'])
  const [showCharacterBuilder, setShowCharacterBuilder] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Venice API key
  const [userApiKey, setUserApiKey] = useState<string>('')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [freeBookCount, setFreeBookCount] = useState(0)
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInputValue, setApiKeyInputValue] = useState('')

  // Cartoon hero state
  const [heroPhotoDataUrl, setHeroPhotoDataUrl] = useState<string | null>(null)
  const [cartoonHeroDataUrl, setCartoonHeroDataUrl] = useState<string | null>(null)
  const [isCartoonifying, setIsCartoonifying] = useState(false)
  const [cartoonError, setCartoonError] = useState('')
  const heroFileInputRef = useRef<HTMLInputElement>(null)

  const pendingMetaRef = useRef<{ ageRange: string; illustrationStyle: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idea = params.get('idea')
    const age = params.get('ageRange')
    const style = params.get('illustrationStyle')
    if (idea) setStoryIdea(idea)
    if (age) setAgeRange(age)
    if (style) setIllustrationStyle(style)
    const savedKey = localStorage.getItem(LS_API_KEY)
    if (savedKey) setUserApiKey(savedKey)
    setFreeBookCount(getFreeBookCount())
  }, [])

  useEffect(() => {
    if (!bookId || !isGenerating) return
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/book-status/${bookId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed') {
            setIsGenerating(false)
            incrementFreeBookCount()
            const newCount = getFreeBookCount()
            setFreeBookCount(newCount)
            const meta = pendingMetaRef.current
            saveBookToLibrary({ id: bookId, title: data.title || 'My Story', ageRange: meta?.ageRange || ageRange, illustrationStyle: meta?.illustrationStyle || illustrationStyle, createdAt: data.createdAt || new Date().toISOString(), titlePageImage: data.titlePageImage ?? null })
            router.push(`/book/${bookId}`)
          } else if (data.status === 'generating') {
            setGenerationProgress(Math.min(95, data.progress || 0))
          } else if (data.status === 'error') {
            setIsGenerating(false)
            alert('Something went wrong while generating your book. Please try again.')
          }
        }
      } catch { /* ignore transient errors */ }
    }
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, isGenerating, router, ageRange, illustrationStyle])

  const handleHeroImageLoad = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { setHeroPhotoDataUrl(e.target?.result as string); setCartoonHeroDataUrl(null); setCartoonError('') }
    reader.readAsDataURL(file)
  }, [])

  const handleCartoonify = async () => {
    if (!heroPhotoDataUrl) return
    setIsCartoonifying(true); setCartoonError('')
    try {
      const res = await fetch('/api/cartoonify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: heroPhotoDataUrl, userApiKey: userApiKey || undefined }) })
      const data = await res.json()
      if (!res.ok) { setCartoonError(data.error || 'Failed to cartoonify. Please try again.') } else { setCartoonHeroDataUrl(data.cartoonImage) }
    } catch (err: any) { setCartoonError(err.message || 'Failed to cartoonify.') } finally { setIsCartoonifying(false) }
  }

  const doGenerate = async (overrideApiKey?: string) => {
    setIsGenerating(true); setGenerationProgress(0)
    pendingMetaRef.current = { ageRange, illustrationStyle }
    try {
      const template = STORY_TEMPLATES.find(t => t.id === selectedTemplate)
      let fullStoryIdea = template && template.id !== 'custom' ? `${template.prompt}\n\nStory idea: ${storyIdea}` : storyIdea
      if (showCharacterBuilder && characterName) {
        fullStoryIdea = `The main character is ${characterName}, a ${characterType} who is ${selectedTraits.join(', ')}.\n\n${fullStoryIdea}`
      }
      const effectiveApiKey = overrideApiKey || userApiKey
      const res = await fetch('/api/generate-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyIdea: fullStoryIdea, ageRange,
          illustrationStyle: ILLUSTRATION_STYLES.find(s => s.value === illustrationStyle)?.prompt || illustrationStyle,
          storyLength: parseInt(storyLength), narratorVoice, imageModel,
          userVeniceApiKey: effectiveApiKey || undefined,
          cartoonHeroImage: cartoonHeroDataUrl || undefined,
          character: showCharacterBuilder ? { name: characterName, type: characterType, traits: selectedTraits } : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 403) { alert(err.error); setIsGenerating(false); return }
        throw new Error(err.error || 'Failed to generate book')
      }
      const data = await res.json()
      setBookId(data.bookId); setGenerationProgress(5)
    } catch (err: any) {
      console.error('Generation error:', err)
      const msg = err.message || ''
      const isNetworkError = msg === 'fetch failed' || msg === 'Failed to fetch' || msg.includes('network')
      if (isNetworkError) {
        alert('The connection timed out — your story may still be generating. Wait 30 seconds and check your Library.')
      } else { alert(msg || 'Failed to generate book. Please try again.') }
      setIsGenerating(false); setGenerationProgress(0)
    }
  }

  const handleGenerate = async () => {
    if (!storyIdea.trim()) { alert('Please enter a story idea!'); return }
    if (freeBookCount >= FREE_BOOK_LIMIT && !userApiKey) { setShowApiKeyModal(true); return }
    await doGenerate()
  }

  const handleApiKeySave = (key: string) => {
    localStorage.setItem(LS_API_KEY, key); setUserApiKey(key); setShowApiKeyModal(false); doGenerate(key)
  }

  const timeEstimate = storyLength === '5' ? '~1 min' : storyLength === '8' ? '~2 min' : '~3–4 min'

  // ── Shared select style ──
  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(77,201,255,0.25)',
    borderRadius: 12,
    padding: '12px 14px',
    color: '#fefcf5',
    fontFamily: 'Nunito, sans-serif',
    fontSize: '0.9rem',
    fontWeight: 700,
    outline: 'none',
  }

  return (
    <div
      className="kq-stars-bg relative flex min-h-screen w-full flex-col overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1b3e 0%, #110d2e 100%)' }}
    >
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header title="Create Your Story ✨" />

        {showApiKeyModal && (
          <VeniceApiKeyModal
            onClose={() => setShowApiKeyModal(false)}
            onSave={handleApiKeySave}
            booksUsed={freeBookCount}
          />
        )}

        <main className="flex grow flex-col items-center justify-start px-4 py-4 max-w-2xl mx-auto w-full">
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
              <GeneratingGame progress={generationProgress} />
            </div>
          ) : (
            <>
              {/* Free books counter */}
              <FreeBooksBadge used={freeBookCount} hasApiKey={!!userApiKey} />

              {/* API key management */}
              {userApiKey ? (
                <div className="w-full mb-3 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                  style={{ background: 'rgba(0,229,160,0.06)', border: '1.5px solid rgba(0,229,160,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔑</span>
                    <p className="text-xs" style={{ color: '#a0b4d6' }}>Venice API key saved — unlimited books!</p>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem(LS_API_KEY); setUserApiKey('') }}
                    className="text-xs underline" style={{ color: '#ff5247' }}
                  >Remove</button>
                </div>
              ) : (
                <div className="w-full mb-3">
                  {!showApiKeyInput ? (
                    <button
                      onClick={() => setShowApiKeyInput(true)}
                      className="w-full text-xs border border-dashed rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 transition-colors"
                      style={{ borderColor: 'rgba(155,93,229,0.4)', color: '#c89dff', background: 'transparent' }}
                    >
                      🔑 Have a Venice API key? Add it for unlimited books
                    </button>
                  ) : (
                    <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)' }}>
                      <p className="text-xs mb-2 font-semibold" style={{ color: '#c89dff' }}>
                        Enter your Venice AI API key.{' '}
                        <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="underline">
                          Get one free ($10 credits) →
                        </a>
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKeyInputValue}
                          onChange={e => setApiKeyInputValue(e.target.value)}
                          placeholder="venice-api-..."
                          className="kq-input flex-1"
                          style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        />
                        <button
                          onClick={() => { const t = apiKeyInputValue.trim(); if (!t) return; localStorage.setItem(LS_API_KEY, t); setUserApiKey(t); setApiKeyInputValue(''); setShowApiKeyInput(false) }}
                          disabled={!apiKeyInputValue.trim()}
                          className="px-3 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                          style={{ background: '#9b5de5' }}
                        >Save</button>
                        <button onClick={() => { setShowApiKeyInput(false); setApiKeyInputValue('') }} className="px-2 py-1.5 text-xs" style={{ color: '#a0b4d6' }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Story Templates */}
              <div className="w-full mb-4">
                <div className="kq-section-label">📖 Story Type</div>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {STORY_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template.id)
                        if (template.id !== 'custom' && !storyIdea) setStoryIdea(template.example)
                      }}
                      className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold transition-all"
                      style={{
                        border: `2px solid ${selectedTemplate === template.id ? '#f5d000' : 'rgba(255,255,255,0.12)'}`,
                        background: selectedTemplate === template.id ? 'rgba(245,208,0,0.1)' : 'rgba(255,255,255,0.04)',
                        color: selectedTemplate === template.id ? '#f5d000' : '#a0b4d6',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
                {selectedTemplate === 'ai-adventure' && (
                  <div className="mt-2 p-2.5 rounded-xl" style={{ background: 'rgba(77,201,255,0.08)', border: '1px solid rgba(77,201,255,0.2)' }}>
                    <p className="text-xs" style={{ color: '#4dc9ff' }}>
                      🤖 <span className="font-semibold">AI Adventure</span> — Teaches kids about AI through a magical story!
                    </p>
                  </div>
                )}
              </div>

              {/* Story Input */}
              <div className="w-full mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="kq-section-label mb-0">💡 Your Story Idea</div>
                  <button
                    onClick={() => setStoryIdea(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)])}
                    className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                    style={{ background: 'rgba(245,208,0,0.1)', border: '1.5px solid rgba(245,208,0,0.3)', color: '#f5d000' }}
                  >
                    🎲 Random
                  </button>
                </div>
                <textarea
                  value={storyIdea}
                  onChange={e => setStoryIdea(e.target.value)}
                  className="kq-input"
                  rows={3}
                  placeholder={STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.example || 'A brave knight afraid of spiders, or a magical treehouse that travels through time...'}
                />
              </div>

              {/* Cartoon Hero Section */}
              <div className="w-full mb-4 rounded-2xl p-4"
                style={{ background: 'rgba(155,93,229,0.07)', border: '2px solid rgba(155,93,229,0.25)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#c89dff', fontFamily: 'Fredoka One, cursive' }}>
                      ⭐ Make Your Child the Hero!
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: '#a0b4d6' }}>
                      Upload a photo and AI will cartoon-ify them into the story
                    </p>
                  </div>
                </div>

                {!heroPhotoDataUrl ? (
                  <button
                    onClick={() => heroFileInputRef.current?.click()}
                    className="w-full py-4 px-3 flex items-center justify-center gap-3 cursor-pointer rounded-xl transition-colors"
                    style={{ border: '2px dashed rgba(155,93,229,0.35)', background: 'rgba(155,93,229,0.04)' }}
                  >
                    <span className="text-3xl">📷</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: '#c89dff' }}>Upload a photo of your child</p>
                      <p className="text-xs" style={{ color: '#a0b4d6' }}>JPG or PNG, portrait works best</p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold mb-1 text-center" style={{ color: '#a0b4d6' }}>Original</p>
                        <div className="relative">
                          <img src={heroPhotoDataUrl} alt="Child photo" className="w-full h-36 object-cover rounded-xl" style={{ border: '2px solid rgba(255,255,255,0.1)' }} />
                          <button
                            onClick={() => { setHeroPhotoDataUrl(null); setCartoonHeroDataUrl(null); setCartoonError('') }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center"
                            style={{ background: '#ff5247' }}
                          >✕</button>
                        </div>
                      </div>
                      <div className="flex items-center pt-5">
                        <span style={{ color: '#c89dff', fontSize: '1.2rem' }}>→</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold mb-1 text-center" style={{ color: '#a0b4d6' }}>Cartoon Hero</p>
                        {cartoonHeroDataUrl ? (
                          <img src={cartoonHeroDataUrl} alt="Cartoon hero" className="w-full h-36 object-cover rounded-xl" style={{ border: '2px solid rgba(155,93,229,0.5)' }} />
                        ) : (
                          <div className="w-full h-36 rounded-xl flex items-center justify-center" style={{ border: '2px dashed rgba(155,93,229,0.3)', background: 'rgba(155,93,229,0.04)' }}>
                            {isCartoonifying ? (
                              <div className="text-center">
                                <div className="text-2xl animate-kq-spin mb-1">🎨</div>
                                <p className="text-xs" style={{ color: '#c89dff' }}>Drawing...</p>
                              </div>
                            ) : (
                              <div className="text-center px-2">
                                <div className="text-2xl mb-1">🖼️</div>
                                <p className="text-xs" style={{ color: '#a0b4d6' }}>Click below</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {cartoonError && <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#ff8a82', background: 'rgba(255,82,71,0.08)' }}>{cartoonError}</p>}
                    {!cartoonHeroDataUrl ? (
                      <button
                        onClick={handleCartoonify} disabled={isCartoonifying}
                        className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #9b5de5, #ff5247)' }}
                      >
                        {isCartoonifying ? <><span className="animate-kq-spin">🎨</span> Creating...</> : <><span>✨</span> Cartoonify!</>}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
                          <span>✅</span>
                          <p className="text-xs font-semibold" style={{ color: '#00e5a0' }}>Cartoon hero ready!</p>
                        </div>
                        <button onClick={() => { setCartoonHeroDataUrl(null); setCartoonError('') }} className="px-3 py-2 text-xs rounded-xl" style={{ color: '#a0b4d6', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent' }}>Redo</button>
                      </div>
                    )}
                  </div>
                )}
                <input ref={heroFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroImageLoad(f) }} />
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="mb-3 text-sm font-semibold flex items-center gap-1 transition-colors"
                style={{ color: '#4dc9ff' }}
              >
                <span>{showAdvanced ? '▲' : '▼'}</span>
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </button>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="w-full space-y-5 kq-card mb-4">
                  {/* Character Builder */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="kq-section-label mb-0">🦸 Character Builder</div>
                      <div
                        className={`kq-toggle ${showCharacterBuilder ? 'on' : ''}`}
                        onClick={() => setShowCharacterBuilder(!showCharacterBuilder)}
                      />
                    </div>
                    {showCharacterBuilder && (
                      <div className="space-y-3 rounded-xl p-3 mt-2" style={{ background: 'rgba(155,93,229,0.08)', border: '1.5px solid rgba(155,93,229,0.2)' }}>
                        <input
                          type="text" value={characterName} onChange={e => setCharacterName(e.target.value)}
                          placeholder="Character name (e.g. Luna, Pixel, Ziggy)"
                          className="kq-input" style={{ padding: '10px 14px' }}
                        />
                        <div>
                          <div className="text-xs font-bold mb-2" style={{ color: '#a0b4d6' }}>CHARACTER TYPE</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {CHARACTER_TYPES.map(type => (
                              <button key={type.value} onClick={() => setCharacterType(type.value)}
                                className="p-2 rounded-xl text-left transition-all"
                                style={{
                                  border: `2px solid ${characterType === type.value ? '#9b5de5' : 'rgba(255,255,255,0.1)'}`,
                                  background: characterType === type.value ? 'rgba(155,93,229,0.15)' : 'rgba(255,255,255,0.03)',
                                  color: characterType === type.value ? '#c89dff' : '#a0b4d6',
                                }}>
                                <div className="text-xs font-semibold">{type.label}</div>
                                <div className="text-xs opacity-70">{type.description}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold mb-2" style={{ color: '#a0b4d6' }}>PERSONALITY TRAITS (pick up to 4)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {CHARACTER_TRAITS.map(trait => (
                              <button key={trait}
                                onClick={() => {
                                  if (selectedTraits.includes(trait)) setSelectedTraits(selectedTraits.filter(t => t !== trait))
                                  else if (selectedTraits.length < 4) setSelectedTraits([...selectedTraits, trait])
                                }}
                                className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                                style={{
                                  background: selectedTraits.includes(trait) ? '#9b5de5' : 'rgba(255,255,255,0.05)',
                                  border: `2px solid ${selectedTraits.includes(trait) ? '#9b5de5' : 'rgba(255,255,255,0.12)'}`,
                                  color: selectedTraits.includes(trait) ? '#fff' : '#a0b4d6',
                                  boxShadow: selectedTraits.includes(trait) ? '0 3px 0 #6b3db5' : 'none',
                                }}>
                                {trait}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Story Length */}
                  <div>
                    <div className="kq-section-label">📏 Story Length</div>
                    <div className="flex gap-2">
                      {STORY_LENGTHS.map(len => (
                        <button key={len.value} onClick={() => setStoryLength(len.value)}
                          className="flex-1 py-3 px-2 rounded-xl text-center transition-all"
                          style={{
                            border: `2.5px solid ${storyLength === len.value ? '#4dc9ff' : 'rgba(255,255,255,0.1)'}`,
                            background: storyLength === len.value ? 'rgba(77,201,255,0.1)' : 'rgba(255,255,255,0.03)',
                            color: storyLength === len.value ? '#4dc9ff' : '#a0b4d6',
                          }}>
                          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.4rem' }}>{len.pages}</div>
                          <div className="text-xs font-bold">{len.label}</div>
                          <div className="text-xs opacity-70">{len.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Range */}
                  <div>
                    <div className="kq-section-label">🎂 Age Range</div>
                    <select value={ageRange} onChange={e => setAgeRange(e.target.value)} style={selectStyle}>
                      {AGE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Illustration Style */}
                  <div>
                    <div className="kq-section-label">🖌️ Illustration Style</div>
                    <div className="grid grid-cols-3 gap-2">
                      {ILLUSTRATION_STYLES.map(s => (
                        <button key={s.value} onClick={() => setIllustrationStyle(s.value)}
                          className="rounded-2xl p-2 text-center transition-all flex flex-col items-center gap-1"
                          style={{
                            border: `2.5px solid ${illustrationStyle === s.value ? '#f5d000' : 'rgba(255,255,255,0.1)'}`,
                            background: illustrationStyle === s.value ? 'rgba(245,208,0,0.08)' : 'rgba(255,255,255,0.03)',
                          }}>
                          <div className="text-2xl">{s.emoji}</div>
                          <div className="text-xs font-bold leading-tight" style={{ color: illustrationStyle === s.value ? '#f5d000' : '#a0b4d6' }}>{s.label}</div>
                          {illustrationStyle === s.value && <span className="text-xs" style={{ color: '#f5d000' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image Model */}
                  <div>
                    <div className="kq-section-label">🤖 Illustration AI Model</div>
                    <div className="grid grid-cols-2 gap-2">
                      {IMAGE_MODELS.map(m => (
                        <button key={m.value} onClick={() => setImageModel(m.value)}
                          className="p-2.5 rounded-xl text-left transition-all"
                          style={{
                            border: `2px solid ${imageModel === m.value ? '#9b5de5' : 'rgba(255,255,255,0.1)'}`,
                            background: imageModel === m.value ? 'rgba(155,93,229,0.1)' : 'rgba(255,255,255,0.03)',
                          }}>
                          <div className="text-xs font-semibold" style={{ color: imageModel === m.value ? '#c89dff' : '#fefcf5' }}>{m.label}</div>
                          <div className="text-xs" style={{ color: '#a0b4d6' }}>{m.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Narrator Voice */}
                  <div>
                    <div className="kq-section-label">🔊 Narrator Voice</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {NARRATOR_VOICES.map(v => (
                        <button key={v.value} onClick={() => setNarratorVoice(v.value)}
                          className="p-2 rounded-xl text-left transition-all"
                          style={{
                            border: `2px solid ${narratorVoice === v.value ? '#4dc9ff' : 'rgba(255,255,255,0.1)'}`,
                            background: narratorVoice === v.value ? 'rgba(77,201,255,0.1)' : 'rgba(255,255,255,0.03)',
                          }}>
                          <div className="text-xs font-medium" style={{ color: narratorVoice === v.value ? '#4dc9ff' : '#fefcf5' }}>{v.label}</div>
                          <div className="text-xs" style={{ color: '#a0b4d6' }}>{v.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="w-full pt-2 pb-4">
                <button
                  onClick={handleGenerate}
                  disabled={!storyIdea.trim()}
                  className="kq-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontSize: '1.35rem', padding: '20px 32px' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>🚀</span>
                  Create My Story!
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                </button>
                <p className="text-center text-xs mt-2" style={{ color: '#a0b4d6' }}>
                  ✦ Story + AI illustrations generated in {timeEstimate}
                  {freeBookCount >= FREE_BOOK_LIMIT && !userApiKey && (
                    <span className="block font-semibold mt-1" style={{ color: '#ff8a82' }}>
                      Add your Venice API key to generate more books
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </main>

        <footer className="w-full py-3 text-center" style={{ borderTop: '1px solid rgba(77,201,255,0.1)', background: 'rgba(10,18,48,0.8)' }}>
          <p className="text-xs" style={{ color: '#a0b4d6' }}>
            Created with <span className="font-semibold" style={{ color: '#9b5de5' }}>Venice.ai</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
