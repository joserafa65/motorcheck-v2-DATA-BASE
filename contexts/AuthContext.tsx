import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbClient } from '../services/database';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUpEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInGoogle: () => Promise<{ error: AuthError | null }>;
  signInApple: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener BEFORE getSession so no events are missed
    const { data: { subscription } } = dbClient.auth.onAuthStateChange((event, newSession) => {
      // Only clear state on an explicit sign-out — not on token refresh failures
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    });

    dbClient.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh session when the app returns from background (Capacitor only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;

    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        (async () => {
          const { data: { session: current } } = await dbClient.auth.getSession();
          if (!current) {
            await dbClient.auth.refreshSession();
          }
        })();
      });
      removeListener = () => handle.remove();
    })();

    return () => {
      removeListener?.();
    };
  }, []);

  const signUpEmail = async (email: string, password: string) => {
    const { data, error } = await dbClient.auth.signUp({ email, password });
    if (error) return { error };
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error: null };
  };

  const signInEmail = async (email: string, password: string) => {
    const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
    if (error) return { error };
    setSession(data.session);
    setUser(data.user);
    return { error: null };
  };

  const signInGoogle = async () => {
    const { error } = await dbClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  const signInApple = async () => {
    const { error } = await dbClient.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await dbClient.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://labappstudio.com/reset-password',
    });
    return { error };
  };

  const signOut = async () => {
    await dbClient.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUpEmail, signInEmail, signInGoogle, signInApple, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
