'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStore, DEFAULT_MOCK_USER } from '@/lib/supabase/mockStore';
import { UserProfile } from '@/lib/supabase/types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Supabase Auth 모드
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      // 2. Local Mock Auth 모드
      const mockUser = mockStore.getCurrentUser();
      setUser(mockUser);
      setLoading(false);
    }
  }, []);

  const loginWithDevMock = useCallback((name?: string, email?: string) => {
    const newUser: UserProfile = {
      id: 'usr_dev_' + Math.random().toString(36).substring(2, 7),
      email: email || 'developer@nooklabs.io',
      display_name: name || 'Dev User',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${name || 'Dev'}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockStore.setCurrentUser(newUser);
    setUser(newUser);
    return newUser;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      mockStore.setCurrentUser(null);
    }
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isSupabaseConfigured,
    loginWithDevMock,
    signOut,
  };
}
