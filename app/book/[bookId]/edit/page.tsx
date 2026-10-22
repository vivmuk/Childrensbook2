'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { readApiKey, type ClientBook } from '@/lib/book-client'

/* ════════════════════════════════════════════════════════════════════════
   The studio: where a parent makes the book their own.

   The whole book sits along a storyboard. Pick a page and it opens on the
   desk: the picture, whole, and the words on warm paper. From there:

     - write: type, or ask a helper to rewrite the page ("make it rhyme")
     - ideas: three small suggestions, each one tap from a rewrite
     - paint: repaint the picture around the hero, or change one thing in it
     - arrange: move a page, add a new one anywhere, or take one out
     - cover: rename the book and letter the new title into a new cover

   Nothing is saved until "Save the book". Every change can be undone, page by
   page, until then. The one amber action on the screen is Save.
   ════════════════════════════════════════════════════════════════════════ */

interface DraftPage {
  key: string
  /** The page this came from in the saved book, so its picture need not be sent back. */
  from?: number
  text: string
  image: string
  scene?: string
  imageChanged: boolean
  /** Earlier versions of this page, newest last, for Undo. */
  history: Array<{ text: string; image: string; imageChanged: boolean }>
}

const QUICK_REWRITES = [
  'Make it funnier',
  'Make it rhyme',
  'Use simpler words',
  'Make it shorter',
  'Add a sound to say out loud',
  'Make it more magical',
]

const QUICK_PAINTS = ['Make it night time', 'Add a friendly animal', 'Make it snow', 'Add more colour']

let keySeq = 0
const newKey = () => `p${Date.now().toString(36)}${(keySeq++).toString(36)}`

