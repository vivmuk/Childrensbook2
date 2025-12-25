'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Icon } from './Icons';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

export function LoginModal({ isOpen, onClose, message }: LoginModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();

        try {
            await signInWithPopup(auth, provider);
            onClose();
        } catch (err: any) {
            console.error('Login error:', err);
            // Handle popup closed by user or other errors
            if (err?.code !== 'auth/popup-closed-by-user') {
                setError('Failed to sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform transition-all">
                {/* Header */}
                <div className="p-6 text-center border-b border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                        <Icon name="lock" className="text-purple-600 dark:text-purple-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        Login Required
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        {message || 'Join KinderQuill to create and save more magical stories!'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Icon name="sync" className="animate-spin text-gray-500" size={24} />
                        ) : (
                            // Google "G" Logo SVG
                            <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full text-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium mt-4 disabled:opacity-50"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}
