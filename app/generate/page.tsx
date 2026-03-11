'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'
import { useAuth } from '@/components/AuthContext'
import { LoginModal } from '@/components/LoginModal'
import { Header } from '@/components/Header'

// ── Static data ─────────────────────────────────────────────────────────────

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten (age 5–6)' },
  { value: '1st', label: '1st Grade (age 6–7)' },
  { value: '2nd', label: '2nd Grade (age 7–8)' },
  { value: '3rd', label: '3rd Grade (age 8–9)' },
  { value: '4th', label: '4th Grade (age 9–10)' },
  { value: '5th', label: '5th Grade (age 10–11)' },
]

const ILLUSTRATION_STYLES = [
  { value: 'ghibli', label: 'Anime Watercolor Style', prompt: 'Studio Ghibli anime style, soft watercolor backgrounds, detailed hand-drawn characters, warm lighting, magical realism, Hayao Miyazaki inspired, whimsical and dreamy atmosphere' },
  { value: 'american-classic', label: 'Classic American Cartoon', prompt: 'Classic 1950s American cartoon style, bold outlines, bright primary colors, expressive characters, vintage Disney/Hanna-Barbera inspired, cheerful and nostalgic' },
  { value: 'watercolor', label: 'Whimsical Watercolor', prompt: 'Soft whimsical watercolor illustration, gentle pastel colors, flowing brushstrokes, dreamy and ethereal, delicate details, storybook illustration style' },
  { value: 'amar-chitra', label: 'Indian Illustrated Style', prompt: 'Amar Chitra Katha Indian comic style, bold black outlines, vibrant colors, detailed traditional Indian art elements, expressive faces, classic Indian illustration' },
  { value: 'chacha-chaudhary', label: 'Retro Bold Comic Style', prompt: 'Chacha Chaudhary Indian comic style, simple bold lines, flat bright colors, exaggerated expressions, humorous cartoon style, Pran Kumar Sharma inspired' },
  { value: 'tintin', label: 'Classic European Comic Style', prompt: 'Hergé Tintin clear line style (ligne claire), clean precise outlines, flat colors, detailed backgrounds, European comic book style, adventure illustration' },
]

const STORY_LENGTHS = [
  { value: '5', label: 'Quick Story (5 pages)', pages: 5, description: 'Perfect for bedtime · ~1 min' },
  { value: '8', label: 'Standard Story (8 pages)', pages: 8, description: 'Most popular · ~2 min' },
  { value: '12', label: 'Epic Adventure (12 pages)', pages: 12, description: 'Ultimate adventure · ~3 min' },
]

const CHARACTER_TYPES = [
  { value: 'animal', label: '🐾 Animal', description: 'A furry or feathered friend' },
  { value: 'person', label: '👤 Person', description: 'A boy, girl, or adult' },
  { value: 'fantasy', label: '🦄 Fantasy Creature', description: 'Dragons, unicorns, fairies' },
  { value: 'robot', label: '🤖 Robot', description: 'A mechanical friend' },
  { value: 'alien', label: '👽 Alien', description: 'From another world' },
]

const CHARACTER_TRAITS = [
  'brave', 'curious', 'kind', 'funny', 'shy', 'clever',
  'adventurous', 'gentle', 'mischievous', 'loyal', 'creative', 'determined',
]

const NARRATOR_VOICES = [
  { value: 'default', label: 'Default Voice', description: 'Warm and friendly' },
  { value: 'nova', label: 'Nova', description: 'Warm, slightly British accent' },
  { value: 'alloy', label: 'Alloy', description: 'Versatile, balanced tone' },
  { value: 'echo', label: 'Echo', description: 'Soft, gentle narration' },
  { value: 'fable', label: 'Fable', description: 'Perfect for storytelling' },
  { value: 'onyx', label: 'Onyx', description: 'Deep, calming voice' },
  { value: 'shimmer', label: 'Shimmer', description: 'Bright and cheerful' },
]

