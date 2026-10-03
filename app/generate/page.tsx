'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingGame } from '@/components/GeneratingGame'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'
import { ILLUSTRATION_STYLES, getStyle, stylePlate } from '@/lib/illustration-style'

/* ════════════════════════════════════════════════════════════════════════
   New book: the form a parent fills in to make a picture book.

   Plainly structured on purpose (Vivek is a scientist, not a developer):
     1. static data (the choices on the form)
     2. shared style recipes and small local components
     3. localStorage helpers
     4. the page itself: state, then handlers, then the layout

   Styling rules this file follows, from DESIGN.md:
     - colour comes from the kq tokens, never a raw hex
     - rounded rectangles, never pills
     - one amber action on the screen: the "Make this book" button
     - no emoji as UI, icons come from components/Icons.tsx
     - motion is transform and opacity only
   ════════════════════════════════════════════════════════════════════════ */

// ── Static data ─────────────────────────────────────────────────────────────

const FREE_BOOK_LIMIT = 3

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten (age 5-6)' },
  { value: '1st', label: '1st Grade (age 6-7)' },
  { value: '2nd', label: '2nd Grade (age 7-8)' },
  { value: '3rd', label: '3rd Grade (age 8-9)' },
  { value: '4th', label: '4th Grade (age 9-10)' },
  { value: '5th', label: '5th Grade (age 10-11)' },
]

// The illustration styles come from one shared registry, lib/illustration-style.ts,
// so the picker, the painter and the gallery all agree. Add a style there, not here.

const STORY_LENGTHS = [
  { value: '5',  label: 'Quick',    pages: 5,  description: 'about 1 min' },
  { value: '8',  label: 'Standard', pages: 8,  description: 'about 2 min' },
  { value: '12', label: 'Epic',     pages: 12, description: 'about 3 min' },
]

const CHARACTER_TYPES = [
  { value: 'animal',  label: 'Animal',           description: 'Furry or feathered' },
  { value: 'person',  label: 'Person',           description: 'Boy, girl, or adult' },
  { value: 'fantasy', label: 'Fantasy Creature', description: 'Dragons, unicorns, and more' },
  { value: 'robot',   label: 'Robot',            description: 'Mechanical friend' },
  { value: 'alien',   label: 'Alien',            description: 'From another world' },
]

const CHARACTER_TRAITS = [
  'brave', 'curious', 'kind', 'funny', 'shy', 'clever',
  'adventurous', 'gentle', 'mischievous', 'loyal', 'creative', 'determined',
]

/**
 * Leaving this on automatic is the right answer for almost everyone: the style
 * knows which machine paints it well, and the automatic choice was measured
 * against the alternatives on cost and on the brief. These stay for anyone who
 * wants to override that.
 */
const IMAGE_MODELS = [
  { value: '',                   label: 'Automatic',       description: 'The style picks the best model' },
  { value: 'gpt-image-2-5-flare', label: 'GPT Image 2.5',  description: 'Paint and lettering' },
  { value: 'qwen-image-3',       label: 'Qwen Image 3',    description: 'Dense, printed detail' },
  { value: 'ideogram-v4-5',      label: 'Ideogram 4.5',    description: 'Strongest with words' },
  { value: 'flux-2-max',         label: 'Flux 2 Max',      description: 'Soft art painting' },
]

const NARRATOR_VOICES = [
  { value: 'default', label: 'Default', description: 'Warm and friendly' },
  { value: 'nova',    label: 'Nova',    description: 'Warm, slightly British' },
  { value: 'alloy',   label: 'Alloy',   description: 'Versatile, balanced' },
  { value: 'echo',    label: 'Echo',    description: 'Soft, gentle' },
  { value: 'fable',   label: 'Fable',   description: 'Perfect for storytelling' },
  { value: 'onyx',    label: 'Onyx',    description: 'Deep, calming' },
  { value: 'shimmer', label: 'Shimmer', description: 'Bright and cheerful' },
]

