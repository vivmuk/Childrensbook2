'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { GeneratingGame } from '@/components/GeneratingGame'

const AGE_RANGES = [
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: '1st', label: '1st Grade' },
  { value: '2nd', label: '2nd Grade' },
  { value: '3rd', label: '3rd Grade' },
  { value: '4th', label: '4th Grade' },
  { value: '5th', label: '5th Grade' },
]

const ILLUSTRATION_STYLES = [
  { value: 'ghibli', label: 'Studio Ghibli Style', prompt: 'Studio Ghibli anime style, soft watercolor backgrounds, detailed hand-drawn characters, warm lighting, magical realism, Hayao Miyazaki inspired, whimsical and dreamy atmosphere' },
  { value: 'american-classic', label: 'Classic American Cartoon', prompt: 'Classic 1950s American cartoon style, bold outlines, bright primary colors, expressive characters, vintage Disney/Hanna-Barbera inspired, cheerful and nostalgic' },
  { value: 'watercolor', label: 'Whimsical Watercolor', prompt: 'Soft whimsical watercolor illustration, gentle pastel colors, flowing brushstrokes, dreamy and ethereal, delicate details, storybook illustration style' },
  { value: 'amar-chitra', label: 'Amar Chitra Katha Style', prompt: 'Amar Chitra Katha Indian comic style, bold black outlines, vibrant colors, detailed traditional Indian art elements, expressive faces, classic Indian illustration' },
  { value: 'chacha-chaudhary', label: 'Chacha Chaudhary Style', prompt: 'Chacha Chaudhary Indian comic style, simple bold lines, flat bright colors, exaggerated expressions, humorous cartoon style, Pran Kumar Sharma inspired' },
  { value: 'tintin', label: 'Tintin Adventure Style', prompt: 'Hergé Tintin clear line style (ligne claire), clean precise outlines, flat colors, detailed backgrounds, European comic book style, adventure illustration' },
]

const STORY_LENGTHS = [
  { value: '5', label: 'Quick Story (5 pages)', pages: 5, description: 'Perfect for bedtime' },
  { value: '8', label: 'Standard Story (8 pages)', pages: 8, description: 'Our most popular choice' },
  { value: '12', label: 'Epic Adventure (12 pages)', pages: 12, description: 'For the ultimate adventure' },
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
  'adventurous', 'gentle', 'mischievous', 'loyal', 'creative', 'determined'
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
  'A shy robot who learns to make friends by sharing its inventions',
  'A curious rabbit who discovers a secret door in the forest',
  'A tiny dragon who cannot breathe fire but has a special hidden talent',
  'A young girl who finds a talking compass that leads to lost toys',
  'A brave squirrel who must save the forest from a mysterious silence',
  'A friendly monster who lives under a child\'s bed and protects them from bad dreams',
  'A magical paintbrush that brings drawings to life',
  'A little penguin who loves to dance but lives where everyone waddles',
  'A wise old tree that teaches children about nature through stories',
  'A brave little star who falls from the sky and must find its way home',
  'A young explorer who discovers a hidden underwater city',
  'A magical library where books choose their readers',
  'A little fox who learns that being different makes you special',
  'A cloud who cannot make rain and must find its purpose',
  'A brave butterfly who embarks on a journey across the seasons',
  'A young inventor who creates a machine that makes everyone smile',
  'A magical seed that grows into a tree of wishes',
]

import { useAuth } from '@/components/AuthContext'
import { LoginModal } from '@/components/LoginModal'
import { Header } from '@/components/Header'

