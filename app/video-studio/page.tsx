'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'

const LS_API_KEY = 'kinderquill_venice_api_key'

const EXAMPLE_PROMPTS = [
  'The character slowly waves hello and smiles at the camera',
  'Magical sparkles and stars swirl around the scene',
  'The character jumps with joy as confetti falls from above',
  'Gentle wind blows through the scene and leaves rustle',
  'The character looks around curiously, eyes wide with wonder',
  'Rainbow colors ripple across the scene like a wave',
  'The character dances happily in a circle',
  'Fireflies and glowing lights float through the air',
  'Snow begins to fall gently on the scene',
  'The character runs forward and waves goodbye',
]

type VideoState = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

interface VideoEntry {
  id: string
  imageDataUrl: string
  prompt: string
  videoDataUrl: string
  createdAt: string
}

const LS_VIDEOS = 'kinderquill_videos'

function loadSavedVideos(): VideoEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_VIDEOS) || '[]')
  } catch {
    return []
  }
}

function saveVideo(entry: VideoEntry) {
  try {
    const existing = loadSavedVideos()
    const updated = [entry, ...existing].slice(0, 20)
    localStorage.setItem(LS_VIDEOS, JSON.stringify(updated))
  } catch {}
}

export default function VideoStudioPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [state, setState] = useState<VideoState>('idle')
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [userApiKey, setUserApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyInputValue, setApiKeyInputValue] = useState('')
  const [savedVideos, setSavedVideos] = useState<VideoEntry[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const queueRef = useRef<{ queueId: string; model: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const savedKey = localStorage.getItem(LS_API_KEY)
    if (savedKey) setUserApiKey(savedKey)
    setSavedVideos(loadSavedVideos())
  }, [])

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      setImageDataUrl(e.target?.result as string)
      setVideoDataUrl(null)
      setState('idle')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) loadImage(file)
    },
    [loadImage],
  )

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const pollForVideo = useCallback((queueId: string, model: string) => {
    stopPolling()
    let elapsed = 0
    const POLL_MS = 5000
    const ESTIMATED_MS = 90000

    pollRef.current = setInterval(async () => {
      elapsed += POLL_MS
      const pct = Math.min(95, Math.round((elapsed / ESTIMATED_MS) * 100))
      setProgress(pct)
      const remaining = Math.max(0, Math.round((ESTIMATED_MS - elapsed) / 1000))
      setProgressLabel(remaining > 5 ? `~${remaining}s remaining` : 'Almost done...')

      try {
        const res = await fetch('/api/animate-retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId, model, userApiKey }),
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.status === 'complete' && data.videoUrl) {
          stopPolling()
          setVideoDataUrl(data.videoUrl)
          setState('done')
          setProgress(100)
          setProgressLabel('Done!')

          const entry: VideoEntry = {
            id: `vid_${Date.now()}`,
            imageDataUrl: imageDataUrl!,
            prompt,
            videoDataUrl: data.videoUrl,
            createdAt: new Date().toISOString(),
          }
          saveVideo(entry)
          setSavedVideos(loadSavedVideos())
        } else if (data.averageTime) {
          const est = Math.max(0, Math.round((data.averageTime - elapsed) / 1000))
          if (est > 5) setProgressLabel(`~${est}s remaining`)
        }
      } catch {
        // ignore transient errors during polling
      }
    }, POLL_MS)
  }, [imageDataUrl, prompt, userApiKey])

  const handleGenerate = async () => {
    if (!imageDataUrl) {
      alert('Please upload an image first!')
      return
    }
    if (!prompt.trim()) {
      alert('Please describe what should happen in the video!')
      return
    }

    setState('generating')
    setProgress(2)
    setProgressLabel('Sending to AI...')
    setErrorMsg('')
    setVideoDataUrl(null)

    try {
      const res = await fetch('/api/video-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageDataUrl,
          prompt: prompt.trim(),
          userApiKey: userApiKey || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setErrorMsg(data.error || 'Failed to start video generation')
        return
      }

      queueRef.current = { queueId: data.queueId, model: data.model }
      setProgress(10)
      setProgressLabel('AI is creating your video...')
      pollForVideo(data.queueId, data.model)
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Failed to start video generation')
    }
  }

  const handleReset = () => {
    stopPolling()
    setImageDataUrl(null)
    setVideoDataUrl(null)
    setPrompt('')
    setState('idle')
    setProgress(0)
    setProgressLabel('')
    setErrorMsg('')
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900 font-display overflow-x-hidden">
      <Header title="AI Video Lab" />

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-3xl mx-auto w-full">

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🎬</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            AI Video Lab
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Upload any image, write a prompt, and watch AI bring it to life!
            Learn how to describe motion to an AI — just like real AI engineers do.
          </p>
        </div>

        {/* Educational callout */}
        <div className="w-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <span>🤖</span> How does AI video work?
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            AI video models study millions of videos to understand how things move.
            When you write a prompt, you are telling the AI <span className="font-semibold">what kind of motion</span> to imagine.
            The better your description, the better the video! This is called <span className="font-semibold">prompt engineering</span> —
            a real skill used by AI artists and engineers every day.
          </p>
        </div>

        {/* API Key */}
        {userApiKey ? (
          <div className="w-full mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>🔑</span>
              <p className="text-xs text-green-800 dark:text-green-300 font-medium">Venice API key active</p>
            </div>
            <button
              onClick={() => { localStorage.removeItem(LS_API_KEY); setUserApiKey('') }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="w-full mb-4">
            {!showApiKeyInput ? (
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="w-full text-xs text-purple-600 dark:text-purple-400 border border-dashed border-purple-300 dark:border-purple-600 rounded-xl px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🔑</span>
                Add your Venice API key to generate videos (get $10 free at venice.ai)
              </button>
            ) : (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl px-3 py-3">
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-2 font-semibold">
                  Get your free key at{' '}
                  <a href="https://venice.ai/chat?ref=yN8qqI" target="_blank" rel="noopener noreferrer" className="underline">
                    venice.ai ($10 free credits)
                  </a>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInputValue}
                    onChange={e => setApiKeyInputValue(e.target.value)}
                    placeholder="venice-api-..."
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const k = apiKeyInputValue.trim()
                      if (!k) return
                      localStorage.setItem(LS_API_KEY, k)
                      setUserApiKey(k)
                      setApiKeyInputValue('')
                      setShowApiKeyInput(false)
                    }}
                    disabled={!apiKeyInputValue.trim()}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowApiKeyInput(false); setApiKeyInputValue('') }}
                    className="px-2 py-1.5 text-xs text-gray-500"
                  >✕</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main card */}
        <div className="w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 dark:border-gray-700/60 p-5 mb-6">

          {/* Step 1: Upload */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">1</span>
              Upload Your Image
            </h2>

            {imageDataUrl ? (
              <div className="relative">
                <img
                  src={imageDataUrl}
                  alt="Uploaded"
                  className="w-full max-h-64 object-contain rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gray-50 dark:bg-gray-900"
                />
                {state === 'idle' && (
                  <button
                    onClick={() => { setImageDataUrl(null); setVideoDataUrl(null); setState('idle') }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20'
                }`}
              >
                <div className="text-4xl mb-2">📸</div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Drop an image here or click to upload
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPG, PNG, WebP — any image from your book, a drawing, or a photo!
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadImage(f) }}
            />
          </div>

          {/* Step 2: Prompt */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              Describe What Should Happen
            </h2>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={state === 'generating'}
              className="w-full min-h-20 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all disabled:opacity-60"
              placeholder="Describe the motion... e.g. 'The character waves hello and sparkles float around them'"
            />

            {/* Example prompts */}
            <div className="mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">Try one of these prompts:</p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                  >
                    {p.length > 45 ? p.slice(0, 45) + '…' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Generate */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">3</span>
              Generate Your Video
            </h2>

            {state === 'idle' && (
              <button
                onClick={handleGenerate}
                disabled={!imageDataUrl || !prompt.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 px-6 py-4 text-base font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>🎬</span>
                Create AI Video
                <span>✨</span>
              </button>
            )}

            {state === 'generating' && (
              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse">
                    🎨 AI is painting your video frame by frame...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progressLabel}</p>
                </div>

                {/* Fun facts while waiting */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    <span className="font-bold">Did you know?</span> AI video models generate each frame
                    by predicting what comes next, just like how you predict the next word in a sentence
                    when reading a book!
                  </p>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-bold">Oops!</span> {errorMsg}
                  </p>
                </div>
                <button
                  onClick={() => setState('idle')}
                  className="w-full py-3 rounded-xl border-2 border-indigo-300 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {state === 'done' && videoDataUrl && (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 bg-black">
                  <video
                    ref={videoRef}
                    src={videoDataUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full max-h-64 object-contain"
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                    Your AI video is ready!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    The AI understood your prompt and created motion from a still image. Try different
                    prompts to see how the description changes the result!
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={videoDataUrl}
                    download="ai-video.mp4"
                    className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="download" size={16} />
                    Download Video
                  </a>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="add_photo_alternate" size={16} />
                    Make Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prompt tips */}
        <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span>💡</span> Prompt Tips for Kids
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '🎯', title: 'Be specific', tip: 'Instead of "move", say "slowly wave hello with the right hand"' },
              { icon: '🌈', title: 'Add atmosphere', tip: 'Include weather, lighting, or magical effects like "golden sunlight"' },
              { icon: '🎭', title: 'Describe feelings', tip: 'Try "jumps with excitement" or "tip-toes quietly" to show emotion' },
              { icon: '🔄', title: 'Experiment!', tip: 'Same image, different prompt = completely different video. Try many!' },
            ].map(({ icon, title, tip }) => (
              <div key={title} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved videos gallery */}
        {savedVideos.length > 0 && (
          <div className="w-full">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span>🎞️</span> Your Video Gallery
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedVideos.map(entry => (
                <div key={entry.id} className="bg-white/90 dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md">
                  {playingId === entry.id ? (
                    <video
                      src={entry.videoDataUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-40 object-contain bg-black"
                    />
                  ) : (
                    <div className="relative">
                      <img
                        src={entry.imageDataUrl}
                        alt="Video thumbnail"
                        className="w-full h-40 object-cover"
                      />
                      <button
                        onClick={() => setPlayingId(entry.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Icon name="play_arrow" size={28} className="text-indigo-600 ml-1" />
                        </div>
                      </button>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium">{entry.prompt}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</p>
                      <a
                        href={entry.videoDataUrl}
                        download={`ai-video-${entry.id}.mp4`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Icon name="download" size={12} />
                        Save
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Powered by <span className="font-semibold text-indigo-600 dark:text-indigo-400">Venice.ai</span> image-to-video AI
        </p>
      </footer>
    </div>
  )
}
