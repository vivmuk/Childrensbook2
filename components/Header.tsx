'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './Icons';

interface HeaderProps {
  title?: string;
  showHome?: boolean;
  showBack?: boolean;
}

export function Header({ title, showHome = true, showBack = true }: HeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm flex-shrink-0 z-40 relative">
      {/* Left: nav buttons */}
      <div className="flex items-center gap-2">
        {showHome && (
          <button
            onClick={() => router.push('/')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 transition-colors"
            title="Home"
          >
            <Icon name="home" className="text-purple-700 dark:text-purple-300" size={24} />
          </button>
        )}
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            title="Back"
          >
            <Icon name="arrow_back" className="text-gray-700 dark:text-gray-300" size={24} />
          </button>
        )}
      </div>

      {/* Centre: logo + title */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        {title && (
          <>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA"
                alt="KinderQuill"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
              {title}
            </h2>
          </>
        )}
      </div>

      {/* Right: My Books */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 text-sm font-semibold transition-colors"
          title="My Books"
        >
          <Icon name="menu_book" size={18} />
          <span className="hidden sm:inline">My Books</span>
        </button>
      </div>
    </div>
  );
}