export default function GeneratePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [storyIdea, setStoryIdea] = useState('')
  const [ageRange, setAgeRange] = useState('2nd')
  const [illustrationStyle, setIllustrationStyle] = useState('ghibli')
  const [storyLength, setStoryLength] = useState('8')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  
  // Character Builder
  const [characterName, setCharacterName] = useState('')
  const [characterType, setCharacterType] = useState('animal')
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['brave', 'curious'])
  const [showCharacterBuilder, setShowCharacterBuilder] = useState(false)
  
  // Voice Selection
  const [narratorVoice, setNarratorVoice] = useState('default')


  useEffect(() => {
    if (!bookId || !isGenerating) return

    const checkBookStatus = async () => {
      try {
        const response = await fetch(`/api/book-status/${bookId}`)
        if (response.ok) {
          const statusData = await response.json()
          if (statusData.status === 'completed') {
            setIsGenerating(false)

            // Track free book usage if unauthenticated
            if (!user) {
              localStorage.setItem('kinderquill_free_book_generated', 'true')
            }

            router.push(`/book/${bookId}`)
          } else if (statusData.status === 'generating') {
            // Use server-reported progress, or estimate from pages
            const serverProgress = statusData.progress || 0
            setGenerationProgress(Math.min(95, serverProgress))
          }
        }
      } catch (error) {
        console.error('Error checking book status:', error)
      }
    }

    const interval = setInterval(checkBookStatus, 2000)
    return () => clearInterval(interval)
  }, [bookId, isGenerating, router, user])

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      alert('Please enter a story idea!')
      return
    }

    // 1. Check Auth & Limit
    if (!user) {
      // Check if they already used their free book
      const hasGeneratedFree = localStorage.getItem('kinderquill_free_book_generated')
      if (hasGeneratedFree) {
        setLoginMessage('You have already created your free book! Please sign in to create more magical stories and save them to your library.')
        setShowLoginModal(true)
        return
      }
    }

    // If user is logged in, we let the API enforce the 20 limit (we could check here too if we fetched books beforehand)

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Get token if user is logged in
      let token = ''
      if (user) {
        token = await user.getIdToken()
      }

      // Build full story prompt with template and character if provided
      const template = STORY_TEMPLATES.find(t => t.id === selectedTemplate)
      let fullStoryIdea = template && template.id !== 'custom' 
        ? `${template.prompt}\n\nStory idea: ${storyIdea}`
        : storyIdea
      
      // Add character details if character builder is used
      if (showCharacterBuilder && characterName) {
        const characterDescription = `The main character is ${characterName}, a ${characterType} who is ${selectedTraits.join(', ')}.`
        fullStoryIdea = `${characterDescription}\n\n${fullStoryIdea}`
      }

      const response = await fetch('/api/generate-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          storyIdea: fullStoryIdea,
          ageRange,
          illustrationStyle: ILLUSTRATION_STYLES.find(s => s.value === illustrationStyle)?.prompt || illustrationStyle,
          storyLength: parseInt(storyLength),
          narratorVoice,
          character: showCharacterBuilder ? {
            name: characterName,
            type: characterType,
            traits: selectedTraits
          } : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // If error is 403 (Limit reached), show alert
        if (response.status === 403) {
          alert(errorData.error)
          setIsGenerating(false)
          return
        }
        throw new Error('Failed to generate book')
      }

      const data = await response.json()
      setBookId(data.bookId)
      // Story generation starts immediately, show initial progress
      setGenerationProgress(5)
    } catch (error) {
      console.error('Error generating book:', error)
      alert('Failed to generate book. Please try again.')
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Header title="Create Your Story" />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />


      <main className="flex grow flex-col items-center justify-start px-4 py-2 text-center max-w-2xl mx-auto w-full overflow-y-auto min-h-0">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
            <GeneratingGame progress={generationProgress} />
          </div>
        ) : (
          /* Form State */
          <>
            {/* Illustration - Minimized */}
            <div className="mx-auto w-full max-w-[120px] mb-3">
              <div
                className="aspect-square w-full bg-contain bg-center bg-no-repeat rounded-xl shadow-md"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgxAGWRCcBULUnJqgvIcpUDARPA6HA7Jb_Z7cn000bl7LhpJaR1tBxt1fQWawCmnHktpfoYxghCRPlScKpEASscjupGf2qyw7977OD8DfGtKx4x951NC9lcOP1NJCRH1Kz7bUfFD8DM83wqgdp1p6tZysZVzVx53nHdI90YRbv93DH-Zzw-M49l3Rj47z3GYwx5qB3I42dznDYBXX8tH4b_B4ki_jLaygEa7ila4gWFMlbAa-5pbPnIlpel_16bbI0MQJ7LNRHxw")',
                }}
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-800 dark:text-gray-100">
              Dream Up a Story
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose a template or create your own magical tale
            </p>

            {/* Story Templates */}
            <div className="w-full mb-4">
              <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                Story Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STORY_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id)
                      if (template.id !== 'custom' && !storyIdea) {
                        setStoryIdea(template.example)
                      }
                    }}
                    disabled={isGenerating}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300'
                    } disabled:opacity-50`}
                  >
                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Story Input */}
            <div className="w-full mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your Story Idea
                </label>
                <button
                  onClick={() => {
                    const randomPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
                    setStoryIdea(randomPrompt)
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate a random story idea"
                >
                  <Icon name="auto_awesome" size={16} />
                  <span>Generate Idea</span>
                </button>
              </div>
              <textarea
                value={storyIdea}
                onChange={(e) => setStoryIdea(e.target.value)}
                className="w-full min-h-28 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-md transition-all resize-none"
                placeholder={STORY_TEMPLATES.find(t => t.id === selectedTemplate)?.example || "A brave knight who is afraid of spiders, or a magical treehouse that travels through time..."}
                disabled={isGenerating}
              />
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {showAdvanced ? (
                <span className="flex items-center gap-1">
                  <Icon name="expand_less" className="text-lg" size={20} />
                  Hide Advanced Options
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Icon name="expand_more" className="text-lg" size={20} />
                  Show Advanced Options
                </span>
              )}
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="w-full space-y-4 rounded-xl bg-white/90 dark:bg-gray-800/90 p-4 shadow-lg mb-3 backdrop-blur-sm">
                {/* Character Builder Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="person" className="text-lg" size={20} />
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

                {/* Character Builder Panel */}
                {showCharacterBuilder && (
                  <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Character Name
                      </label>
                      <input
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder="e.g., Luna, Max, Sparky"
                        className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 text-sm text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none"
                        disabled={isGenerating}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Character Type
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CHARACTER_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setCharacterType(type.value)}
                            disabled={isGenerating}
                            className={`p-2 rounded-lg border-2 text-left transition-all ${
                              characterType === type.value
                                ? 'border-purple-500 bg-purple-100 dark:bg-purple-800'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}
                          >
                            <div className="text-sm font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Character Traits (select 2-4)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CHARACTER_TRAITS.map((trait) => (
                          <button
                            key={trait}
                            onClick={() => {
                              if (selectedTraits.includes(trait)) {
                                setSelectedTraits(selectedTraits.filter(t => t !== trait))
                              } else if (selectedTraits.length < 4) {
                                setSelectedTraits([...selectedTraits, trait])
                              }
                            }}
                            disabled={isGenerating}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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

                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="menu_book" className="text-lg" size={20} />
                    Story Length
                  </label>
                  <select
                    value={storyLength}
                    onChange={(e) => setStoryLength(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-base text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={isGenerating}
                  >
                    {STORY_LENGTHS.map((length) => (
                      <option key={length.value} value={length.value}>
                        {length.label} — {length.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="child_care" className="text-lg" size={20} />
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
                    <Icon name="palette" className="text-lg" size={20} />
                    Illustration Style
                  </label>
                  <select
                    value={illustrationStyle}
                    onChange={(e) => setIllustrationStyle(e.target.value)}
                    className="rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-base text-gray-800 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    disabled={isGenerating}
                  >
                    {ILLUSTRATION_STYLES.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Narrator Voice Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Icon name="record_voice_over" className="text-lg" size={20} />
                    Narrator Voice
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NARRATOR_VOICES.map((voice) => (
                      <button
                        key={voice.value}
                        onClick={() => setNarratorVoice(voice.value)}
                        disabled={isGenerating}
                        className={`p-2 rounded-lg border-2 text-left transition-all ${
                          narratorVoice === voice.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{voice.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{voice.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="w-full pt-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !storyIdea.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600 hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Icon name="sync" className="animate-spin" size={24} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" size={24} />
                    Generate My Book!
                    <Icon name="auto_awesome" size={24} />
                  </>
                )}
              </button>
            </div>
          </>
        )
        }
      </main>

      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div >
  )
}

