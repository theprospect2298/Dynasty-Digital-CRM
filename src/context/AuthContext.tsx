import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, ALLOWED_OWNER_EMAIL, testConnection } from '../lib/firebase';

export type SyncStatus = 'saved' | 'saving' | 'offline';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAllowedOwner: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'saved' : 'offline');

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setSyncStatus('saved');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        testConnection().catch(() => {});
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setSyncStatus('saving');
      await signInWithPopup(auth, googleProvider);
      setSyncStatus('saved');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setSyncStatus(navigator.onLine ? 'saved' : 'offline');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const isAllowedOwner = Boolean(
    user && user.email && user.email.toLowerCase() === ALLOWED_OWNER_EMAIL.toLowerCase()
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAllowedOwner,
        signInWithGoogle,
        logout,
        syncStatus,
        setSyncStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
