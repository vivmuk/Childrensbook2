'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { Header } from '@/components/Header'

interface ReadingStats {
  totalBooksRead: number
  totalReadingTime: number
  favoriteBooks: string[]
  recentBooks: any[]
}

interface ParentSettings {
  contentFilterEnabled: boolean
  maxBooksPerDay: number
  allowSharing: boolean
  requireApproval: boolean
}

export default function ParentDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [settings, setSettings] = useState<ParentSettings>({
    contentFilterEnabled: true,
    maxBooksPerDay: 10,
    allowSharing: true,
    requireApproval: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const statsResponse = await fetch('/api/reading')
      if (statsResponse.ok) {
        setStats(await statsResponse.json())
      }

      const settingsResponse = await fetch('/api/parent/settings')
      if (settingsResponse.ok) {
        const data = await settingsResponse.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      await fetch('/api/parent/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      alert('Settings saved!')
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="kq-ground flex min-h-screen items-center justify-center">
        <Icon name="auto_awesome" size={40} className="animate-kq-spin text-kq-amber" />
      </div>
    )
  }

  return (
    <div className="kq-ground kq-stars-bg relative min-h-screen overflow-x-hidden">
      <div className="relative z-10">
        <Header title="Parent Dashboard" />

        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`kq-chip ${activeTab === 'overview' ? 'is-on' : ''}`}
              style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`kq-chip ${activeTab === 'settings' ? 'is-on' : ''}`}
              style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            >
              Settings
            </button>
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* The three numbers live in one card rather than three
                  identical cards in a row, which the design forbids. */}
              <section className="kq-card mb-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <Icon name="menu_book" size={22} className="text-kq-dim" />
                    <div>
                      <p className="text-sm text-kq-dim">Books read</p>
                      <p className="font-display text-2xl text-kq-text">{stats?.totalBooksRead || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Icon name="hourglass_empty" size={22} className="text-kq-dim" />
                    <div>
                      <p className="text-sm text-kq-dim">Reading time</p>
                      <p className="font-display text-2xl text-kq-text">{formatTime(stats?.totalReadingTime || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Icon name="star" size={22} className="text-kq-dim" />
                    <div>
                      <p className="text-sm text-kq-dim">Favorites</p>
                      <p className="font-display text-2xl text-kq-text">{stats?.favoriteBooks?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Recently read */}
              <section className="kq-card mb-6">
                <h2 className="mb-4 font-display text-xl text-kq-text">Recently read</h2>
                {stats?.recentBooks && stats.recentBooks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {stats.recentBooks.slice(0, 5).map((book: any) => (
                      <button
                        key={book.id}
                        onClick={() => router.push(`/book/${book.id}`)}
                        className="flex items-center gap-4 rounded-md border border-kq-line bg-kq-navy-mid p-3 text-left transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <span className="kq-cover h-14 w-20 shrink-0 overflow-hidden">
                          {book.titlePage ? (
                            <img src={book.titlePage.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-kq-dim">
                              <Icon name="auto_stories" size={20} />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-base text-kq-text">{book.title}</span>
                          <span className="block text-sm text-kq-dim">{book.ageRange} grade</span>
                        </span>
                        <Icon name="chevron_right" size={22} className="shrink-0 text-kq-dim" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-kq-dim">No reading activity yet. Start reading some books.</p>
                )}
              </section>
            </>
          ) : (
            /* Settings */
            <div className="kq-card max-w-2xl">
              <h2 className="mb-6 font-display text-xl text-kq-text">Parent settings</h2>

              <div className="flex flex-col gap-6">
                {/* Content filter */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base text-kq-text">Content filter</h3>
                    <p className="text-sm text-kq-dim">Keep books age appropriate.</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, contentFilterEnabled: !settings.contentFilterEnabled })}
                    className={`kq-toggle ${settings.contentFilterEnabled ? 'on' : ''}`}
                    role="switch"
                    aria-checked={settings.contentFilterEnabled}
                    aria-label="Content filter"
                  />
                </div>

                {/* Max books per day */}
                <div>
                  <h3 className="text-base text-kq-text">Max books per day</h3>
                  <p className="mb-3 text-sm text-kq-dim">Limit how many books can be made each day.</p>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={settings.maxBooksPerDay}
                    onChange={(e) => setSettings({ ...settings, maxBooksPerDay: parseInt(e.target.value) })}
                    className="w-full accent-kq-amber"
                  />
                  <p className="mt-1 text-center text-sm text-kq-dim">{settings.maxBooksPerDay} books</p>
                </div>

                {/* Allow sharing */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base text-kq-text">Allow sharing</h3>
                    <p className="text-sm text-kq-dim">Let children share books with others.</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, allowSharing: !settings.allowSharing })}
                    className={`kq-toggle ${settings.allowSharing ? 'on' : ''}`}
                    role="switch"
                    aria-checked={settings.allowSharing}
                    aria-label="Allow sharing"
                  />
                </div>

                {/* Require approval */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base text-kq-text">Require approval</h3>
                    <p className="text-sm text-kq-dim">Approve books before they are made.</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, requireApproval: !settings.requireApproval })}
                    className={`kq-toggle ${settings.requireApproval ? 'on' : ''}`}
                    role="switch"
                    aria-checked={settings.requireApproval}
                    aria-label="Require approval"
                  />
                </div>

                {/* The one amber action on this screen */}
                <button onClick={saveSettings} className="kq-btn-primary">
                  Save settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
