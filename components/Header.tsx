'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icons'

interface HeaderProps {
  title?: string
  showHome?: boolean
  showBack?: boolean
}

/**
 * The shared top bar for every inner screen.
 *
 * Deliberately quiet: the amber fill belongs to the one main action on the
 * page, so the two shortcuts here are hairline buttons. Icons come from the
 * icon set rather than emoji, which the design rules do not allow in the UI.
 */
export function Header({ title, showHome = true, showBack = true }: HeaderProps) {
  const router = useRouter()

  return (
    <header className="kq-top-bar">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="kq-icon-btn"
            aria-label="Go back"
          >
            <Icon name="chevron_left" size={20} />
          </button>
        )}
        {showHome && (
          <button
            onClick={() => router.push('/')}
            className="kq-icon-btn"
            aria-label="Home"
          >
            <Icon name="home" size={18} />
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1 px-3 text-center">
        {title && (
          <span className="block truncate font-display text-lg text-kq-text">
            {title}
          </span>
        )}
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={() => router.push('/video-studio')}
          className="kq-btn-secondary w-auto px-3 py-2 text-sm"
          aria-label="Animate a picture"
        >
          <Icon name="movie" size={18} />
          <span className="hidden sm:inline">Animate</span>
        </button>
        <button
          onClick={() => router.push('/library')}
          className="kq-btn-secondary w-auto px-3 py-2 text-sm"
          aria-label="My books"
        >
          <Icon name="menu_book" size={18} />
          <span className="hidden sm:inline">Books</span>
        </button>
      </nav>
    </header>
  )
}
