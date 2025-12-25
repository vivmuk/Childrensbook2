'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { LoginModal } from './LoginModal';
import { Icon } from './Icons';

interface HeaderProps {
    title?: string;
    showHome?: boolean;
    showBack?: boolean;
}

export function Header({ title, showHome = true, showBack = true }: HeaderProps) {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <>
            <div className="flex items-center justify-between p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm flex-shrink-0 z-40 relative">
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

                <div className="flex items-center gap-2 relative">
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-gray-200" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                                        {user.email?.[0].toUpperCase() || 'U'}
                                    </div>
                                )}
                                <Icon name="expand_more" size={20} className="text-gray-500" />
                            </button>

                            {showDropdown && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 py-1">
                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                router.push('/library');
                                                setShowDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            <Icon name="menu_book" size={16} />
                                            My Library
                                        </button>
                                        <button
                                            onClick={() => {
                                                signOut();
                                                setShowDropdown(false);
                                                router.push('/');
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                        >
                                            <Icon name="logout" size={16} />
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            <Icon name="person" size={18} />
                            <span className="hidden sm:inline">Sign In</span>
                        </button>
                    )}
                </div>
            </div>

            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    );
}
