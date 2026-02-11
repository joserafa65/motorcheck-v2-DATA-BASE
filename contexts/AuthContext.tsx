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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = dbClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await dbClient.auth.signUp({
        email,
        password,
      });

      if (error) return { error };

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signInEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await dbClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      setSession(data.session);
      setUser(data.user);

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signInGoogle = async () => {
    try {
      const { data, error } = await dbClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signInApple = async () => {
    try {
      const { data, error } = await dbClient.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    await dbClient.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUpEmail,
        signInEmail,
        signInGoogle,
        signInApple,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
