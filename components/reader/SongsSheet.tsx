'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icons'
import { bookFileName } from '@/lib/book-export'
import type { ClientSong } from '@/lib/book-client'

/**
 * The songs a book can have, as one sheet. Each one is made on request, takes
 * a minute or two, and is kept on the book once it exists. While one is being
 * composed the sheet can be closed and reopened; the work carries on.
 */

type Kind = ClientSong['kind']

const KINDS: { kind: Kind; title: string; blurb: string; icon: string }[] = [
  { kind: 'theme', title: 'Theme song', blurb: 'A catchy sing-along about the book', icon: 'music_note' },
  { kind: 'story', title: 'Story song', blurb: 'The whole story, sung verse by verse', icon: 'auto_stories' },
  { kind: 'lullaby', title: 'Lullaby', blurb: 'The same world, slowed down for sleep', icon: 'star' },
  { kind: 'background', title: 'Reading music', blurb: 'Quiet music to play under the read-aloud', icon: 'headphones' },
]

export interface SongJob {
  queueId: string
  model?: string
  title?: string
  lyrics?: string
  startedAt: number
}

interface Props {
  bookTitle: string
  songs: ClientSong[]
  jobs: Partial<Record<Kind, SongJob>>
  canMake: boolean
  onMake: (kind: Kind) => void
  onClose: () => void
}

export function SongsSheet({ bookTitle, songs, jobs, canMake, onMake, onClose }: Props) {
  const [openLyrics, setOpenLyrics] = useState<Kind | null>(null)
  const [, setTick] = useState(0)
  const anyJob = Object.keys(jobs).length > 0
  const closeRef = useRef<HTMLButtonElement>(null)

  // A gentle clock for the "composing" estimate.
  useEffect(() => {
    if (!anyJob) return
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [anyJob])

  useEffect(() => { closeRef.current?.focus() }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-kq-ink/80 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Songs for this book"
        className="kq-bottom-sheet max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-kq-line bg-kq-card p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-kq-text">Songs for this book</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="kq-icon-btn">
            <Icon name="close" size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-kq-dim">
          The words are written from the story itself, then sung. Each one takes a minute or two.
        </p>

        <div className="space-y-2.5">
          {KINDS.map(k => {
            const song = songs.find(s => s.kind === k.kind)
            const job = jobs[k.kind]
            const secs = job ? Math.round((Date.now() - job.startedAt) / 1000) : 0
            return (
              <div key={k.kind} className="rounded-lg border border-kq-line bg-kq-text/5 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-kq-line text-kq-dim">
                    <Icon name={k.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-kq-text">{song?.title || k.title}</div>
                    <div className="text-xs text-kq-dim">{k.blurb}</div>
                  </div>
                  {!song && !job && (
                    <button
                      onClick={() => onMake(k.kind)}
                      disabled={!canMake}
                      className="kq-btn-secondary !w-auto shrink-0 !px-3 !py-2 !text-xs disabled:opacity-50"
                    >
                      Make it
                    </button>
                  )}
                  {job && !song && (
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-kq-dim">
                      <Icon name="progress_activity" size={15} className="animate-kq-spin" />
                      Composing {secs}s
                    </span>
                  )}
                </div>

                {song && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <audio controls preload="none" src={song.url} className="h-9 min-w-0 flex-1" loop={k.kind === 'background'} />
                      <a
                        href={song.url}
                        download={bookFileName(`${bookTitle} ${k.title}`, 'mp3')}
                        className="kq-icon-btn shrink-0"
                        aria-label={`Download the ${k.title.toLowerCase()}`}
                      >
                        <Icon name="download" size={16} />
                      </a>
                    </div>
                    {song.lyrics && (
                      <>
                        <button
                          onClick={() => setOpenLyrics(openLyrics === k.kind ? null : k.kind)}
                          className="mt-2 flex items-center gap-1 text-xs text-kq-dim hover:text-kq-text"
                          aria-expanded={openLyrics === k.kind}
                        >
                          <Icon name={openLyrics === k.kind ? 'expand_less' : 'expand_more'} size={16} />
                          {openLyrics === k.kind ? 'Hide the words' : 'Sing along with the words'}
                        </button>
                        {openLyrics === k.kind && (
                          <div className="kq-sheet mt-2 whitespace-pre-line !p-4 font-display text-[15px] leading-relaxed">
                            {song.lyrics.split('\n').map((line, i) =>
                              /^\[.*\]$/.test(line.trim()) ? (
                                <span key={i} className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60 first:mt-0">
                                  {line.trim().slice(1, -1)}
                                </span>
                              ) : (
                                <span key={i} className="block">{line}</span>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!canMake && (
          <p className="mt-3 text-xs text-kq-dim">Add your Venice API key on the New book screen to make songs.</p>
        )}
      </div>
    </div>
  )
}
