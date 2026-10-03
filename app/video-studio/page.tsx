'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'

/* The video studio is a quiet night studio, not a control panel: one amber
   button to make the video, everything else is a hairline on the night. All
   the original behaviour is kept: the localStorage key and video gallery, the
   drag and drop upload, the polling loop, and the Venice API key handling. */

const LS_API_KEY = 'kinderquill_venice_api_key'
const LS_VIDEOS = 'kinderquill_videos'

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

const PROMPT_TIPS = [
  {
    title: 'Be specific',
    tip: 'Instead of "move", say "slowly wave hello with the right hand".',
  },
  {
    title: 'Add atmosphere',
    tip: 'Include weather, lighting, or a magical effect like "golden sunlight".',
  },
  {
    title: 'Describe feelings',
    tip: 'Try "jumps with excitement" or "tip-toes quietly" to show emotion.',
  },
  {
    title: 'Try many',
    tip: 'The same picture with a different prompt makes a very different video.',
  },
]

type VideoState = 'idle' | 'uploading' | 'generating' | 'done' | 'error'

interface VideoEntry {
  id: string
  imageDataUrl: string
  prompt: string
  videoDataUrl: string
  createdAt: string
}

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

/* A numbered marker for each of the three steps. A small rounded square, the
   house shape, with no amber so the one amber button stays the only accent. */
