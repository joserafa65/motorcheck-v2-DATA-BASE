import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbClient } from '../services/database';
import type { User, Session, AuthError } from '@supabase/supabase-js';

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
    let unsub: any;

    const initAuth = async () => {
      const { data } = await dbClient.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      // solo escucha cambios después de la inicialización
      unsub = dbClient.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }).subscription;
    };

    initAuth();

    return () => {
      if (unsub && typeof unsub.unsubscribe === "function") {
        unsub.unsubscribe();
      }
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