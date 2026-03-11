'use client';

import { createContext, useContext } from 'react';

// Auth has been removed — the app runs entirely without Google/Firebase sign-in.
// This stub keeps component imports working with no behaviour change.

interface AuthContextType {
  user: null;
  loading: false;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}