const STORY_TEMPLATES = [
  { id: 'bedtime',      name: 'Bedtime',    description: 'Calm, soothing tales',    prompt: 'A gentle bedtime story with a calm, soothing tone. Include soft imagery, peaceful settings, and a comforting ending that helps children relax and feel safe. The story should have a sleepy, dreamlike quality.', example: 'A little cloud who helps the moon put the stars to sleep' },
  { id: 'adventure',    name: 'Adventure',  description: 'Exciting journeys',       prompt: 'An exciting adventure story with brave characters, mysterious places to explore, and a quest or mission. Include moments of wonder, discovery, and triumph over challenges.', example: 'A young explorer who discovers a map to a hidden treasure' },
  { id: 'friendship',   name: 'Friendship', description: 'Kindness and connection', prompt: 'A heartwarming story about friendship, kindness, and connection. Show characters learning to understand each other, helping one another, and the joy of true friendship.', example: 'Two unlikely animals who become best friends' },
  { id: 'learning',     name: 'Learning',   description: 'Educational fun',         prompt: 'An educational story that teaches a valuable lesson or introduces interesting facts about nature, science, or the world. Make learning fun through engaging characters and situations.', example: 'A curious caterpillar who learns about metamorphosis' },
  { id: 'ai-adventure', name: 'AI World',   description: 'Learn about AI magically', prompt: 'An educational and imaginative story that introduces children to Artificial Intelligence. Include a friendly AI or robot character who learns from examples, sometimes makes mistakes and improves, and helps people with kindness and creativity. Weave in age-appropriate concepts: AI learns from lots of data, AI can help with creative tasks, and humans and AI work best as partners. Make it magical, inspiring, and show that technology should be used responsibly and with heart.', example: 'A curious little robot named Pixel who learns to paint' },
  { id: 'birthday',     name: 'Birthday',   description: 'Celebration special',     prompt: 'A festive birthday story full of joy, celebration, and special surprises. Include party elements, gifts, cake, and the magic of birthday wishes coming true.', example: 'A magical birthday party where balloons come to life' },
  { id: 'custom',       name: 'My Idea',    description: 'Your own unique tale',    prompt: '', example: 'Write your own story idea below' },
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

// The label is the language's own name, so a reader can find theirs.
const LANGUAGES = [
  { value: 'English',          label: 'English' },
  { value: 'Spanish',          label: 'Español' },
  { value: 'French',           label: 'Français' },
  { value: 'German',           label: 'Deutsch' },
  { value: 'Italian',          label: 'Italiano' },
  { value: 'Portuguese',       label: 'Português' },
  { value: 'Hindi',            label: 'हिन्दी' },
  { value: 'Mandarin Chinese', label: '中文' },
  { value: 'Japanese',         label: '日本語' },
  { value: 'Arabic',           label: 'العربية' },
]

// ── Shared style recipes ─────────────────────────────────────────────────────

/* The design system's .kq-btn-secondary does the same job, but this form needs
   a couple of smaller sizes, so the quiet button is written out once here and
   reused. It is still only ever a hairline on the night. */
const QUIET =
  'rounded-lg border border-kq-line bg-kq-text/5 text-kq-text transition-colors hover:bg-kq-text/10'

/* A selectable option plate. `on` gives it the same amber tint the design
   system uses for a chosen chip, so "chosen" looks the same everywhere.
   The label colours inside each plate are set on the plate's own children. */
function plateClass(on: boolean, extra = ''): string {
  return `rounded-lg border transition-colors ${
    on
      ? 'border-kq-amber/40 bg-kq-amber/10'
      : 'border-kq-line bg-kq-text/5 text-kq-dim hover:bg-kq-text/10 hover:text-kq-text'
  } ${extra}`
}

/* One painted example of a style, used inside the picker. The plate files in
   public/styles are painted separately, so a missing one falls back to the
   app's own dusk gradient instead of showing a broken image icon. */
function StylePlate({ value, selected }: { value: string; selected: boolean }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="relative h-20 w-full overflow-hidden bg-gradient-to-br from-kq-plum to-kq-navy">
      {!failed && (
        <img
          src={stylePlate(value)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      {failed && (
        <div className="flex h-full w-full items-center justify-center">
          <Icon name="palette" size={22} className={selected ? 'text-kq-amber' : 'text-kq-dim'} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-kq-navy/60 to-transparent" />
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-[6px] bg-kq-amber text-kq-amber-ink">
          <Icon name="check" size={13} />
        </span>
      )}
    </div>
  )
}

/* A quiet caption above a group of fields. Amber is kept for the single
   action, so these stay in the secondary text colour. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-kq-dim">
      {children}
    </div>
  )
}

// ── LocalStorage helpers ─────────────────────────────────────────────────────
// These keys already exist in the wild. Do not rename them.

const LS_BOOK_COUNT = 'kinderquill_free_book_count'
const LS_API_KEY    = 'kinderquill_venice_api_key'
const LS_MY_BOOKS   = 'kinderquill_my_books'
const LS_HEROES     = 'kinderquill_saved_heroes'

interface SavedHero {
  id: string
  name: string
  image: string        // cartoon data URL
  description?: string
  isAdult?: boolean
}

function getSavedHeroes(): SavedHero[] {
  try { return JSON.parse(localStorage.getItem(LS_HEROES) || '[]') } catch { return [] }
}
function saveHero(hero: SavedHero) {
  try {
    const existing = getSavedHeroes().filter(h => h.id !== hero.id)
    existing.unshift(hero)
    localStorage.setItem(LS_HEROES, JSON.stringify(existing.slice(0, 12)))
  } catch {}
}
function removeHero(id: string) {
  try { localStorage.setItem(LS_HEROES, JSON.stringify(getSavedHeroes().filter(h => h.id !== id))) } catch {}
}

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

// ── Venice API key modal ─────────────────────────────────────────────────────

interface ApiKeyModalProps {
  onClose: () => void
  onSave: (key: string) => void
  booksUsed: number
}

function VeniceApiKeyModal({ onClose, onSave, booksUsed }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('')

  // The five steps, kept in one list so the copy is easy to find and edit.
  const steps: { text: string; link?: string; href?: string; after?: string }[] = [
    { text: 'Visit ', link: 'venice.ai/chat?ref=yN8qqI', href: 'https://venice.ai/chat?ref=yN8qqI', after: ' and get $10 in free credits.' },
    { text: 'Create a free account and sign in.' },
    { text: 'Open your profile, then choose ', link: '"API Keys"', href: 'https://venice.ai/chat?ref=yN8qqI' },
    { text: 'Choose ', link: '"Create API Key"', after: ' and give it a name.' },
    { text: 'Copy the key and paste it below.' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kq-ink/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-xl border border-kq-line bg-kq-card p-5">

        <div className="mb-4 text-center">
          <h2 className="font-display text-xl leading-snug text-kq-text">
            {booksUsed >= FREE_BOOK_LIMIT ? `You have used all ${FREE_BOOK_LIMIT} free books` : 'Add your Venice API key'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-kq-dim">
            An API key of your own lets you make unlimited books. Venice gives you
            <span className="text-kq-text"> $10 in free credits</span> to start.
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-kq-line px-3 py-2.5">
          <p className="text-xs leading-relaxed text-kq-dim">
            <span className="text-kq-text">Venice</span> is the AI service that writes your
            story and paints the pictures. The key below is stored in your browser.
          </p>
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-kq-text">How to get your free API key</h3>
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-kq-line text-xs font-semibold text-kq-dim">
                  {i + 1}
                </span>
                <span className="break-words text-sm text-kq-dim">
                  {s.text}
                  {s.link && s.href && (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-kq-text underline decoration-kq-line underline-offset-4"
                    >
                      {s.link}
                    </a>
                  )}
                  {s.link && !s.href && <span className="text-kq-text">{s.link}</span>}
                  {s.after}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <a
          href="https://venice.ai/chat?ref=yN8qqI"
          target="_blank" rel="noopener noreferrer"
          className={`${QUIET} mb-4 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm`}
        >
          <Icon name="arrow_forward" size={16} />
          Get $10 in free credits on Venice
        </a>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-kq-dim">
            Paste your Venice API key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="venice-api-..."
            className="kq-input"
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-kq-dim">
            <Icon name="lock" size={14} />
            Stored only in your browser, never sent to our servers.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className={`${QUIET} flex-1 px-4 py-2.5 text-sm`}>
            Cancel
          </button>
          <button
            onClick={() => { const t = keyInput.trim(); if (!t) { alert('Please enter your Venice API key'); return } onSave(t) }}
            disabled={!keyInput.trim()}
            className="kq-btn-primary flex-[2]"
          >
            Save and generate
          </button>
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
      <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-2">
        <Icon name="star" size={16} className="shrink-0 text-kq-amber" />
        <p className="text-xs text-kq-dim">Venice API key active. Unlimited books.</p>
      </div>
    )
  }

  if (remaining === 0) {
    return (
      <div className="mb-3 rounded-lg border border-kq-line px-3 py-2">
        <p className="text-xs text-kq-dim">
          <span className="text-kq-text">All {FREE_BOOK_LIMIT} free books are used.</span>{' '}
          Add your own API key from{' '}
          <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="text-kq-text underline decoration-kq-line underline-offset-4">Venice</a>
          {' '}to keep going. It comes with $10 in free credits.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="star" size={16} className="shrink-0 text-kq-amber" />
          <p className="text-xs text-kq-text">
            {remaining} free {remaining === 1 ? 'book' : 'books'} left
          </p>
        </div>
        <span className="text-xs text-kq-dim">{used} of {FREE_BOOK_LIMIT} used</span>
      </div>
      {/* One mark per free book, filled as they are used. */}
      <div className="flex gap-1.5">
        {Array.from({ length: FREE_BOOK_LIMIT }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-[3px] ${i < used ? 'bg-kq-amber' : 'bg-kq-text/10'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-kq-dim">
        {FREE_BOOK_LIMIT} books are free. After that, add your own key from{' '}
        <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="text-kq-text underline decoration-kq-line underline-offset-4">Venice</a>
        {' '}($10 in free credits).
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
  const [imageModel, setImageModel] = useState('')

  // Character builder
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
  // Detected or edited hero details (works for a child OR a grown-up)
  const [heroIsAdult, setHeroIsAdult] = useState(false)
  const [heroName, setHeroName] = useState('')
  const [heroDescription, setHeroDescription] = useState('')
  const [savedHeroes, setSavedHeroes] = useState<SavedHero[]>([])
  const [heroSaved, setHeroSaved] = useState(false)

  // Story language
  const [language, setLanguage] = useState('English')

  // Draw-to-story: turn a child's drawing into a story idea via a vision model
  const [isReadingDrawing, setIsReadingDrawing] = useState(false)
  const [drawingError, setDrawingError] = useState('')
  const drawingFileInputRef = useRef<HTMLInputElement>(null)

  // The form values used for the book currently being made, so the library
  // entry matches what was actually sent.
  const pendingMetaRef = useRef<{ ageRange: string; illustrationStyle: string } | null>(null)

  // Read the query string (a story idea can be linked in from the homepage),
  // then pick up whatever the reader saved last time.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idea = params.get('idea')
    const age = params.get('ageRange')
    const style = params.get('illustrationStyle')
    if (idea) setStoryIdea(idea)
    if (age) setAgeRange(age)
    // Links made before the shared registry may carry a full prompt string.
    // getStyle maps a value, a label or a legacy prompt onto this picker's
    // value and never throws, so nothing old lands on an unknown style.
    if (style) setIllustrationStyle(getStyle(style).value)
    const lang = params.get('language')
    if (lang) setLanguage(lang)
    const savedKey = localStorage.getItem(LS_API_KEY)
    if (savedKey) setUserApiKey(savedKey)
    setFreeBookCount(getFreeBookCount())
    setSavedHeroes(getSavedHeroes())
  }, [])

  // Poll the book while it is being made. Unchanged behaviour: every two
  // seconds, and on completion the book is filed in the library and opened.
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

  // A photo has been chosen: show it and forget anything we knew about the
  // previous one.
  const handleHeroImageLoad = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      setHeroPhotoDataUrl(e.target?.result as string)
      setCartoonHeroDataUrl(null); setCartoonError('')
      setHeroName(''); setHeroDescription(''); setHeroIsAdult(false); setHeroSaved(false)
    }
    reader.readAsDataURL(file)
  }, [])

  // Ask the server to turn the photo into a painted character.
  const handleCartoonify = async () => {
    if (!heroPhotoDataUrl) return
    setIsCartoonifying(true); setCartoonError('')
    try {
      const res = await fetch('/api/cartoonify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: heroPhotoDataUrl, userApiKey: userApiKey || undefined }) })
      const data = await res.json()
      if (!res.ok) {
        setCartoonError(data.error || 'Failed to cartoonify. Please try again.')
      } else {
        setCartoonHeroDataUrl(data.cartoonImage)
        if (data.hero) {
          setHeroIsAdult(!!data.hero.isAdult)
          setHeroDescription(data.hero.description || '')
          if (data.hero.suggestedName && !heroName) setHeroName(data.hero.suggestedName)
        }
      }
    } catch (err: any) { setCartoonError(err.message || 'Failed to cartoonify.') } finally { setIsCartoonifying(false) }
  }

  // Reuse a previously saved hero (recurring characters / a series).
  const useSavedHero = (h: SavedHero) => {
    setHeroPhotoDataUrl(h.image)
    setCartoonHeroDataUrl(h.image)
    setHeroName(h.name || '')
    setHeroDescription(h.description || '')
    setHeroIsAdult(!!h.isAdult)
    setCartoonError(''); setHeroSaved(true)
  }

  const handleSaveHero = () => {
    if (!cartoonHeroDataUrl) return
    const hero: SavedHero = {
      id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: heroName.trim() || 'My Hero',
      image: cartoonHeroDataUrl,
      description: heroDescription,
      isAdult: heroIsAdult,
    }
    saveHero(hero)
    setSavedHeroes(getSavedHeroes())
    setHeroSaved(true)
  }

  const handleRemoveHero = (id: string) => {
    removeHero(id)
    setSavedHeroes(getSavedHeroes())
  }

  // Shrink a drawing to a sane size before sending, which keeps the upload
  // fast and well under the vision model's payload limit.
  const downscaleImage = (dataUrl: string, maxDim = 1024): Promise<string> =>
    new Promise(resolve => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        if (scale === 1) { resolve(dataUrl); return }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(dataUrl); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })

  // Read a child's drawing and turn it into a story idea.
  const handleDrawingUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setIsReadingDrawing(true); setDrawingError('')
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const dataUrl = await downscaleImage(e.target?.result as string)
        const res = await fetch('/api/describe-drawing', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, userApiKey: userApiKey || undefined }),
        })
        const data = await res.json()
        if (!res.ok) { setDrawingError(data.error || 'Could not read the drawing. Please try another.') }
        else if (data.storyIdea) { setStoryIdea(data.storyIdea); setSelectedTemplate('custom') }
      } catch (err: any) {
        setDrawingError(err.message || 'Could not read the drawing.')
      } finally {
        setIsReadingDrawing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [userApiKey])

  // Build the request and hand it to the server. The server does the writing
  // and painting; this page then polls for the finished book.
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
          illustrationStyle,
          storyLength: parseInt(storyLength), narratorVoice, imageModel,
          userVeniceApiKey: effectiveApiKey || undefined,
          cartoonHeroImage: cartoonHeroDataUrl || undefined,
          language,
          hero: cartoonHeroDataUrl && heroDescription
            ? { description: heroDescription, isAdult: heroIsAdult, name: heroName || undefined }
            : undefined,
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
        alert('The connection timed out. Your story may still be generating. Wait 30 seconds and check your Library.')
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

  const timeEstimate = storyLength === '5' ? 'about 1 minute' : storyLength === '8' ? 'about 2 minutes' : 'about 3 to 4 minutes'

  return (
    <div className="kq-ground relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header title="New book" />

        {showApiKeyModal && (
          <VeniceApiKeyModal
            onClose={() => setShowApiKeyModal(false)}
            onSave={handleApiKeySave}
            booksUsed={freeBookCount}
          />
        )}

        <main className="mx-auto w-full max-w-content grow px-5 py-6 lg:px-10">
          {isGenerating ? (
            // While the book is being made we show the waiting screen and
            // nothing else. The form comes back once the book is ready.
            <div className="flex flex-col items-center justify-center py-10">
              <GeneratingGame progress={generationProgress} />
            </div>
          ) : (
            <>
              {/* A band of real painted art at the top, so the screen a parent
                  lands on looks like the books it makes rather than a form. */}
              <div className="relative mb-6 overflow-hidden rounded-[22px] border border-kq-hairline">
                <img
                  src="/art/hero-wide.png"
                  alt="A lantern-lit bedtime scene, painted by hand"
                  className="h-[168px] w-full object-cover object-[50%_38%] lg:h-[220px]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-kq-ground to-transparent" />
              </div>

              <div className="mb-5 max-w-2xl">
                <h1 className="font-display text-2xl text-kq-text lg:text-3xl">Your story starts here</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-kq-dim">
                  Say what it is about. We write it and paint every page.
                </p>
              </div>

              <div className="mx-auto w-full max-w-3xl lg:max-w-none">

                {/* Free books counter */}
                <FreeBooksBadge used={freeBookCount} hasApiKey={!!userApiKey} />

                {/* API key management */}
                {userApiKey ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon name="lock" size={14} className="shrink-0 text-kq-dim" />
                      <p className="text-xs text-kq-dim">Venice API key saved. Unlimited books.</p>
                    </div>
                    <button
                      onClick={() => { localStorage.removeItem(LS_API_KEY); setUserApiKey('') }}
                      className="text-xs text-kq-dim underline decoration-kq-line underline-offset-4 transition-colors hover:text-kq-text"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mb-3">
                    {!showApiKeyInput ? (
                      <button
                        onClick={() => setShowApiKeyInput(true)}
                        className={`${QUIET} flex w-full items-center justify-center gap-2 border-dashed px-3 py-2.5 text-xs`}
                      >
                        <Icon name="lock" size={14} />
                        Have a Venice API key? Add it for unlimited books
                      </button>
                    ) : (
                      <div className="rounded-lg border border-kq-line px-3 py-3">
                        <p className="mb-2 text-xs text-kq-dim">
                          Enter your Venice API key.{' '}
                          <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="text-kq-text underline decoration-kq-line underline-offset-4">
                            Get one free
                          </a>
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={apiKeyInputValue}
                            onChange={e => setApiKeyInputValue(e.target.value)}
                            placeholder="venice-api-..."
                            className="kq-input flex-1 !px-3 !py-2 !text-xs"
                          />
                          <button
                            onClick={() => { const t = apiKeyInputValue.trim(); if (!t) return; localStorage.setItem(LS_API_KEY, t); setUserApiKey(t); setApiKeyInputValue(''); setShowApiKeyInput(false) }}
                            disabled={!apiKeyInputValue.trim()}
                            className={`${QUIET} shrink-0 px-3 py-2 text-xs`}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setShowApiKeyInput(false); setApiKeyInputValue('') }}
                            aria-label="Close"
                            className={`${QUIET} shrink-0 px-2.5 py-2 text-xs`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Desktop: two-column creator (mobile stays single-column) */}
                <div className="w-full lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
                  <div className="min-w-0">

                    {/* Story type */}
                    <div className="mb-5 w-full">
                      <FieldLabel>Story type</FieldLabel>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {STORY_TEMPLATES.map(template => {
                          const on = selectedTemplate === template.id
                          return (
                            <button
                              key={template.id}
                              onClick={() => {
                                setSelectedTemplate(template.id)
                                if (template.id !== 'custom' && !storyIdea) setStoryIdea(template.example)
                              }}
                              className={`kq-chip shrink-0 ${on ? 'is-on' : ''}`}
                            >
                              {template.name}
                            </button>
                          )
                        })}
                      </div>
                      {/* The chosen template explains itself, so nobody has to guess. */}
                      {selectedTemplate !== 'custom' && (
                        <p className="mt-2 text-xs text-kq-dim">
                          {STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.description}.
                          {selectedTemplate === 'ai-adventure' && ' Teaches children how AI learns, through the story itself.'}
                        </p>
                      )}
                    </div>

                    {/* Story idea */}
                    <div className="mb-5 w-full">
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel>Your story idea</FieldLabel>
                        <button
                          onClick={() => setStoryIdea(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)])}
                          className={`${QUIET} mb-2 flex w-auto shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs`}
                        >
                          <Icon name="sync" size={13} />
                          Surprise me
                        </button>
                      </div>
                      <textarea
                        value={storyIdea}
                        onChange={e => setStoryIdea(e.target.value)}
                        className="kq-input"
                        rows={3}
                        placeholder={STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.example || 'A brave knight who is afraid of spiders, or a treehouse that travels through time...'}
                      />
                      <input
                        ref={drawingFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleDrawingUpload(f); e.target.value = '' }}
                      />
                      <button
                        onClick={() => drawingFileInputRef.current?.click()}
                        disabled={isReadingDrawing}
                        className={`${QUIET} mt-2 flex w-full items-center justify-center gap-2 border-dashed px-3 py-2.5 text-sm disabled:opacity-60`}
                      >
                        <Icon name="image" size={16} />
                        {isReadingDrawing ? 'Reading your drawing' : 'Turn a drawing into a story'}
                      </button>
                      {drawingError && (
                        <p className="mt-1.5 text-xs text-kq-dim">{drawingError}</p>
                      )}
                    </div>

                  </div>{/* end left column */}

                  {/* Make someone the hero */}
                  <div className="mb-5 w-full rounded-xl border border-kq-line bg-kq-card p-4">
                    <div className="mb-2">
                      <h3 className="flex items-center gap-2 font-display text-lg text-kq-text">
                        <Icon name="star" size={16} className="text-kq-amber" />
                        Make someone the hero
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-kq-dim">
                        Upload a photo of a child, or of a grown-up they love. We turn them
                        into a painted character and put them in the story.
                      </p>
                    </div>

                    {/* Saved heroes: reuse a character across books (a series) */}
                    {savedHeroes.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-kq-dim">
                          Your heroes
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                          {savedHeroes.map(h => (
                            <div key={h.id} className="relative shrink-0 text-center">
                              <button
                                onClick={() => useSavedHero(h)}
                                title={`Use ${h.name}`}
                                className={`block overflow-hidden rounded-md border transition-colors ${
                                  cartoonHeroDataUrl === h.image ? 'border-kq-amber' : 'border-kq-line hover:border-kq-text/30'
                                }`}
                              >
                                <img src={h.image} alt={h.name} className="h-14 w-14 object-cover" />
                              </button>
                              <p className="mt-0.5 w-14 truncate text-[10px] text-kq-dim">{h.name}</p>
                              <button
                                onClick={() => handleRemoveHero(h.id)}
                                aria-label={`Remove ${h.name}`}
                                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-[5px] border border-kq-line bg-kq-navy text-[9px] text-kq-text"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!heroPhotoDataUrl ? (
                      <button
                        onClick={() => heroFileInputRef.current?.click()}
                        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-kq-line px-3 py-4 transition-colors hover:bg-kq-text/5"
                      >
                        <Icon name="image" size={22} className="shrink-0 text-kq-dim" />
                        <div className="text-left">
                          <p className="text-sm text-kq-text">Upload a photo</p>
                          <p className="text-xs text-kq-dim">JPG or PNG, portrait works best</p>
                        </div>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <p className="mb-1 text-center text-xs text-kq-dim">Original</p>
                            <div className="relative">
                              <img src={heroPhotoDataUrl} alt="The uploaded photo" className="h-36 w-full rounded-md border border-kq-line object-cover" />
                              <button
                                onClick={() => { setHeroPhotoDataUrl(null); setCartoonHeroDataUrl(null); setCartoonError('') }}
                                aria-label="Remove the photo"
                                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-[6px] border border-kq-line bg-kq-navy text-xs text-kq-text"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center pt-5">
                            <Icon name="arrow_forward" size={18} className="text-kq-dim" />
                          </div>
                          <div className="flex-1">
                            <p className="mb-1 text-center text-xs text-kq-dim">Painted hero</p>
                            {cartoonHeroDataUrl ? (
                              <img src={cartoonHeroDataUrl} alt="The painted character" className="h-36 w-full rounded-md border border-kq-amber/40 object-cover" />
                            ) : (
                              <div className="flex h-36 w-full items-center justify-center rounded-md border border-dashed border-kq-line bg-kq-text/5">
                                {isCartoonifying ? (
                                  <div className="text-center">
                                    <Icon name="palette" size={20} className="mx-auto mb-1 animate-kq-spin text-kq-dim" />
                                    <p className="text-xs text-kq-dim">Painting</p>
                                  </div>
                                ) : (
                                  <div className="px-2 text-center">
                                    <Icon name="image" size={20} className="mx-auto mb-1 text-kq-dim" />
                                    <p className="text-xs text-kq-dim">Not painted yet</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {cartoonError && (
                          <p className="rounded-md border border-kq-line px-3 py-2 text-xs text-kq-dim">{cartoonError}</p>
                        )}
                        {!cartoonHeroDataUrl ? (
                          <button
                            onClick={handleCartoonify}
                            disabled={isCartoonifying}
                            className={`${QUIET} flex w-full items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <Icon name="palette" size={16} />
                            {isCartoonifying ? 'Painting the character' : 'Paint the character'}
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 rounded-md border border-kq-line bg-kq-text/5 px-3 py-2">
                              <Icon name="star" size={14} className="shrink-0 text-kq-amber" />
                              <p className="text-xs text-kq-dim">The painted hero is ready. The story will be about them.</p>
                            </div>

                            {/* Hero name, and who this is (a child or a grown-up) */}
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={heroName}
                                onChange={e => { setHeroName(e.target.value); setHeroSaved(false) }}
                                placeholder="Hero's name"
                                className="kq-input min-w-[8rem] flex-1 !px-3 !py-2 !text-sm"
                              />
                              <div className="flex gap-1 rounded-lg border border-kq-line p-1">
                                {[{ v: false, label: 'Child' }, { v: true, label: 'Grown-up' }].map(o => (
                                  <button
                                    key={String(o.v)}
                                    onClick={() => { setHeroIsAdult(o.v); setHeroSaved(false) }}
                                    className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                      heroIsAdult === o.v ? 'bg-kq-text/10 text-kq-text' : 'text-kq-dim hover:text-kq-text'
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-kq-dim">
                              {heroIsAdult
                                ? 'A warm, inspiring story starring this grown-up.'
                                : 'A fun adventure starring this child.'}
                            </p>

                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveHero}
                                disabled={heroSaved}
                                className={`${QUIET} flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs disabled:opacity-60`}
                              >
                                <Icon name="star" size={14} />
                                {heroSaved ? 'Saved to your heroes' : 'Save for next time'}
                              </button>
                              <button
                                onClick={() => { setCartoonHeroDataUrl(null); setCartoonError('') }}
                                className={`${QUIET} shrink-0 px-3 py-2 text-xs`}
                              >
                                Start over
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <input ref={heroFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroImageLoad(f) }} />
                  </div>

                </div>{/* end two-column creator */}

                {/* Advanced options toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mb-3 flex items-center gap-1.5 text-sm text-kq-dim transition-colors hover:text-kq-text"
                >
                  <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} size={18} />
                  {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
                </button>

                {/* Advanced options */}
                {showAdvanced && (
                  <div className="mb-5 w-full space-y-5 rounded-xl border border-kq-line bg-kq-card p-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">

                    {/* Character builder */}
                    <div className="lg:col-span-2">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <FieldLabel>Character builder</FieldLabel>
                        <div
                          className={`kq-toggle ${showCharacterBuilder ? 'on' : ''}`}
                          onClick={() => setShowCharacterBuilder(!showCharacterBuilder)}
                          role="switch"
                          aria-checked={showCharacterBuilder}
                          aria-label="Use the character builder"
                        />
                      </div>
                      {showCharacterBuilder && (
                        <div className="mt-2 space-y-4 rounded-lg border border-kq-line p-3">
                          <input
                            type="text"
                            value={characterName}
                            onChange={e => setCharacterName(e.target.value)}
                            placeholder="Character name (for example Luna, Pixel, Ziggy)"
                            className="kq-input !py-2.5 !text-sm"
                          />
                          <div>
                            <FieldLabel>Character type</FieldLabel>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {CHARACTER_TYPES.map(type => {
                                const on = characterType === type.value
                                return (
                                  <button
                                    key={type.value}
                                    onClick={() => setCharacterType(type.value)}
                                    className={plateClass(on, 'p-2.5')}
                                  >
                                    <div className="text-xs font-medium text-kq-text">{type.label}</div>
                                    <div className="text-xs text-kq-dim">{type.description}</div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Personality traits (pick up to 4)</FieldLabel>
                            <div className="flex flex-wrap gap-1.5">
                              {CHARACTER_TRAITS.map(trait => {
                                const on = selectedTraits.includes(trait)
                                return (
                                  <button
                                    key={trait}
                                    onClick={() => {
                                      if (selectedTraits.includes(trait)) setSelectedTraits(selectedTraits.filter(t => t !== trait))
                                      else if (selectedTraits.length < 4) setSelectedTraits([...selectedTraits, trait])
                                    }}
                                    className={`kq-chip ${on ? 'is-on' : ''}`}
                                  >
                                    {trait}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Story length */}
                    <div>
                      <FieldLabel>Story length</FieldLabel>
                      <div className="flex gap-2">
                        {STORY_LENGTHS.map(len => {
                          const on = storyLength === len.value
                          return (
                            <button
                              key={len.value}
                              onClick={() => setStoryLength(len.value)}
                              className={plateClass(on, 'flex-1 px-2 py-3 text-center')}
                            >
                              <div className="font-display text-2xl">{len.pages}</div>
                              <div className="text-xs font-medium text-kq-text">{len.label}</div>
                              <div className="text-xs text-kq-dim">{len.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Age range */}
                    <div>
                      <FieldLabel>Age range</FieldLabel>
                      <select
                        value={ageRange}
                        onChange={e => setAgeRange(e.target.value)}
                        className="kq-input"
                      >
                        {AGE_RANGES.map(r => (
                          <option key={r.value} value={r.value} className="bg-kq-navy text-kq-text">{r.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Story language */}
                    <div>
                      <FieldLabel>Story language</FieldLabel>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="kq-input"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.value} value={l.value} className="bg-kq-navy text-kq-text">{l.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Illustration style: every style in the shared registry,
                        each with a painted plate of its own. */}
                    <div>
                      <FieldLabel>Illustration style</FieldLabel>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ILLUSTRATION_STYLES.map(s => {
                          const on = illustrationStyle === s.value
                          return (
                            <button
                              key={s.value}
                              onClick={() => setIllustrationStyle(s.value)}
                              aria-pressed={on}
                              className={plateClass(on, 'overflow-hidden p-0 text-left')}
                            >
                              <StylePlate value={s.value} selected={on} />
                              <div className="p-2.5">
                                <div className="text-xs font-medium leading-tight text-kq-text">{s.label}</div>
                                <div className="mt-0.5 text-[11px] leading-snug text-kq-dim">{s.blurb}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Illustration model */}
                    <div>
                      <FieldLabel>Illustration model</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {IMAGE_MODELS.map(m => {
                          const on = imageModel === m.value
                          return (
                            <button
                              key={m.value}
                              onClick={() => setImageModel(m.value)}
                              className={plateClass(on, 'p-2.5')}
                            >
                              <div className="text-xs font-medium text-kq-text">{m.label}</div>
                              <div className="text-xs text-kq-dim">{m.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Narrator voice */}
                    <div>
                      <FieldLabel>Narrator voice</FieldLabel>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {NARRATOR_VOICES.map(v => {
                          const on = narratorVoice === v.value
                          return (
                            <button
                              key={v.value}
                              onClick={() => setNarratorVoice(v.value)}
                              className={plateClass(on, 'p-2.5')}
                            >
                              <div className="text-xs font-medium text-kq-text">{v.label}</div>
                              <div className="text-xs text-kq-dim">{v.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* The one amber action on this screen */}
                <div className="w-full pt-1">
                  <button
                    onClick={handleGenerate}
                    disabled={!storyIdea.trim()}
                    className="kq-btn-primary"
                  >
                    <Icon name="auto_awesome" size={20} />
                    Make this book
                  </button>
                  <p className="mt-2 text-center text-xs text-kq-dim">
                    Story and illustrations are made in {timeEstimate}.
                    {freeBookCount >= FREE_BOOK_LIMIT && !userApiKey && (
                      <span className="mt-1 block text-kq-text">
                        Add your Venice API key to make more books.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="border-t border-kq-line px-5 py-5 text-center lg:px-10">
          <p className="text-xs text-kq-dim">
            Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
          </p>
        </footer>
      </div>
    </div>
  )
}
