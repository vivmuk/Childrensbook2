'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'
import { useAuth } from '@/components/AuthContext'
import { Header } from '@/components/Header'
import { LoginModal } from '@/components/LoginModal'

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
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<ReadingStats | null>(null)
  const [settings, setSettings] = useState<ParentSettings>({
    contentFilterEnabled: true,
    maxBooksPerDay: 10,
    allowSharing: true,
    requireApproval: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginModal(true)
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, loading])

  const fetchData = async () => {
    try {
      const token = await user?.getIdToken()
      
      // Fetch reading stats
      const statsResponse = await fetch('/api/reading', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (statsResponse.ok) {
        setStats(await statsResponse.json())
      }

      // Fetch parent settings
      const settingsResponse = await fetch('/api/parent/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
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
      const token = await user?.getIdToken()
      await fetch('/api/parent/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 flex items-center justify-center">
        <Icon name="auto_awesome" className="animate-spin text-purple-500" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <Header title="Parent Dashboard" />
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => router.push('/')} 
        message="Sign in to access the Parent Dashboard and track your child's reading!"
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon name="dashboard" className="inline mr-2" size={20} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon name="settings" className="inline mr-2" size={20} />
            Settings
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                  <Icon name="menu_book" className="text-purple-600" size={28} />
                </div>
                <h3 className="text-gray-500 font-medium mb-1">Books Read</h3>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalBooksRead || 0}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <Icon name="schedule" className="text-blue-600" size={28} />
                </div>
                <h3 className="text-gray-500 font-medium mb-1">Reading Time</h3>
                <p className="text-3xl font-bold text-gray-800">{formatTime(stats?.totalReadingTime || 0)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center mb-4">
                  <Icon name="favorite" className="text-pink-600" size={28} />
                </div>
                <h3 className="text-gray-500 font-medium mb-1">Favorites</h3>
                <p className="text-3xl font-bold text-gray-800">{stats?.favoriteBooks?.length || 0}</p>
              </div>
            </div>

            {/* Recent Books */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recently Read</h2>
              {stats?.recentBooks && stats.recentBooks.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentBooks.slice(0, 5).map((book: any) => (
                    <div 
                      key={book.id} 
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                      onClick={() => router.push(`/book/${book.id}`)}
                    >
                      <div className="w-16 h-12 bg-purple-200 rounded-lg overflow-hidden">
                        {book.titlePage ? (
                          <img src={book.titlePage.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name="auto_stories" className="text-purple-400" size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{book.title}</h4>
                        <p className="text-sm text-gray-500">{book.ageRange} grade</p>
                      </div>
                      <Icon name="chevron_right" className="text-gray-400" size={24} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No reading activity yet. Start reading some books!</p>
              )}
            </div>
          </>
        ) : (
          /* Settings Tab */
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Parent Settings</h2>
            
            <div className="space-y-6">
              {/* Content Filter */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Content Filter</h3>
                  <p className="text-sm text-gray-500">Ensure age-appropriate content</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, contentFilterEnabled: !settings.contentFilterEnabled })}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.contentFilterEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    settings.contentFilterEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Max Books Per Day */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Max Books Per Day</h3>
                <p className="text-sm text-gray-500 mb-3">Limit how many books can be created daily</p>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.maxBooksPerDay}
                  onChange={(e) => setSettings({ ...settings, maxBooksPerDay: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center font-semibold text-purple-600 mt-1">
                  {settings.maxBooksPerDay} books
                </div>
              </div>

              {/* Allow Sharing */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Allow Sharing</h3>
                  <p className="text-sm text-gray-500">Let children share books with others</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, allowSharing: !settings.allowSharing })}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.allowSharing ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    settings.allowSharing ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Require Approval */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Require Approval</h3>
                  <p className="text-sm text-gray-500">Approve books before they're created</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, requireApproval: !settings.requireApproval })}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.requireApproval ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    settings.requireApproval ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <button
                onClick={saveSettings}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
