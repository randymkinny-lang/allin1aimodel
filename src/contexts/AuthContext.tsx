import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Returns the user id when signed in, else a stable anonymous session id from localStorage */
  getIdentityId: () => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: 'Not ready' }),
  signUp: async () => ({ error: 'Not ready' }),
  signOut: async () => {},
  getIdentityId: () => '',
});

export const useAuth = () => useContext(AuthContext);

const ANON_KEY = 'lumina_session_id';
const getAnonId = () => {
  let sid = localStorage.getItem(ANON_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(ANON_KEY, sid);
  }
  return sid;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // When a user signs in, migrate any anonymous subscription to the real user
      // id, then drop the anonymous session id so media ties to the real user id.
      if (newSession?.user) {
        const anonId = localStorage.getItem(ANON_KEY);
        if (anonId && anonId !== newSession.user.id) {
          // Fire-and-forget claim; SubscriptionContext re-reads on user change.
          supabase.functions
            .invoke('manage-subscription', {
              body: { action: 'claim-subscription', identityId: anonId },
            })
            .catch(() => {});
        }
        localStorage.removeItem(ANON_KEY);
      }
    });


    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName ?? '' },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getIdentityId = () => user?.id ?? getAnonId();

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, getIdentityId }}>
      {children}
    </AuthContext.Provider>
  );
};