export default function StudioPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [book, setBook] = useState<ClientBook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')

  // The draft
  const [title, setTitle] = useState('')
  const [dedication, setDedication] = useState('')
  const [author, setAuthor] = useState('')
  const [cover, setCover] = useState<{ image: string; changed: boolean; history: string[] }>({ image: '', changed: false, history: [] })
  const [pages, setPages] = useState<DraftPage[]>([])
  const [selected, setSelected] = useState<number>(-1) // -1 is the cover
  const [dirty, setDirty] = useState(false)

  // Helpers
  const [busy, setBusy] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [paintNote, setPaintNote] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback((b: ClientBook) => {
    setBook(b)
    setTitle(b.title)
    setDedication(b.meta?.dedication || '')
    setAuthor(b.meta?.author || '')
    setCover({ image: b.titlePage?.image || '', changed: false, history: [] })
    setPages(b.pages.map((p, i) => ({
      key: newKey(), from: i, text: p.text, image: p.image,
      scene: b.meta?.scenes?.[i]?.imageDescription, imageChanged: false, history: [],
    })))
    setDirty(false)
  }, [])

  useEffect(() => {
    setApiKey(readApiKey())
    fetch(`/api/book/${bookId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) load(d) })
      .finally(() => setIsLoading(false))
  }, [bookId, load])

  // Do not lose a parent's work to a stray tap on Back.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => { setIdeas([]); setInstruction(''); setPaintNote(''); setMessage('') }, [selected])

  const page = selected >= 0 ? pages[selected] : null

  // ── Changing the draft ──

  const updatePage = (i: number, change: Partial<DraftPage>, remember = true) => {
    setPages(ps => ps.map((p, j) => {
      if (j !== i) return p
      const history = remember ? [...p.history, { text: p.text, image: p.image, imageChanged: p.imageChanged }].slice(-12) : p.history
      return { ...p, ...change, history }
    }))
    setDirty(true)
  }

  /** Remember the page as it is before typing starts, so Undo can bring it back. */
  const snapshotPage = (i: number) => {
    setPages(ps => ps.map((p, j) => {
      if (j !== i) return p
      const last = p.history[p.history.length - 1]
      if (last && last.text === p.text && last.image === p.image) return p
      return { ...p, history: [...p.history, { text: p.text, image: p.image, imageChanged: p.imageChanged }].slice(-12) }
    }))
  }

  const undoPage = (i: number) => {
    setPages(ps => ps.map((p, j) => {
      if (j !== i || !p.history.length) return p
      const last = p.history[p.history.length - 1]
      return { ...p, ...last, history: p.history.slice(0, -1) }
    }))
    setDirty(true)
  }

  const movePage = (i: number, by: -1 | 1) => {
    const j = i + by
    if (j < 0 || j >= pages.length) return
    setPages(ps => {
      const next = [...ps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setSelected(j)
    setDirty(true)
  }

  const removePage = (i: number) => {
    if (pages.length <= 1) return
    if (!confirm(`Take page ${i + 1} out of the book?`)) return
    setPages(ps => ps.filter((_, j) => j !== i))
    setSelected(Math.min(i, pages.length - 2))
    setDirty(true)
  }

  // ── Asking the helpers ──

  const ask = async (action: string, extra: Record<string, unknown> = {}) => {
    setMessage('')
    const res = await fetch(`/api/book/${bookId}/studio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        title,
        pageTexts: pages.map(p => p.text),
        userApiKey: apiKey || undefined,
        ...extra,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'The helper did not answer. Please try again.')
    return data
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return
    setBusy(label)
    try { await fn() } catch (err: any) { setMessage(err.message) } finally { setBusy(null) }
  }

  const rewrite = (text?: string) => run('rewrite', async () => {
    const data = await ask('rewrite', { pageIndex: selected, instruction: text ?? instruction })
    updatePage(selected, { text: data.text })
    setInstruction('')
  })

  const getIdeas = () => run('ideas', async () => {
    const data = await ask('ideas', { pageIndex: selected })
    setIdeas(data.ideas || [])
  })

  const repaint = (note?: string) => run('repaint', async () => {
    const data = await ask('repaint', { pageIndex: selected, scene: page?.scene, instruction: note ?? paintNote })
    updatePage(selected, { image: data.image, imageChanged: true })
    setPaintNote('')
  })

  const touchUp = (note?: string) => run('touchup', async () => {
    const what = (note ?? paintNote).trim()
    if (!what) throw new Error('Say what to change first, for example "add a red balloon".')
    const data = await ask('touchup', { pageIndex: page?.from ?? selected, image: page?.imageChanged ? page.image : undefined, instruction: what })
    updatePage(selected, { image: data.image, imageChanged: true })
    setPaintNote('')
  })

  const addPage = (after: number) => run(`add:${after}`, async () => {
    const note = prompt('What happens on the new page? Leave it empty and the writer will decide.') ?? null
    if (note === null) throw new Error('')
    const data = await ask('newpage', { pageIndex: after, instruction: note })
    const fresh: DraftPage = { key: newKey(), text: data.text, image: data.image, scene: data.scene, imageChanged: true, history: [] }
    setPages(ps => [...ps.slice(0, after + 1), fresh, ...ps.slice(after + 1)])
    setSelected(after + 1)
    setDirty(true)
  })

  const newCover = () => run('cover', async () => {
    const data = await ask('cover', { instruction: paintNote })
    setCover(c => ({ image: data.image, changed: true, history: [...c.history, c.image].slice(-6) }))
    setDirty(true)
    setPaintNote('')
  })

  const undoCover = () => {
    setCover(c => c.history.length ? { image: c.history[c.history.length - 1], changed: true, history: c.history.slice(0, -1) } : c)
  }

  // ── Saving ──

  const save = async () => {
    if (!book || isSaving) return
    if (pages.some(p => !p.text.trim())) { setMessage('Every page needs some words before the book can be saved.'); return }
    setIsSaving(true); setMessage('')
    try {
      const res = await fetch(`/api/book/${bookId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, dedication, author,
          ...(cover.changed ? { coverImage: cover.image } : {}),
          pages: pages.map(p => ({
            ...(p.from !== undefined ? { from: p.from } : {}),
            text: p.text,
            ...(p.imageChanged || p.from === undefined ? { image: p.image } : {}),
            ...(p.scene && p.from === undefined ? { scene: p.scene } : {}),
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'The book could not be saved.')
      load(data)
      setMessage('Saved. Every change is in the book now.')
      updateShelfEntry(data)
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const wordCount = useMemo(() => (page ? page.text.trim().split(/\s+/).filter(Boolean).length : 0), [page])

  // ── Screens ──

  if (isLoading) {
    return <Centered><Icon name="edit" size={32} className="animate-kq-spin text-kq-amber" /><p className="mt-4 font-display text-lg text-kq-text">Opening the studio</p></Centered>
  }
  if (!book) {
    return <Centered><p className="font-display text-lg text-kq-text">We could not find this book</p></Centered>
  }
  if (book.isSample) {
    return (
      <Centered>
        <p className="font-display text-lg text-kq-text">Sample books stay as they are</p>
        <p className="mt-2 text-sm text-kq-dim">Make a book of your own to edit every page.</p>
        <button onClick={() => router.push('/generate')} className="kq-btn-primary mt-5 !w-auto">Make a book</button>
      </Centered>
    )
  }

  const busyNow = (label: string) => busy === label

  return (
    <div className="kq-ground kq-stars-bg relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative z-10 flex min-h-[100dvh] flex-col">

        {/* Top bar, with the one amber action: Save */}
        <div className="kq-top-bar">
          <button
            onClick={() => { if (!dirty || confirm('Leave without saving your changes?')) router.push(`/book/${bookId}`) }}
            className="kq-icon-btn" aria-label="Back to the book"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center">
            <div className="truncate font-display text-base text-kq-text">The studio</div>
            <div className="text-[11px] text-kq-dim">{dirty ? 'Changes not saved yet' : 'Everything saved'}</div>
          </div>
          <button onClick={save} disabled={!dirty || isSaving} className="kq-btn-primary !w-auto !px-4 !py-2 !text-sm">
            <Icon name="check" size={16} /> {isSaving ? 'Saving' : 'Save the book'}
          </button>
        </div>

        {/* The storyboard: the whole book along one strip */}
        <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-5">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-3 [scrollbar-width:thin]" aria-label="Storyboard">
            <BoardCard
              label="Cover"
              image={cover.image}
              on={selected === -1}
              onClick={() => setSelected(-1)}
            />
            {pages.map((p, i) => (
              <div key={p.key} className="flex shrink-0 items-stretch gap-2">
                <AddBetween onClick={() => addPage(i - 1)} busy={busyNow(`add:${i - 1}`)} label={i === 0 ? 'Add a page at the start' : `Add a page after page ${i}`} />
                <BoardCard
                  label={`${i + 1}`}
                  image={p.image}
                  words={p.text}
                  on={selected === i}
                  changed={p.imageChanged || p.from === undefined || p.history.length > 0}
                  onClick={() => setSelected(i)}
                />
              </div>
            ))}
            <AddBetween onClick={() => addPage(pages.length - 1)} busy={busyNow(`add:${pages.length - 1}`)} label="Add a page at the end" wide />
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-10 sm:px-5">
          {message && (
            <p role="status" className="mb-3 rounded-lg border border-kq-line bg-kq-text/5 px-3 py-2 text-sm text-kq-text">{message}</p>
          )}

          {/* ── The cover on the desk ── */}
          {selected === -1 && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="kq-page p-2 sm:p-3">
                {cover.image ? (
                  <img key={cover.image.slice(-40)} src={cover.image} alt="The cover" className="block h-auto max-h-[60dvh] w-full animate-bloom-in rounded-[12px] object-contain" />
                ) : (
                  <div className="flex aspect-[3/2] items-center justify-center text-sm">No cover yet</div>
                )}
              </div>
              <div className="space-y-4 rounded-xl border border-kq-line bg-kq-card p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-kq-dim" htmlFor="title">Title</label>
                  <input id="title" value={title} maxLength={120} onChange={e => { setTitle(e.target.value); setDirty(true) }} className="kq-input font-display !text-lg" />
                  {title.trim() !== book.title && (
                    <p className="mt-1.5 text-xs text-kq-dim">The cover still says the old title. Paint a new cover to letter this one in.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-kq-dim" htmlFor="ded">Dedication</label>
                  <input id="ded" value={dedication} maxLength={200} onChange={e => { setDedication(e.target.value); setDirty(true) }} className="kq-input !py-2.5 !text-sm" placeholder="For Maya, who is braver than she knows" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-kq-dim" htmlFor="author">Written by</label>
                  <input id="author" value={author} maxLength={80} onChange={e => { setAuthor(e.target.value); setDirty(true) }} className="kq-input !py-2.5 !text-sm" placeholder="Maya and Dad" />
                </div>
                <div>
                  <input value={paintNote} onChange={e => setPaintNote(e.target.value)} className="kq-input !py-2.5 !text-sm" placeholder="Anything to change on the cover? (optional)" />
                  <div className="mt-2 flex gap-2">
                    <button onClick={newCover} disabled={!!busy} className="kq-btn-secondary !py-2.5 !text-sm">
                      <Icon name="brush" size={16} className={busyNow('cover') ? 'animate-kq-spin' : ''} />
                      {busyNow('cover') ? 'Painting the cover' : 'Paint a new cover with this title'}
                    </button>
                    {cover.history.length > 0 && (
                      <button onClick={undoCover} className="kq-icon-btn shrink-0 !h-11 !w-11" aria-label="Undo the cover"><Icon name="undo" size={18} /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── A page on the desk ── */}
          {page && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="kq-page p-2 sm:p-3">
                  <img key={page.image.slice(-40)} src={page.image} alt={`Picture for page ${selected + 1}`} className="block h-auto max-h-[52dvh] w-full animate-bloom-in rounded-[12px] object-contain" />
                  <div className="px-2 pb-2 pt-3">
                    <textarea
                      value={page.text}
                      onChange={e => updatePage(selected, { text: e.target.value }, false)}
                      onFocus={() => snapshotPage(selected)}
                      rows={Math.min(9, Math.max(3, Math.ceil(page.text.length / 60)))}
                      aria-label={`Words on page ${selected + 1}`}
                      className="w-full resize-y rounded-md border border-[rgba(59,42,30,0.18)] bg-transparent p-3 font-display text-[1.15rem] leading-relaxed text-[rgb(59,42,30)] outline-none focus:border-[rgba(59,42,30,0.45)]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[rgba(59,42,30,0.6)]">
                      <span>Page {selected + 1} of {pages.length}</span>
                      <span>{wordCount} words</span>
                    </div>
                  </div>
                </div>

                {/* Arranging this page */}
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => movePage(selected, -1)} disabled={selected === 0} className="kq-btn-secondary !w-auto !px-3 !py-2 !text-xs disabled:opacity-40">
                    <Icon name="chevron_left" size={15} /> Move earlier
                  </button>
                  <button onClick={() => movePage(selected, 1)} disabled={selected === pages.length - 1} className="kq-btn-secondary !w-auto !px-3 !py-2 !text-xs disabled:opacity-40">
                    Move later <Icon name="chevron_right" size={15} />
                  </button>
                  <button onClick={() => undoPage(selected)} disabled={!page.history.length} className="kq-btn-secondary !w-auto !px-3 !py-2 !text-xs disabled:opacity-40">
                    <Icon name="undo" size={15} /> Undo
                  </button>
                  <button onClick={() => removePage(selected)} disabled={pages.length <= 1} className="kq-btn-secondary !w-auto !px-3 !py-2 !text-xs disabled:opacity-40">
                    <Icon name="delete" size={15} /> Take out
                  </button>
                </div>
              </div>

              {/* The helpers */}
              <div className="space-y-4">
                <section className="rounded-xl border border-kq-line bg-kq-card p-4">
                  <h2 className="flex items-center gap-2 font-display text-base text-kq-text"><Icon name="edit" size={16} className="text-kq-dim" /> Rewrite the words</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {QUICK_REWRITES.map(q => (
                      <button key={q} onClick={() => rewrite(q)} disabled={!!busy} className="kq-chip disabled:opacity-50">{q}</button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={instruction}
                      onChange={e => setInstruction(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && instruction.trim()) rewrite() }}
                      className="kq-input flex-1 !px-3 !py-2 !text-sm"
                      placeholder="Or say it your way: give the moon a line"
                    />
                    <button onClick={() => rewrite()} disabled={!!busy || !instruction.trim()} className="kq-btn-secondary !w-auto shrink-0 !px-3 !py-2 !text-sm disabled:opacity-50">
                      {busyNow('rewrite') ? 'Writing' : 'Rewrite'}
                    </button>
                  </div>
                  <button onClick={getIdeas} disabled={!!busy} className="mt-3 flex items-center gap-1.5 text-xs text-kq-dim hover:text-kq-text disabled:opacity-50">
                    <Icon name="lightbulb" size={15} /> {busyNow('ideas') ? 'Thinking' : 'Stuck? Get three ideas for this page'}
                  </button>
                  {ideas.length > 0 && (
                    <div className="mt-2 grid gap-1.5">
                      {ideas.map(idea => (
                        <button key={idea} onClick={() => rewrite(idea)} disabled={!!busy} className="flex items-center justify-between gap-2 rounded-md border border-kq-line bg-kq-text/5 px-3 py-2 text-left text-xs text-kq-text hover:bg-kq-text/10 disabled:opacity-50">
                          {idea} <Icon name="arrow_forward" size={14} className="shrink-0 text-kq-dim" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-kq-line bg-kq-card p-4">
                  <h2 className="flex items-center gap-2 font-display text-base text-kq-text"><Icon name="brush" size={16} className="text-kq-dim" /> Change the picture</h2>
                  <input
                    value={paintNote}
                    onChange={e => setPaintNote(e.target.value)}
                    className="kq-input mt-3 !px-3 !py-2 !text-sm"
                    placeholder="What should change? add a red balloon"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_PAINTS.map(q => (
                      <button key={q} onClick={() => touchUp(q)} disabled={!!busy} className="kq-chip disabled:opacity-50">{q}</button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => touchUp()} disabled={!!busy || !paintNote.trim()} className="kq-btn-secondary !py-2.5 !text-sm disabled:opacity-50">
                      {busyNow('touchup') ? 'Changing it' : 'Change just that'}
                    </button>
                    <button onClick={() => repaint()} disabled={!!busy} className="kq-btn-secondary !py-2.5 !text-sm disabled:opacity-50">
                      {busyNow('repaint') ? 'Painting' : 'Paint it again'}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-kq-dim">
                    {book.meta?.heroImage
                      ? 'New pictures are painted around the same hero, so they still match.'
                      : 'New pictures follow the book’s own description of its hero.'}
                  </p>
                </section>

                <button onClick={() => { if (!dirty || confirm('Open the book without saving these changes?')) router.push(`/book/${bookId}`) }} className="flex w-full items-center justify-center gap-2 text-sm text-kq-dim hover:text-kq-text">
                  <Icon name="menu_book" size={16} /> Read the book
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/** Keep the shelf's copy of the title and cover in step with the book. */
function updateShelfEntry(book: ClientBook) {
  try {
    const key = 'kinderquill_my_books'
    const all = JSON.parse(localStorage.getItem(key) || '[]')
    const next = all.map((b: any) => (b.id === book.id ? { ...b, title: book.title, titlePageImage: book.titlePage?.image ?? b.titlePageImage } : b))
    localStorage.setItem(key, JSON.stringify(next))
  } catch { /* ignore */ }
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="kq-ground flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">{children}</div>
}

function BoardCard({ label, image, words, on, changed, onClick }: {
  label: string; image: string; words?: string; on: boolean; changed?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-current={on ? 'true' : undefined}
      aria-label={label === 'Cover' ? 'The cover' : `Page ${label}`}
      className={`w-32 shrink-0 overflow-hidden rounded-lg border-2 bg-kq-card text-left transition-transform ${on ? 'border-kq-amber' : 'border-kq-line hover:-translate-y-0.5'}`}
    >
      <span className="relative block">
        {image ? <img src={image} alt="" loading="lazy" className="block h-20 w-full object-cover" /> : <span className="block h-20 w-full bg-kq-navy-mid" />}
        <span className="absolute left-1 top-1 rounded-[5px] bg-kq-ink/80 px-1.5 text-[10px] font-semibold text-kq-text">{label}</span>
        {changed && <span className="absolute right-1 top-1 h-2 w-2 rounded-[2px] bg-kq-amber" aria-label="Changed" />}
      </span>
      <span className="block h-9 overflow-hidden px-2 py-1 text-[10px] leading-snug text-kq-dim">
        {words ? words.slice(0, 70) : 'Title, dedication and the cover'}
      </span>
    </button>
  )
}

function AddBetween({ onClick, busy, label, wide }: { onClick: () => void; busy: boolean; label: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-dashed border-kq-line text-kq-dim transition-colors hover:bg-kq-text/5 hover:text-kq-text ${wide ? 'w-24 flex-col gap-1 text-[11px]' : 'w-7'}`}
    >
      <Icon name={busy ? 'progress_activity' : 'add'} size={16} className={busy ? 'animate-kq-spin' : ''} />
      {wide && (busy ? 'Writing' : 'New page')}
    </button>
  )
}