const STORY_TEMPLATES = [
  {
    id: 'bedtime',
    name: '🌙 Bedtime Story',
    description: 'Calm, soothing tales perfect for winding down',
    prompt: 'A gentle bedtime story with a calm, soothing tone. Include soft imagery, peaceful settings, and a comforting ending that helps children relax and feel safe. The story should have a sleepy, dreamlike quality.',
    example: 'A little cloud who helps the moon put the stars to sleep',
  },
  {
    id: 'adventure',
    name: '🗺️ Adventure Quest',
    description: 'Exciting journeys and thrilling discoveries',
    prompt: 'An exciting adventure story with brave characters, mysterious places to explore, and a quest or mission. Include moments of wonder, discovery, and triumph over challenges.',
    example: 'A young explorer who discovers a map to a hidden treasure',
  },
  {
    id: 'friendship',
    name: '🤝 Friendship Tale',
    description: 'Stories about making friends and kindness',
    prompt: 'A heartwarming story about friendship, kindness, and connection. Show characters learning to understand each other, helping one another, and the joy of true friendship.',
    example: 'Two unlikely animals who become best friends',
  },
  {
    id: 'learning',
    name: '📚 Learning Journey',
    description: 'Educational stories that teach while entertaining',
    prompt: 'An educational story that teaches a valuable lesson or introduces interesting facts about nature, science, or the world. Make learning fun through engaging characters and situations.',
    example: 'A curious caterpillar who learns about metamorphosis',
  },
  {
    id: 'ai-adventure',
    name: '🤖 AI Adventure',
    description: 'Learn about AI through a magical story',
    prompt: 'An educational and imaginative story that introduces children to Artificial Intelligence. Include a friendly AI or robot character who learns from examples, sometimes makes mistakes and improves, and helps people with kindness and creativity. Weave in age-appropriate concepts: AI learns from lots of data, AI can help with creative tasks, and humans and AI work best as partners. Make it magical, inspiring, and show that technology should be used responsibly and with heart. Include a gentle lesson about curiosity, learning from mistakes, and the wonder of discovery.',
    example: 'A curious little robot named Pixel who learns to paint by studying millions of beautiful pictures',
  },
  {
    id: 'birthday',
    name: '🎂 Birthday Special',
    description: 'Perfect for birthday celebrations',
    prompt: 'A festive birthday story full of joy, celebration, and special surprises. Include party elements, gifts, cake, and the magic of birthday wishes coming true.',
    example: 'A magical birthday party where balloons come to life',
  },
  {
    id: 'custom',
    name: '✨ Custom Story',
    description: 'Create your own unique tale',
    prompt: '',
    example: 'Write your own story idea below',
  },
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
  'An AI assistant who helps a child write their very first poem',
  'A cloud who cannot make rain and must find its purpose',
  'A brave butterfly who embarks on a journey across the seasons',
  'A young inventor who creates a machine that makes everyone smile',
  'A magical seed that grows into a tree of wishes',
]

// ── Venice API Key Instructions Modal ───────────────────────────────────────

interface ApiKeyModalProps {
  onClose: () => void
  onSave: (key: string) => void
}

