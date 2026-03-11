'use client';

// Google / Firebase auth has been removed. This stub keeps existing imports
// compiling without rendering anything visible.

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  // No-op: auth is no longer required
  return null;
}
