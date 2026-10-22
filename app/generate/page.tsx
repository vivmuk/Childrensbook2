'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratingGame } from '@/components/GeneratingGame'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'
import { ILLUSTRATION_STYLES, getStyle, stylePlate } from '@/lib/illustration-style'
import { NARRATORS } from '@/lib/narrators'

/* ════════════════════════════════════════════════════════════════════════
   New book: three short steps a parent can do one handed.

     1. The idea      what the story is about
     2. The look      how every page is painted
     3. The hero      a photo or a few words, painted FIRST as a character
                      the parent approves, then used on every page

   Everything else (length, age, language, voice, painter, dedication) is
   folded into "More options" on the last step. The defaults are good, so a
   parent who never opens it still gets a finished book.

   Styling rules this file follows, from DESIGN.md:
     - colour comes from the kq tokens, never a raw hex
     - rounded rectangles, never pills
     - one amber action on the screen: the step's own next action
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
 * Automatic is the right answer for almost everyone: Muse when Venice offers
 * it, otherwise Grok Imagine. "Style specialist" is the model measured to win
 * the chosen medium. The rest of the list is read live from Venice.
 */
const IMAGE_MODEL_PRESETS = [
  { value: '',           label: 'Automatic',        description: 'Muse or Grok Imagine' },
  { value: 'specialist', label: 'Style specialist', description: 'The best painter for this style' },
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

// ── The rest of the styles ───────────────────────────────────────────────────
// The strip on step 1 shows three styles; this sheet holds every one of them,
// so the round chevron and the quiet "compare" link have somewhere real to go.

interface AllStylesSheetProps {
  current: string
  onPick: (value: string) => void
  onClose: () => void
}

function AllStylesSheet({ current, onPick, onClose }: AllStylesSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-kq-ink/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-kq-line bg-kq-card p-4">

        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-kq-text">
            All {ILLUSTRATION_STYLES.length} styles
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-kq-line bg-kq-text/5 text-kq-text transition-colors hover:bg-kq-text/10"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ILLUSTRATION_STYLES.map(s => {
            const on = current === s.value
            return (
              <button
                key={s.value}
                onClick={() => onPick(s.value)}
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
    </div>
  )
}

// ── Small pieces of the journey ──────────────────────────────────────────────

type Step = 1 | 2 | 3
type HeroMode = 'photo' | 'describe' | 'story'

const STEP_NAMES: Record<Step, string> = { 1: 'The idea', 2: 'The look', 3: 'The hero' }

/** Where you are, and a way back to any step already done. */
function StepRail({ step, maxStep, onGo }: { step: Step; maxStep: Step; onGo: (s: Step) => void }) {
  return (
    <nav aria-label="Steps" className="mb-5 grid grid-cols-3 gap-2">
      {([1, 2, 3] as Step[]).map(s => {
        const reachable = s <= maxStep
        return (
          <button
            key={s}
            onClick={() => reachable && onGo(s)}
            disabled={!reachable}
            aria-current={s === step ? 'step' : undefined}
            className="min-w-0 text-left disabled:cursor-default"
          >
            <span className={`block h-1.5 rounded-[3px] transition-colors ${s <= step ? 'bg-kq-amber' : 'bg-kq-text/10'}`} />
            <span className={`mt-1.5 block truncate text-[11px] ${s === step ? 'text-kq-text' : 'text-kq-dim'}`}>
              {s}. {STEP_NAMES[s]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/** Shrink a picture before it is sent, so uploads stay fast and under limits. */
function downscaleImage(dataUrl: string, maxDim = 1024): Promise<string> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('That file could not be read.'))
    reader.readAsDataURL(file)
  })
}

// ── Main page component ──────────────────────────────────────────────────────

export default function GeneratePage() {
  const router = useRouter()

  // Where the parent is in the journey
  const [step, setStep] = useState<Step>(1)
  const [maxStep, setMaxStep] = useState<Step>(1)
  const goTo = (s: Step) => {
    setStep(s)
    setMaxStep(m => (s > m ? s : m))
    window.scrollTo({ top: 0 })
  }

  // Step 1: the idea
  const [storyIdea, setStoryIdea] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [isReadingDrawing, setIsReadingDrawing] = useState(false)
  const [drawingError, setDrawingError] = useState('')
  const drawingFileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: the look
  const [illustrationStyle, setIllustrationStyle] = useState('ghibli')
  const [showStyleSheet, setShowStyleSheet] = useState(false)

  // Step 3: the hero. A photo or a description becomes one painted character
  // sheet, which the parent sees and approves before any page is painted.
  const [heroMode, setHeroMode] = useState<HeroMode>('story')
  const [heroPhotoDataUrl, setHeroPhotoDataUrl] = useState<string | null>(null)
  const [characterImage, setCharacterImage] = useState<string | null>(null)
  /** The style the character sheet was painted in, so a later change can be caught. */
  const [characterStyle, setCharacterStyle] = useState<string | null>(null)
  const [isPaintingHero, setIsPaintingHero] = useState(false)
  const [heroError, setHeroError] = useState('')
  const [heroIsAdult, setHeroIsAdult] = useState(false)
  const [heroName, setHeroName] = useState('')
  const [heroDescription, setHeroDescription] = useState('')
  const [heroTweak, setHeroTweak] = useState('')
  const [characterType, setCharacterType] = useState('animal')
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['brave', 'curious'])
  const [savedHeroes, setSavedHeroes] = useState<SavedHero[]>([])
  const [heroSaved, setHeroSaved] = useState(false)
  const heroFileInputRef = useRef<HTMLInputElement>(null)

  // More options, all optional
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [ageRange, setAgeRange] = useState('2nd')
  const [storyLength, setStoryLength] = useState('8')
  const [language, setLanguage] = useState('English')
  const [narratorVoice, setNarratorVoice] = useState('heart')
  const [imageModel, setImageModel] = useState('')
  const [liveModels, setLiveModels] = useState<{ id: string; name: string }[]>([])
  const [automaticModel, setAutomaticModel] = useState('')
  const [consistentHero, setConsistentHero] = useState(true)
  const [dedication, setDedication] = useState('')

  // Generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Venice API key
  const [userApiKey, setUserApiKey] = useState<string>('')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [freeBookCount, setFreeBookCount] = useState(0)
  const [apiKeyInputValue, setApiKeyInputValue] = useState('')

  // The form values used for the book being made, so the library entry
  // matches what was actually sent.
  const pendingMetaRef = useRef<{ ageRange: string; illustrationStyle: string } | null>(null)

  // A story idea can be linked in from the homepage; then pick up whatever the
  // reader saved last time.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idea = params.get('idea')
    const age = params.get('ageRange')
    const style = params.get('illustrationStyle')
    if (idea) setStoryIdea(idea)
    if (age) setAgeRange(age)
    // getStyle maps a value, a label or a legacy prompt onto a picker value.
    if (style) setIllustrationStyle(getStyle(style).value)
    const lang = params.get('language')
    if (lang) setLanguage(lang)
    const savedKey = localStorage.getItem(LS_API_KEY)
    if (savedKey) setUserApiKey(savedKey)
    setFreeBookCount(getFreeBookCount())
    setSavedHeroes(getSavedHeroes())
  }, [])

  // The live painter list, fetched only when a parent opens More options.
  useEffect(() => {
    if (!showAdvanced || liveModels.length) return
    fetch('/api/models', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userApiKey: userApiKey || undefined }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setAutomaticModel(d.automatic || '')
        setLiveModels(d.models || [])
      })
      .catch(() => {})
  }, [showAdvanced, liveModels.length, userApiKey])

  // Poll the book while it is being made. On completion it is filed in the
  // library and opened.
  useEffect(() => {
    if (!bookId || !isGenerating) return
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/book-status/${bookId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'completed') {
          setIsGenerating(false)
          incrementFreeBookCount()
          setFreeBookCount(getFreeBookCount())
          const meta = pendingMetaRef.current
          saveBookToLibrary({
            id: bookId, title: data.title || 'My Story',
            ageRange: meta?.ageRange || ageRange, illustrationStyle: meta?.illustrationStyle || illustrationStyle,
            createdAt: data.createdAt || new Date().toISOString(), titlePageImage: data.titlePageImage ?? null,
          })
          router.push(`/book/${bookId}`)
        } else if (data.status === 'generating') {
          setGenerationProgress(Math.min(97, data.progress || 0))
        } else if (data.status === 'error') {
          setIsGenerating(false)
          alert('Something went wrong while making your book. Please try again.')
        }
      } catch { /* ignore transient errors */ }
    }
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, isGenerating, router, ageRange, illustrationStyle])

  // ── Step 1 handlers ──

  // Read a child's drawing and turn it into a story idea.
  const handleDrawingUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setIsReadingDrawing(true); setDrawingError('')
    try {
      const dataUrl = await downscaleImage(await readFile(file))
      const res = await fetch('/api/describe-drawing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, userApiKey: userApiKey || undefined }),
      })
      const data = await res.json()
      if (!res.ok) setDrawingError(data.error || 'Could not read the drawing. Please try another.')
      else if (data.storyIdea) { setStoryIdea(data.storyIdea); setSelectedTemplate('custom') }
    } catch (err: any) {
      setDrawingError(err.message || 'Could not read the drawing.')
    } finally {
      setIsReadingDrawing(false)
    }
  }, [userApiKey])

  // ── Step 3 handlers ──

  const clearCharacter = () => {
    setCharacterImage(null); setCharacterStyle(null); setHeroError(''); setHeroSaved(false)
  }

  const handleHeroPhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const dataUrl = await downscaleImage(await readFile(file), 1280)
      setHeroPhotoDataUrl(dataUrl)
      setHeroMode('photo')
      setCharacterImage(null); setCharacterStyle(null); setHeroError('')
      setHeroName(''); setHeroDescription(''); setHeroIsAdult(false); setHeroSaved(false); setHeroTweak('')
    } catch (err: any) {
      setHeroError(err.message || 'That photo could not be opened.')
    }
  }, [])

  /** The description sent with a described hero, from the builder's choices. */
  const describedHero = () => {
    const type = CHARACTER_TYPES.find(t => t.value === characterType)?.label.toLowerCase() || characterType
    const base = heroDescription.trim() || `a ${selectedTraits.join(', ')} ${type}`
    return heroName.trim() ? `${heroName.trim()}, ${base}` : base
  }

  // Paint the hero, on their own, in the book's style. This is the first thing
  // made for a book with a hero, and nothing else is painted until it is approved.
  const handleCreateCharacter = async () => {
    setIsPaintingHero(true); setHeroError('')
    try {
      const res = await fetch('/api/create-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: heroMode === 'photo' ? heroPhotoDataUrl : undefined,
          description: heroMode === 'describe' ? describedHero() : heroDescription || undefined,
          name: heroName || undefined,
          isAdult: heroMode === 'photo' && characterImage ? heroIsAdult : heroMode === 'describe' ? heroIsAdult : undefined,
          style: illustrationStyle,
          tweak: characterImage ? heroTweak : undefined,
          userApiKey: userApiKey || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setHeroError(data.error || 'The hero could not be painted. Please try again.'); return }
      setCharacterImage(data.characterImage)
      setCharacterStyle(illustrationStyle)
      setHeroSaved(false)
      setHeroTweak('')
      if (data.hero) {
        if (heroMode === 'photo') setHeroIsAdult(!!data.hero.isAdult)
        if (data.hero.description && heroMode === 'photo') setHeroDescription(data.hero.description)
        if (data.hero.suggestedName && !heroName) setHeroName(data.hero.suggestedName)
      }
    } catch (err: any) {
      setHeroError(err.message || 'The hero could not be painted.')
    } finally {
      setIsPaintingHero(false)
    }
  }

  // A saved hero is already painted, so it goes straight in.
  const useSavedHero = (h: SavedHero) => {
    setHeroMode('photo')
    setHeroPhotoDataUrl(null)
    setCharacterImage(h.image)
    setCharacterStyle(null)
    setHeroName(h.name || '')
    setHeroDescription(h.description || '')
    setHeroIsAdult(!!h.isAdult)
    setHeroError(''); setHeroSaved(true)
  }

  const handleSaveHero = () => {
    if (!characterImage) return
    saveHero({
      id: `hero_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: heroName.trim() || 'My Hero',
      image: characterImage,
      description: heroMode === 'describe' ? describedHero() : heroDescription,
      isAdult: heroIsAdult,
    })
    setSavedHeroes(getSavedHeroes())
    setHeroSaved(true)
  }

  const handleRemoveHero = (id: string) => {
    removeHero(id)
    setSavedHeroes(getSavedHeroes())
  }

  // ── Making the book ──

  const doGenerate = async (overrideApiKey?: string) => {
    setIsGenerating(true); setGenerationProgress(0)
    pendingMetaRef.current = { ageRange, illustrationStyle }
    try {
      const template = STORY_TEMPLATES.find(t => t.id === selectedTemplate)
      let fullStoryIdea = template && template.id !== 'custom' ? `${template.prompt}\n\nStory idea: ${storyIdea}` : storyIdea
      const usingHero = heroMode !== 'story' && (!!characterImage || heroMode === 'describe')
      if (heroMode === 'describe' && !characterImage) {
        fullStoryIdea = `The main character is ${describedHero()}.\n\n${fullStoryIdea}`
      }
      const res = await fetch('/api/generate-book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyIdea: fullStoryIdea, ageRange, illustrationStyle,
          storyLength: parseInt(storyLength), narratorVoice, imageModel,
          userVeniceApiKey: (overrideApiKey || userApiKey) || undefined,
          language,
          consistentHero,
          dedication: dedication.trim() || undefined,
          hero: usingHero
            ? {
                image: characterImage || undefined,
                description: heroMode === 'describe' ? describedHero() : heroDescription || undefined,
                isAdult: heroIsAdult,
                name: heroName.trim() || undefined,
              }
            : undefined,
          character: heroMode === 'describe'
            ? { name: heroName.trim() || 'Hero', type: characterType, traits: selectedTraits }
            : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 403) { alert(err.error); setIsGenerating(false); return }
        throw new Error(err.error || 'Failed to make the book')
      }
      const data = await res.json()
      setBookId(data.bookId); setGenerationProgress(5)
    } catch (err: any) {
      const msg = err.message || ''
      const isNetworkError = msg === 'fetch failed' || msg === 'Failed to fetch' || msg.includes('network')
      alert(isNetworkError
        ? 'The connection timed out. Your story may still be on its way. Wait 30 seconds and check your shelf.'
        : msg || 'Failed to make the book. Please try again.')
      setIsGenerating(false); setGenerationProgress(0)
    }
  }

  const handleGenerate = async () => {
    if (!storyIdea.trim()) { goTo(1); return }
    if (freeBookCount >= FREE_BOOK_LIMIT && !userApiKey) { setShowApiKeyModal(true); return }
    await doGenerate()
  }

  const handleApiKeySave = (key: string) => {
    localStorage.setItem(LS_API_KEY, key); setUserApiKey(key); setShowApiKeyModal(false); doGenerate(key)
  }

  // ── Derived ──

  const selectedStyle = getStyle(illustrationStyle)
  const styleIndex = Math.max(0, ILLUSTRATION_STYLES.findIndex(s => s.value === selectedStyle.value))
  const otherStyles = [1, 2, 3].map(n => ILLUSTRATION_STYLES[(styleIndex + n) % ILLUSTRATION_STYLES.length])
  const timeEstimate = storyLength === '5' ? 'about 2 minutes' : storyLength === '8' ? 'about 3 minutes' : 'about 4 to 5 minutes'
  const characterIsStale = !!characterImage && !!characterStyle && characterStyle !== illustrationStyle
  // The hero step's one amber action: paint the hero while there is one to
  // paint and none yet, otherwise make the book.
  const heroNeedsPainting = heroMode === 'photo' && !!heroPhotoDataUrl && !characterImage

  return (
    <div className="kq-ground kq-has-tabbar relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header title="New book" showBack={false} />

        {showApiKeyModal && (
          <VeniceApiKeyModal onClose={() => setShowApiKeyModal(false)} onSave={handleApiKeySave} booksUsed={freeBookCount} />
        )}

        {showStyleSheet && (
          <AllStylesSheet
            current={selectedStyle.value}
            onPick={value => { setIllustrationStyle(value); setShowStyleSheet(false) }}
            onClose={() => setShowStyleSheet(false)}
          />
        )}

        <main className="mx-auto w-full max-w-xl grow px-4 py-6 sm:px-5">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-10">
              <GeneratingGame progress={generationProgress} />
            </div>
          ) : (
            <>
              <StepRail step={step} maxStep={maxStep} onGo={goTo} />

              {/* ══ Step 1: the idea ═══════════════════════════════════════ */}
              {step === 1 && (
                <section>
                  <h1 className="font-display text-2xl leading-snug text-kq-text">What is the story about?</h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-kq-dim">
                    One sentence is plenty. We write the rest.
                  </p>

                  <textarea
                    value={storyIdea}
                    onChange={e => setStoryIdea(e.target.value)}
                    className="kq-input mt-4"
                    rows={4}
                    autoFocus
                    placeholder={STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.example || 'A brave knight who is afraid of spiders'}
                  />

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStoryIdea(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)])}
                      className={`${QUIET} flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm`}
                    >
                      <Icon name="sync" size={15} /> Surprise me
                    </button>
                    <button
                      onClick={() => drawingFileInputRef.current?.click()}
                      disabled={isReadingDrawing}
                      className={`${QUIET} flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm disabled:opacity-60`}
                    >
                      <Icon name="image" size={15} /> {isReadingDrawing ? 'Reading it' : 'From a drawing'}
                    </button>
                  </div>
                  <input
                    ref={drawingFileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDrawingUpload(f); e.target.value = '' }}
                  />
                  {drawingError && <p className="mt-1.5 text-xs text-kq-dim">{drawingError}</p>}

                  <div className="mt-5">
                    <FieldLabel>Kind of story (optional)</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {STORY_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template.id)
                            if (template.id !== 'custom' && !storyIdea) setStoryIdea(template.example)
                          }}
                          className={`kq-chip ${selectedTemplate === template.id ? 'is-on' : ''}`}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                    {selectedTemplate !== 'custom' && (
                      <p className="mt-2 text-xs text-kq-dim">
                        {STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.description}.
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <button onClick={() => goTo(2)} disabled={!storyIdea.trim()} className="kq-btn-primary">
                      Next: choose the look <Icon name="arrow_forward" size={18} />
                    </button>
                  </div>
                </section>
              )}

              {/* ══ Step 2: the look ═══════════════════════════════════════ */}
              {step === 2 && (
                <section>
                  <h1 className="font-display text-2xl leading-snug text-kq-text">How should it be painted?</h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-kq-dim">
                    Every page, and the hero, is painted in this style.
                  </p>

                  <div className="relative mt-4 overflow-hidden rounded-xl border-2 border-kq-amber bg-kq-navy-mid">
                    <img
                      src={stylePlate(selectedStyle.value)}
                      alt={`${selectedStyle.label}, painted example`}
                      className="block aspect-[4/3] w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-kq-ink via-kq-ink/70 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="font-display text-xl text-kq-text">{selectedStyle.label}</div>
                      <div className="mt-0.5 text-sm leading-snug text-kq-dim">{selectedStyle.blurb}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-stretch gap-3">
                    {otherStyles.map(s => (
                      <button key={s.value} onClick={() => setIllustrationStyle(s.value)} className="min-w-0 flex-1 text-left">
                        <span className="block overflow-hidden rounded-md border border-kq-line">
                          <img src={stylePlate(s.value)} alt="" loading="lazy" className="block aspect-[4/3] w-full object-cover" />
                        </span>
                        <span className="mt-2 block min-h-[26px] break-words font-display text-[11px] leading-[1.2] text-kq-text">
                          {s.label}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => setShowStyleSheet(true)}
                      aria-label={`See all ${ILLUSTRATION_STYLES.length} styles`}
                      className="ml-1 grid h-10 w-10 shrink-0 self-center place-items-center rounded-md border border-kq-line bg-kq-text/10 text-kq-text transition-colors hover:bg-kq-text/20"
                    >
                      <Icon name="chevron_right" size={18} />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-2">
                    <button onClick={() => goTo(3)} className="kq-btn-primary">
                      Next: the hero <Icon name="arrow_forward" size={18} />
                    </button>
                    <button
                      onClick={() => setShowStyleSheet(true)}
                      className="text-center text-xs text-kq-dim underline decoration-kq-line underline-offset-4 transition-colors hover:text-kq-text"
                    >
                      Compare all {ILLUSTRATION_STYLES.length} styles side by side
                    </button>
                  </div>
                </section>
              )}

              {/* ══ Step 3: the hero ═══════════════════════════════════════ */}
              {step === 3 && (
                <section>
                  <h1 className="font-display text-2xl leading-snug text-kq-text">Who is the hero?</h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-kq-dim">
                    We paint the hero first, so they look the same on every page.
                  </p>

                  {/* Three ways in, as one choice */}
                  <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Choose a hero">
                    {([
                      { mode: 'photo', icon: 'add_photo_alternate', label: 'From a photo' },
                      { mode: 'describe', icon: 'edit', label: 'Describe one' },
                      { mode: 'story', icon: 'auto_stories', label: 'Story decides' },
                    ] as { mode: HeroMode; icon: string; label: string }[]).map(o => (
                      <button
                        key={o.mode}
                        role="radio"
                        aria-checked={heroMode === o.mode}
                        onClick={() => {
                          setHeroMode(o.mode)
                          if (o.mode !== heroMode) clearCharacter()
                          if (o.mode === 'photo' && !heroPhotoDataUrl) heroFileInputRef.current?.click()
                        }}
                        className={plateClass(heroMode === o.mode, 'flex flex-col items-center gap-1.5 px-2 py-3 text-center')}
                      >
                        <Icon name={o.icon} size={20} className={heroMode === o.mode ? 'text-kq-amber' : 'text-kq-dim'} />
                        <span className="text-xs font-medium text-kq-text">{o.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    ref={heroFileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroPhoto(f); e.target.value = '' }}
                  />

                  {/* Heroes painted for earlier books, ready to reuse for a series */}
                  {savedHeroes.length > 0 && heroMode !== 'story' && (
                    <div className="mt-4">
                      <FieldLabel>Your heroes</FieldLabel>
                      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                        {savedHeroes.map(h => (
                          <div key={h.id} className="relative shrink-0 text-center">
                            <button
                              onClick={() => useSavedHero(h)}
                              title={`Use ${h.name}`}
                              className={`block overflow-hidden rounded-md border transition-colors ${
                                characterImage === h.image ? 'border-kq-amber' : 'border-kq-line hover:border-kq-text/30'
                              }`}
                            >
                              <img src={h.image} alt={h.name} className="h-16 w-14 object-cover" />
                            </button>
                            <p className="mt-0.5 w-14 truncate text-[10px] text-kq-dim">{h.name}</p>
                            <button
                              onClick={() => handleRemoveHero(h.id)}
                              aria-label={`Remove ${h.name}`}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-[5px] border border-kq-line bg-kq-navy text-kq-text"
                            >
                              <Icon name="close" size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* A photo: show it, then the painted hero beside it */}
                  {heroMode === 'photo' && (heroPhotoDataUrl || characterImage) && (
                    <div className="mt-4 rounded-xl border border-kq-line bg-kq-card p-3">
                      <div className="flex items-stretch gap-3">
                        {heroPhotoDataUrl && (
                          <>
                            <div className="w-2/5 min-w-0">
                              <p className="mb-1 text-center text-[11px] text-kq-dim">Photo</p>
                              <div className="relative">
                                <img src={heroPhotoDataUrl} alt="The uploaded photo" className="aspect-[3/4] w-full rounded-md border border-kq-line object-cover" />
                                <button
                                  onClick={() => heroFileInputRef.current?.click()}
                                  aria-label="Choose a different photo"
                                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-[6px] border border-kq-line bg-kq-navy/90 text-kq-text"
                                >
                                  <Icon name="sync" size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center"><Icon name="arrow_forward" size={18} className="text-kq-dim" /></div>
                          </>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-center text-[11px] text-kq-dim">Painted hero</p>
                          <HeroSheet image={characterImage} painting={isPaintingHero} />
                        </div>
                      </div>
                    </div>
                  )}

                  {heroMode === 'photo' && !heroPhotoDataUrl && !characterImage && (
                    <button
                      onClick={() => heroFileInputRef.current?.click()}
                      className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-kq-line px-3 py-6 transition-colors hover:bg-kq-text/5"
                    >
                      <Icon name="add_photo_alternate" size={24} className="shrink-0 text-kq-dim" />
                      <div className="text-left">
                        <p className="text-sm text-kq-text">Choose a photo</p>
                        <p className="text-xs text-kq-dim">A child, or a grown-up they love. A clear face works best.</p>
                      </div>
                    </button>
                  )}

                  {/* Words: the character builder, folded into the hero step */}
                  {heroMode === 'describe' && (
                    <div className="mt-4 space-y-4 rounded-xl border border-kq-line bg-kq-card p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {CHARACTER_TYPES.map(type => (
                          <button
                            key={type.value}
                            onClick={() => { setCharacterType(type.value); clearCharacter() }}
                            className={plateClass(characterType === type.value, 'p-2.5 text-left')}
                          >
                            <div className="text-xs font-medium text-kq-text">{type.label}</div>
                            <div className="text-[11px] text-kq-dim">{type.description}</div>
                          </button>
                        ))}
                      </div>
                      <div>
                        <FieldLabel>Personality (up to 4)</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {CHARACTER_TRAITS.map(trait => {
                            const on = selectedTraits.includes(trait)
                            return (
                              <button
                                key={trait}
                                onClick={() => {
                                  if (on) setSelectedTraits(selectedTraits.filter(t => t !== trait))
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
                      <textarea
                        value={heroDescription}
                        onChange={e => { setHeroDescription(e.target.value); clearCharacter() }}
                        rows={2}
                        className="kq-input !py-2.5 !text-sm"
                        placeholder="What do they look like? For example: a small fox with one white ear and a yellow raincoat"
                      />
                      {characterImage || isPaintingHero ? (
                        <div className="mx-auto w-1/2"><HeroSheet image={characterImage} painting={isPaintingHero} /></div>
                      ) : null}
                    </div>
                  )}

                  {/* The hero's name and age, once there is a hero */}
                  {heroMode !== 'story' && (characterImage || heroMode === 'describe') && (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                            className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${heroIsAdult === o.v ? 'bg-kq-text/10 text-kq-text' : 'text-kq-dim hover:text-kq-text'}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Not quite right? Say what to change and paint again. */}
                  {characterImage && heroMode !== 'story' && (
                    <div className="mt-3 space-y-2">
                      {characterIsStale && (
                        <p className="rounded-md border border-kq-line px-3 py-2 text-xs text-kq-dim">
                          This hero was painted in another style. Paint again to match {selectedStyle.label}.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={heroTweak}
                          onChange={e => setHeroTweak(e.target.value)}
                          placeholder="Change something? For example: give her a red scarf"
                          className="kq-input flex-1 !px-3 !py-2 !text-xs"
                        />
                        <button
                          onClick={handleCreateCharacter}
                          disabled={isPaintingHero || (heroMode === 'photo' && !heroPhotoDataUrl && !heroDescription)}
                          className={`${QUIET} flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50`}
                        >
                          <Icon name="brush" size={14} /> Paint again
                        </button>
                      </div>
                      <button
                        onClick={handleSaveHero}
                        disabled={heroSaved}
                        className={`${QUIET} flex w-full items-center justify-center gap-2 px-3 py-2 text-xs disabled:opacity-60`}
                      >
                        <Icon name="star" size={14} />
                        {heroSaved ? 'Saved to your heroes' : 'Save this hero for next time'}
                      </button>
                    </div>
                  )}

                  {heroError && <p className="mt-3 rounded-md border border-kq-line px-3 py-2 text-xs text-kq-dim">{heroError}</p>}

                  {heroMode === 'story' && (
                    <p className="mt-4 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-3 text-sm leading-relaxed text-kq-dim">
                      The story invents its own hero. We still paint them first, so they stay the same on every page.
                    </p>
                  )}

                  {/* ── More options: everything here is optional ── */}
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    aria-expanded={showAdvanced}
                    className="mt-5 flex items-center gap-1.5 text-sm text-kq-dim transition-colors hover:text-kq-text"
                  >
                    <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} size={18} />
                    More options
                    <span className="text-xs text-kq-dim/80">
                      {STORY_LENGTHS.find(l => l.value === storyLength)?.pages} pages, {AGE_RANGES.find(a => a.value === ageRange)?.label.split(' (')[0]}, {language}
                    </span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-5 rounded-xl border border-kq-line bg-kq-card p-4">
                      <div>
                        <FieldLabel>Length</FieldLabel>
                        <div className="flex gap-2">
                          {STORY_LENGTHS.map(len => (
                            <button key={len.value} onClick={() => setStoryLength(len.value)} className={plateClass(storyLength === len.value, 'flex-1 px-2 py-2.5 text-center')}>
                              <div className="font-display text-xl">{len.pages}</div>
                              <div className="text-xs font-medium text-kq-text">{len.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Reader</FieldLabel>
                          <select value={ageRange} onChange={e => setAgeRange(e.target.value)} className="kq-input !py-2.5 !text-sm">
                            {AGE_RANGES.map(r => <option key={r.value} value={r.value} className="bg-kq-navy text-kq-text">{r.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Language</FieldLabel>
                          <select value={language} onChange={e => setLanguage(e.target.value)} className="kq-input !py-2.5 !text-sm">
                            {LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-kq-navy text-kq-text">{l.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Narrator</FieldLabel>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {NARRATORS.map(v => (
                            <button key={v.value} onClick={() => setNarratorVoice(v.value)} className={plateClass(narratorVoice === v.value, 'p-2 text-left')}>
                              <div className="text-xs font-medium text-kq-text">{v.label}</div>
                              <div className="text-[11px] leading-snug text-kq-dim">{v.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Painter</FieldLabel>
                        <select value={imageModel} onChange={e => setImageModel(e.target.value)} className="kq-input !py-2.5 !text-sm">
                          {IMAGE_MODEL_PRESETS.map(m => (
                            <option key={m.value} value={m.value} className="bg-kq-navy text-kq-text">
                              {m.label}: {m.value === '' && automaticModel ? automaticModel : m.description}
                            </option>
                          ))}
                          {liveModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-kq-navy text-kq-text">{m.name}</option>
                          ))}
                        </select>
                        <label className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-kq-dim">Paint the hero first and keep them identical on every page</span>
                          <span
                            className={`kq-toggle shrink-0 ${consistentHero ? 'on' : ''}`}
                            onClick={() => setConsistentHero(!consistentHero)}
                            role="switch"
                            aria-checked={consistentHero}
                            aria-label="Keep the hero identical on every page"
                          />
                        </label>
                      </div>

                      <div>
                        <FieldLabel>Dedication</FieldLabel>
                        <input
                          value={dedication}
                          onChange={e => setDedication(e.target.value)}
                          maxLength={200}
                          className="kq-input !py-2.5 !text-sm"
                          placeholder="For Maya, who is braver than she knows"
                        />
                      </div>

                      <div>
                        <FieldLabel>Venice API key</FieldLabel>
                        <FreeBooksBadge used={freeBookCount} hasApiKey={!!userApiKey} />
                        {userApiKey ? (
                          <button
                            onClick={() => { localStorage.removeItem(LS_API_KEY); setUserApiKey('') }}
                            className="text-xs text-kq-dim underline decoration-kq-line underline-offset-4 hover:text-kq-text"
                          >
                            Remove the saved key
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={apiKeyInputValue}
                              onChange={e => setApiKeyInputValue(e.target.value)}
                              placeholder="venice-api-..."
                              className="kq-input flex-1 !px-3 !py-2 !text-xs"
                            />
                            <button
                              onClick={() => { const t = apiKeyInputValue.trim(); if (!t) return; localStorage.setItem(LS_API_KEY, t); setUserApiKey(t); setApiKeyInputValue('') }}
                              disabled={!apiKeyInputValue.trim()}
                              className={`${QUIET} shrink-0 px-3 py-2 text-xs disabled:opacity-50`}
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* The step's one amber action */}
                  <div className="mt-6">
                    {heroNeedsPainting || (heroMode === 'describe' && !characterImage && isPaintingHero) ? (
                      <button onClick={handleCreateCharacter} disabled={isPaintingHero} className="kq-btn-primary">
                        <Icon name="brush" size={20} />
                        {isPaintingHero ? 'Painting your hero' : 'Paint my hero'}
                      </button>
                    ) : (
                      <button onClick={handleGenerate} disabled={!storyIdea.trim() || isPaintingHero} className="kq-btn-primary">
                        <Icon name="auto_awesome" size={20} />
                        Make this book
                      </button>
                    )}
                    {heroMode === 'describe' && !characterImage && !isPaintingHero && (
                      <button
                        onClick={handleCreateCharacter}
                        className="mt-2 w-full text-center text-xs text-kq-dim underline decoration-kq-line underline-offset-4 hover:text-kq-text"
                      >
                        See the hero first
                      </button>
                    )}
                    <p className="mt-2 text-center text-xs text-kq-dim">
                      {heroNeedsPainting
                        ? 'You will see your hero before any page is painted.'
                        : `Story and pictures are ready in ${timeEstimate}.`}
                      {freeBookCount >= FREE_BOOK_LIMIT && !userApiKey && (
                        <span className="mt-1 block text-kq-text">Add your Venice API key under More options to make more books.</span>
                      )}
                    </p>
                  </div>
                </section>
              )}
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

/** The painted hero, or the space where they will be. */
function HeroSheet({ image, painting }: { image: string | null; painting: boolean }) {
  if (image) {
    return (
      <div className="relative overflow-hidden rounded-md border border-kq-amber/50 bg-kq-cream">
        <img src={image} alt="The painted hero" className="aspect-[3/4] w-full object-contain" />
      </div>
    )
  }
  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed border-kq-line bg-kq-text/5">
      <div className="px-2 text-center">
        <Icon name={painting ? 'palette' : 'image'} size={22} className={`mx-auto mb-1 text-kq-dim ${painting ? 'animate-kq-spin' : ''}`} />
        <p className="text-xs text-kq-dim">{painting ? 'Painting' : 'Not painted yet'}</p>
      </div>
    </div>
  )
}
