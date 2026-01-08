'use client';
// Force rebuild: 2025-12-18T10:03

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signInAccount: (email: string, password: string) => Promise<void>;
  registerAccount: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Keep quickLogin for backward compatibility during transition
  quickLogin?: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        logger.setUserId(firebaseUser.uid);
        logger.logAuthEvent('User authenticated', {
          uid: firebaseUser.uid,
          email: firebaseUser.email
        });
      } else {
        logger.clearUserId();
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerAccount = useCallback(async (email: string, password: string): Promise<void> => {
    console.log('DEBUG: registerAccount called with:', email);
    console.trace('RegisterAccount call stack');
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      logger.logAuthEvent('Registration successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      });
    } catch (error: any) {
      console.error('DEBUG: Firebase Registration Error:', error);
      logger.error('Registration failed', error, { email });
      throw error;
    }
  }, []);

  const signInAccount = useCallback(async (email: string, password: string): Promise<void> => {
    console.log('DEBUG: signInAccount called with:', email);
    console.trace('SignInAccount call stack');
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      logger.logAuthEvent('SignIn successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      });
    } catch (error: any) {
      console.error('DEBUG: Firebase SignIn Error:', error);
      logger.error('SignIn failed', error, { email });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      logger.logAuthEvent('User logged out');
      window.location.href = '/login';
    } catch (error: any) {
      logger.error('Logout failed', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      logger.logAuthEvent('Password reset email sent', { email });
    } catch (error: any) {
      logger.error('Password reset failed', error, { email });
      throw error;
    }
  }, []);

  // Temporary backward compatibility - will be removed after migration
  const quickLogin = useCallback(async (profileId: string): Promise<void> => {
    console.warn('quickLogin is deprecated. Please use proper authentication.');
    // For now, we'll keep this for backward compatibility
    // In production, this should be removed
  }, []);

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn,
      isLoading,
      signInAccount,
      registerAccount,
      logout,
      resetPassword,
      quickLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