function StepMark({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-kq-line text-xs font-semibold text-kq-dim">
      {n}
    </span>
  )
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
    <div className="kq-ground relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* A fixed, soft star field so the studio feels like night, not a panel */}
      <div className="kq-stars-bg pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex flex-1 flex-col">
        <Header title="Video Studio" />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:py-12">
          {/* ══════════ The promise ══════════ */}
          <div className="mb-8 max-w-xl">
            <div className="kq-eyebrow mb-3">Video studio</div>
            <h1 className="kq-hero-title text-3xl sm:text-4xl">Bring a picture to life</h1>
            <p className="mt-4 text-base leading-relaxed text-kq-dim">
              Upload a picture, describe how it should move, and the studio paints the motion frame
              by frame.
            </p>
          </div>

          {/* ══════════ How it works ══════════ */}
          <section className="mb-6 rounded-md border border-kq-line-soft bg-kq-ink/40 p-5">
            <h2 className="font-display text-lg text-kq-text">How AI video works</h2>
            <p className="mt-2 text-sm leading-relaxed text-kq-dim">
              AI video models study millions of videos to understand how things move. When you write
              a prompt, you are telling the AI what kind of motion to imagine. The better your
              description, the better the video. This is called prompt engineering, a real skill
              used by AI artists and engineers every day.
            </p>
          </section>

          {/* ══════════ Venice API key ══════════ */}
          {userApiKey ? (
            <div className="kq-card mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Icon name="lock" size={18} className="text-kq-dim" />
                <p className="text-sm text-kq-text">Venice API key active</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem(LS_API_KEY)
                  setUserApiKey('')
                }}
                className="text-sm text-kq-dim underline decoration-kq-line underline-offset-4 transition-colors hover:text-kq-text"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mb-6">
              {!showApiKeyInput ? (
                <button
                  onClick={() => setShowApiKeyInput(true)}
                  className="kq-btn-secondary text-sm"
                >
                  <Icon name="lock" size={16} />
                  Add your Venice API key to make videos
                </button>
              ) : (
                <div className="kq-card">
                  <p className="mb-3 text-sm text-kq-dim">
                    Get a free key at{' '}
                    <a
                      href="https://venice.ai/chat?ref=yN8qqI"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-kq-text underline decoration-kq-line underline-offset-4"
                    >
                      venice.ai
                    </a>{' '}
                    and paste it here.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="password"
                      value={apiKeyInputValue}
                      onChange={e => setApiKeyInputValue(e.target.value)}
                      placeholder="venice-api-..."
                      className="kq-input flex-1"
                    />
                    {/* The design buttons are full width. In this row they should
                        sit beside the field, so the width is set to auto. */}
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
                      className="kq-btn-secondary text-sm"
                      style={{ width: 'auto' }}
                    >
                      Save key
                    </button>
                    <button
                      onClick={() => {
                        setShowApiKeyInput(false)
                        setApiKeyInputValue('')
                      }}
                      className="kq-icon-btn shrink-0"
                      title="Close"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        close
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ The studio card ══════════ */}
          <div className="kq-card mb-6">
            {/* Step 1: the picture */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2.5">
                <StepMark n={1} />
                <h2 className="text-sm font-semibold text-kq-text">Upload your picture</h2>
              </div>

              {imageDataUrl ? (
                <div className="relative">
                  <img
                    src={imageDataUrl}
                    alt="Uploaded"
                    className="kq-cover max-h-72 w-full object-contain"
                  />
                  {state === 'idle' && (
                    <button
                      onClick={() => {
                        setImageDataUrl(null)
                        setVideoDataUrl(null)
                        setState('idle')
                      }}
                      className="kq-icon-btn absolute right-2 top-2"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        close
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={e => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-md border border-dashed p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-kq-amber bg-kq-amber/10'
                      : 'border-kq-line hover:border-kq-dim hover:bg-kq-text/5'
                  }`}
                >
                  <div className="mb-3 flex justify-center">
                    <Icon name="image" size={36} className="text-kq-dim" />
                  </div>
                  <p className="text-sm font-semibold text-kq-text">
                    Drop a picture here, or click to choose one
                  </p>
                  <p className="mt-1 text-xs text-kq-dim">
                    JPG, PNG or WebP. Any picture from your book, a drawing, or a photo.
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) loadImage(f)
                }}
              />
            </div>

            {/* Step 2: the prompt */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2.5">
                <StepMark n={2} />
                <h2 className="text-sm font-semibold text-kq-text">
                  Describe what should happen
                </h2>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={state === 'generating'}
                className="kq-input min-h-[5rem]"
                placeholder="Describe the motion. For example: the character waves hello and sparkles float around them"
              />

              <p className="mb-2 mt-3 text-xs font-medium text-kq-dim">
                Try one of these prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="kq-chip cursor-pointer transition-colors hover:bg-kq-text/10"
                    /* The chip label never pushes the page wide on a small phone. */
                    style={{ whiteSpace: 'normal', maxWidth: '100%' }}
                  >
                    {p.length > 32 ? p.slice(0, 32) + '...' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: the video */}
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <StepMark n={3} />
                <h2 className="text-sm font-semibold text-kq-text">Make your video</h2>
              </div>

              {state === 'idle' && (
                <button
                  onClick={handleGenerate}
                  disabled={!imageDataUrl || !prompt.trim()}
                  className="kq-btn-primary"
                >
                  <Icon name="auto_awesome" size={18} />
                  Create video
                </button>
              )}

              {state === 'generating' && (
                <div className="space-y-4">
                  <div className="kq-progress-bar">
                    <div
                      className="kq-progress-fill"
                      style={{ transform: `scaleX(${progress / 100})` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-kq-text">
                      Painting your video frame by frame
                    </p>
                    <p className="mt-1 text-xs text-kq-dim">{progressLabel}</p>
                  </div>

                  <div className="rounded-md border border-kq-line-soft bg-kq-ink/40 p-4">
                    <p className="text-xs leading-relaxed text-kq-dim">
                      <span className="font-semibold text-kq-text">Did you know?</span> AI video
                      models make each frame by predicting what comes next, just like how you
                      predict the next word in a sentence when reading a book.
                    </p>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div className="space-y-3">
                  <div className="rounded-md border border-kq-line-soft bg-kq-ink/40 p-4">
                    <p className="text-sm text-kq-text">
                      <span className="font-semibold">Something went wrong.</span> {errorMsg}
                    </p>
                  </div>
                  <button onClick={() => setState('idle')} className="kq-btn-secondary">
                    Try again
                  </button>
                </div>
              )}

              {state === 'done' && videoDataUrl && (
                <div className="space-y-3">
                  <div className="kq-cover overflow-hidden">
                    <video
                      ref={videoRef}
                      src={videoDataUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-72 w-full object-contain"
                    />
                  </div>

                  <div className="rounded-md border border-kq-line-soft bg-kq-ink/40 p-4">
                    <p className="text-sm font-semibold text-kq-text">Your video is ready</p>
                    <p className="mt-1 text-xs leading-relaxed text-kq-dim">
                      The AI read your prompt and built motion from a still picture. Try a different
                      prompt to see how the words change the result.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a
                      href={videoDataUrl}
                      download="ai-video.mp4"
                      className="kq-btn-primary"
                      style={{ width: 'auto', flex: 1 }}
                    >
                      <Icon name="download" size={16} />
                      Download video
                    </a>
                    <button
                      onClick={handleReset}
                      className="kq-btn-secondary"
                      style={{ width: 'auto', flex: 1 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        add_photo_alternate
                      </span>
                      Make another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════ Prompt tips ══════════ */}
          <section className="mb-6 rounded-md border border-kq-line-soft bg-kq-ink/40 p-5">
            <h3 className="mb-4 font-display text-lg text-kq-text">Prompt tips</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROMPT_TIPS.map(({ title, tip }) => (
                <div
                  key={title}
                  className="rounded-md border border-kq-line-soft bg-kq-navy-mid/60 p-3"
                >
                  <p className="text-sm font-semibold text-kq-text">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-kq-dim">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════ Saved videos ══════════ */}
          {savedVideos.length > 0 && (
            <section className="w-full">
              <h3 className="mb-4 font-display text-lg text-kq-text">Your videos</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {savedVideos.map(entry => (
                  <div
                    key={entry.id}
                    className="overflow-hidden rounded-xl border border-kq-line-soft bg-kq-card"
                  >
                    {playingId === entry.id ? (
                      <video
                        src={entry.videoDataUrl}
                        controls
                        autoPlay
                        loop
                        className="h-40 w-full bg-kq-ink object-contain"
                      />
                    ) : (
                      <div className="relative">
                        <img
                          src={entry.imageDataUrl}
                          alt="Video thumbnail"
                          className="h-40 w-full object-cover"
                        />
                        <button
                          onClick={() => setPlayingId(entry.id)}
                          className="absolute inset-0 flex items-center justify-center bg-kq-ink/40 transition-colors hover:bg-kq-ink/55"
                          title="Play video"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-md border border-kq-line bg-kq-ink/70">
                            <span
                              className="material-symbols-outlined text-kq-cream"
                              style={{ fontSize: '26px' }}
                            >
                              play_arrow
                            </span>
                          </span>
                        </button>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="line-clamp-2 text-sm text-kq-text">{entry.prompt}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-kq-dim">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                        <a
                          href={entry.videoDataUrl}
                          download={`ai-video-${entry.id}.mp4`}
                          className="flex items-center gap-1.5 text-xs text-kq-dim transition-colors hover:text-kq-text"
                        >
                          <Icon name="download" size={14} />
                          Save
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="border-t border-kq-line-soft px-5 py-6 text-center">
          <p className="text-xs text-kq-dim">
            Powered by <span className="text-kq-text">Venice.ai</span> image to video AI
          </p>
        </footer>
      </div>
    </div>
  )
}
