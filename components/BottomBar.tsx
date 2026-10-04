'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Icon } from './Icons'

/**
 * The three things a parent actually does: read what they have, look at their
 * shelf, or go find something new. Everything else lives inside those three.
 *
 * Three items, not six. Six tabs was the reason the app felt like a website
 * with a menu rather than something you can hand to a child.
 *
 * It sits on the main screens only. The reader, the waiting screen and the
 * printed page deliberately do not render it: a book should fill the glass.
 */
export type Tab = 'read' | 'shelf' | 'discover'

const TABS: { key: Tab; label: string; href: string; icon: string }[] = [
  { key: 'read', label: 'Read', href: '/', icon: 'book' },
  { key: 'shelf', label: 'Shelf', href: '/library', icon: 'shelf' },
  { key: 'discover', label: 'Discover', href: '/gallery', icon: 'compass' },
]

export default function BottomBar({ active }: { active: Tab }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <nav className="kq-tabbar" aria-label="Main">
      <div className="kq-tabbar-inner">
        {TABS.map((t) => {
          const on = active === t.key || pathname === t.href
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => router.push(t.href)}
              aria-current={on ? 'page' : undefined}
              className={`kq-tab${on ? ' is-on' : ''}`}
            >
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
