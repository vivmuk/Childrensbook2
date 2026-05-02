'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
  showHome?: boolean;
  showBack?: boolean;
}

export function Header({ title, showHome = true, showBack = true }: HeaderProps) {
  const router = useRouter();

  return (
    <div className="kq-top-bar">
      {/* Left: nav buttons */}
      <div className="flex items-center gap-2">
        {showHome && (
          <button
            onClick={() => router.push('/')}
            className="kq-icon-btn"
            title="Home"
          >
            🏠
          </button>
        )}
        {showBack && (
          <button
            onClick={() => router.back()}
            className="kq-icon-btn"
            title="Back"
          >
            ←
          </button>
        )}
      </div>

      {/* Centre: title */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        {title && (
          <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: '1.15rem', color: '#fefcf5' }}>
            {title}
          </span>
        )}
      </div>

      {/* Right: Video Studio + My Books */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/video-studio')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: 'rgba(155,93,229,0.15)', border: '1.5px solid rgba(155,93,229,0.3)', color: '#c89dff' }}
          title="AI Video Lab"
        >
          🎬
          <span className="hidden sm:inline">Video Lab</span>
        </button>
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: 'rgba(77,201,255,0.12)', border: '1.5px solid rgba(77,201,255,0.3)', color: '#4dc9ff' }}
          title="My Books"
        >
          📚
          <span className="hidden sm:inline">My Books</span>
        </button>
      </div>
    </div>
  );
}