function VeniceApiKeyModal({ onClose, onSave }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('')

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-purple-300 dark:border-purple-600 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your First Book Was Free!</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            To create more magical stories, you'll need your own free Venice AI API key.
          </p>
        </div>

        {/* What is Venice */}
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4 border border-purple-200 dark:border-purple-700">
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <span className="font-bold">Venice AI</span> is the AI service that powers your story and illustrations.
            Venice offers a <span className="font-bold text-green-600 dark:text-green-400">free tier</span> that&apos;s perfect for creating children&apos;s books — you only need a few credits per book!
          </p>
        </div>

        {/* Step-by-step instructions */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1">
            <span>🗝️</span> How to get your free API key:
          </h3>
          <ol className="space-y-2.5">
            {[
              { step: '1', text: 'Visit ', link: 'venice.ai', href: 'https://venice.ai', after: ' and create a free account' },
              { step: '2', text: 'Click your profile icon in the top-right corner', link: '', href: '', after: '' },
              { step: '3', text: 'Choose ', link: '"API Keys"', href: 'https://venice.ai/settings/api-keys', after: ' from the menu' },
              { step: '4', text: 'Click ', link: '"Create API Key"', href: '', after: ' and give it a name' },
              { step: '5', text: 'Copy your new key and paste it below!', link: '', href: '', after: '' },
            ].map(({ step, text, link, href, after }) => (
              <li key={step} className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {text}
                  {link && href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 underline font-medium">{link}</a>
                  )}
                  {link && !href && <span className="font-medium text-gray-800 dark:text-gray-200">{link}</span>}
                  {after}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Quick link */}
        <div className="flex justify-center mb-4">
          <a
            href="https://venice.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-xl shadow-md"
          >
            <span>🌐</span> Open Venice.ai
          </a>
        </div>

        {/* API Key Input */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Paste Your Venice API Key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="venice-api-..."
            className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            🔒 Stored only in your browser — never saved on our servers.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = keyInput.trim()
              if (!trimmed) { alert('Please enter your Venice API key'); return }
              onSave(trimmed)
            }}
            disabled={!keyInput.trim()}
            className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            Save &amp; Generate ✨
          </button>
        </div>

        {/* AI education note */}
        <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            🤖 <span className="font-semibold">Did you know?</span> You&apos;re using the same type of AI technology that powers tools used by professionals worldwide!
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main page component ──────────────────────────────────────────────────────

export default function GeneratePage() {
  const router = useRouter()
  const { user } = useAuth()

  // Form state
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('ghibli')
  const [storyLength, setStoryLength] = useState('8')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [narratorVoice, setNarratorVoice] = useState('default')

  // Character Builder
  const [characterName, setCharacterName] = useState('')
  const [characterType, setCharacterType] = useState('animal')
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['brave', 'curious'])
  const [showCharacterBuilder, setShowCharacterBuilder] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Auth / modals
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')

  // Venice API key
  const [userApiKey, setUserApiKey] = useState<string>('')
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [freeBookUsed, setFreeBookUsed] = useState(false)

  // Read URL params and saved API key on mount (client-side only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idea = params.get('idea')
    const age = params.get('ageRange')
    const style = params.get('illustrationStyle')
    if (idea) setStoryIdea(idea)
    if (age) setAgeRange(age)
    if (style) setIllustrationStyle(style)

    const savedKey = localStorage.getItem('kinderquill_venice_api_key')
    if (savedKey) setUserApiKey(savedKey)

    setFreeBookUsed(!!localStorage.getItem('kinderquill_free_book_used'))
  }, [])

  // Poll for book completion
  useEffect(() => {
    if (!bookId || !isGenerating) return

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/book-status/${bookId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed') {
            setIsGenerating(false)
            // Mark free book as used (after confirmed completed)
            if (!freeBookUsed) {
              localStorage.setItem('kinderquill_free_book_used', 'true')
              setFreeBookUsed(true)
            }
            router.push(`/book/${bookId}`)
          } else if (data.status === 'generating') {
            setGenerationProgress(Math.min(95, data.progress || 0))
          } else if (data.status === 'error') {
            setIsGenerating(false)
            alert('Something went wrong while generating your book. Please try again.')
          }
        }
      } catch {
        // ignore transient network errors while polling
      }
    }

    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, isGenerating, router, freeBookUsed])

  // Core generation function (accepts an optional key override for when user just saved a new key)
  const doGenerate = async (overrideApiKey?: string) => {
    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      let token = ''
      if (user) token = await user.getIdToken()

      const template = STORY_TEMPLATES.find(t => t.id === selectedTemplate)
      let fullStoryIdea =
        template && template.id !== 'custom'
          ? `${template.prompt}\n\nStory idea: ${storyIdea}`
          : storyIdea

      if (showCharacterBuilder && characterName) {
        fullStoryIdea = `The main character is ${characterName}, a ${characterType} who is ${selectedTraits.join(', ')}.\n\n${fullStoryIdea}`
      }

      const effectiveApiKey = overrideApiKey || userApiKey

      const res = await fetch('/api/generate-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          storyIdea: fullStoryIdea,
          ageRange,
          illustrationStyle: ILLUSTRATION_STYLES.find(s => s.value === illustrationStyle)?.prompt || illustrationStyle,
          storyLength: parseInt(storyLength),
          narratorVoice,
          userVeniceApiKey: effectiveApiKey || undefined,
          character: showCharacterBuilder
            ? { name: characterName, type: characterType, traits: selectedTraits }
            : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (res.status === 403) {
          alert(err.error)
          setIsGenerating(false)
          return
        }
        throw new Error(err.error || 'Failed to generate book')
      }

      const data = await res.json()
      setBookId(data.bookId)
      setGenerationProgress(5)
    } catch (err: any) {
      console.error('Generation error:', err)
      alert(err.message || 'Failed to generate book. Please try again.')
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      alert('Please enter a story idea!')
      return
    }

    // Check login / free-book limit for unauthenticated users
    if (!user && freeBookUsed) {
      setLoginMessage('You have already created your free book! Please sign in to create more magical stories and save them to your library.')
      setShowLoginModal(true)
      return
    }

    // After first book, require a Venice API key
    if (freeBookUsed && !userApiKey) {
      setShowApiKeyModal(true)
      return
    }

    await doGenerate()
  }

  const handleApiKeySave = (key: string) => {
    localStorage.setItem('kinderquill_venice_api_key', key)
    setUserApiKey(key)
    setShowApiKeyModal(false)
    doGenerate(key)
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Header title="Create Your Story" />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />

      {showApiKeyModal && (
        <VeniceApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleApiKeySave}
        />
      )}

      <main className="flex grow flex-col items-center justify-start px-4 py-2 text-center max-w-2xl mx-auto w-full">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
            <GeneratingGame progress={generationProgress} />
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="mx-auto w-full max-w-[110px] mb-3 mt-1">
              <div
                className="aspect-square w-full bg-contain bg-center bg-no-repeat rounded-xl shadow-md"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgxAGWRCcBULUnJqgvIcpUDARPA6HA7Jb_Z7cn000bl7LhpJaR1tBxt1fQWawCmnHktpfoYxghCRPlScKpEASscjupGf2qyw7977OD8DfGtKx4x951NC9lcOP1NJCRH1Kz7bUfFD8DM83wqgdp1p6tZysZVzVx53nHdI90YRbv93DH-Zzw-M49l3Rj47z3GYwx5qB3I42dznDYBXX8tH4b_B4ki_jLaygEa7ila4gWFMlbAa-5pbPnIlpel_16bbI0MQJ7LNRHxw")',
                }}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-800 dark:text-gray-100">
              Dream Up a Story
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
              Powered by AI — choose a template or invent your own magical tale
            </p>

            {/* Free-book notice */}
            {!freeBookUsed && (
              <div className="w-full mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-xs text-green-800 dark:text-green-300 text-left">
                  <span className="font-bold">Your first book is FREE!</span> No account needed. After that, use your free Venice AI API key.
                </p>
              </div>
            )}

            {/* API key status */}
            {userApiKey && (
              <div className="w-full mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔑</span>
                  <p className="text-xs text-blue-800 dark:text-blue-300">Venice API key saved</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('kinderquill_venice_api_key')
                    setUserApiKey('')
                  }}
                  className="text-xs text-red-500 dark:text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Story Templates */}
            <div className="w-full mb-4">
              <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Story Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STORY_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id)
                      if (template.id !== 'custom' && !storyIdea) {
                        setStoryIdea(template.example)
                      }
                    }}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-xs text-gray-800 dark:text-gray-200 leading-tight">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight hidden sm:block">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Adventure callout */}
              {selectedTemplate === 'ai-adventure' && (
                <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🤖 <span className="font-semibold">AI Adventure</span> — This special template teaches kids about Artificial Intelligence through a magical story, weaving in real AI concepts in a fun, age-appropriate way!
                  </p>
                </div>
              )}
            </div>

            {/* Story Input */}
            <div className="w-full mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your Story Idea
                </label>
                <button
                  onClick={() => setStoryIdea(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-200 rounded-lg transition-colors"
                >
                  <Icon name="auto_awesome" size={14} />
                  Random Idea
                </button>
              </div>
              <textarea
                value={storyIdea}
                onChange={e => setStoryIdea(e.target.value)}
                className="w-full min-h-24 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm resize-none transition-all"
                placeholder={
                  STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.example ||
                  'A brave knight who is afraid of spiders, or a magical treehouse that travels through time...'
                }
              />
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} size={20} />
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="w-full space-y-4 rounded-xl bg-white/90 dark:bg-gray-800/90 p-4 shadow-lg mb-3 backdrop-blur-sm">

                {/* Character Builder */}
                <div className="flex items-center justify-between">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="person" size={18} />
                    Character Builder
                  </label>
                  <button
                    onClick={() => setShowCharacterBuilder(!showCharacterBuilder)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      showCharacterBuilder
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {showCharacterBuilder ? 'On' : 'Off'}
                  </button>
                </div>

                {showCharacterBuilder && (
                  <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Character Name</label>
                      <input
                        type="text"
                        value={characterName}
                        onChange={e => setCharacterName(e.target.value)}
                        placeholder="e.g., Luna, Max, Pixel"
                        className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Character Type</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CHARACTER_TYPES.map(type => (
                          <button
                            key={type.value}
                            onClick={() => setCharacterType(type.value)}
                            className={`p-2 rounded-lg border-2 text-left transition-all ${
                              characterType === type.value
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-800'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}
                          >
                            <div className="text-xs font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Character Traits (select 2–4)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {CHARACTER_TRAITS.map(trait => (
                          <button
                            key={trait}
                            onClick={() => {
                              if (selectedTraits.includes(trait)) {
                                setSelectedTraits(selectedTraits.filter(t => t !== trait))
                              } else if (selectedTraits.length < 4) {
                                setSelectedTraits([...selectedTraits, trait])
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              selectedTraits.includes(trait)
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                            }`}
                          >
                            {trait}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Story Length */}
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="menu_book" size={18} /> Story Length
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {STORY_LENGTHS.map(len => (
                      <button
                        key={len.value}
                        onClick={() => setStoryLength(len.value)}
                        className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                          storyLength === len.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{len.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{len.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Range */}
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="child_care" size={18} /> Age Range
                  </label>
                  <select
                    value={ageRange}
                    onChange={e => setAgeRange(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none transition-all"
                  >
                    {AGE_RANGES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Illustration Style */}
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="palette" size={18} /> Illustration Style
                  </label>
                  <select
                    value={illustrationStyle}
                    onChange={e => setIllustrationStyle(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none transition-all"
                  >
                    {ILLUSTRATION_STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Narrator Voice */}
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="record_voice_over" size={18} /> Narrator Voice
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NARRATOR_VOICES.map(v => (
                      <button
                        key={v.value}
                        onClick={() => setNarratorVoice(v.value)}
                        className={`p-2 rounded-lg border-2 text-left transition-all ${
                          narratorVoice === v.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{v.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{v.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="w-full pt-2 pb-2">
              <button
                onClick={handleGenerate}
                disabled={!storyIdea.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icon name="auto_awesome" size={22} />
                Generate My Book!
                <Icon name="auto_awesome" size={22} />
              </button>

              {/* Time estimate */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⏱ Takes about {storyLength === '5' ? '1 min' : storyLength === '8' ? '2 min' : '3 min'} to create your book
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div>
  )
}
