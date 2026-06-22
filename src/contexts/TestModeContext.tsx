import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TEST_MODE_FLAG_KEY,
  TEST_MODE_LS_KEY,
  isTestModeEnabled,
  setTestModeLocal,
} from '@/lib/testMode';
import { useAuth } from './AuthContext';


interface TestModeContextValue {
  /** Is test-mode (unlock-all) currently active in this session? */
  enabled: boolean;
  /** True if the signed-in user's email is in the ADMIN_EMAILS allowlist. */
  isAdmin: boolean;
  /** True if this specific user has a personal beta-tester unlock (via invite code). */
  isPersonalBetaTester: boolean;
  /** True while we're checking admin status / fetching server flag. */
  loading: boolean;
  /**
   * Flip the flag. If the user is an admin, persists to the server too so
   * it becomes the new default for everyone after they next refresh.
   * Always updates this tab's localStorage immediately.
   */
  setEnabled: (value: boolean) => Promise<void>;
  /** Re-fetch admin status + server flag (e.g. after sign-in). */
  refresh: () => Promise<void>;
}

const TestModeContext = createContext<TestModeContextValue>({
  enabled: false,
  isAdmin: false,
  isPersonalBetaTester: false,
  loading: true,
  setEnabled: async () => {},
  refresh: async () => {},
});

export const useTestMode = () => useContext(TestModeContext);

export const TestModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => isTestModeEnabled());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPersonalBetaTester, setIsPersonalBetaTester] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for in-tab + cross-tab localStorage changes so all components stay in sync.
  useEffect(() => {
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setGlobalEnabled(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === TEST_MODE_LS_KEY) {
        setGlobalEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('lumina:test-mode-change', onLocal as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('lumina:test-mode-change', onLocal as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Public read of server flag — source of truth for global Test Mode.
      try {
        const { data: listData, error: listErr } = await supabase.functions.invoke(
          'admin-flags',
          { body: { action: 'list' } },
        );
        if (!listErr && listData) {
          const serverValue = Boolean(
            (listData as { flags?: Record<string, unknown> })?.flags?.[TEST_MODE_FLAG_KEY],
          );
          setTestModeLocal(serverValue);
          setGlobalEnabled(serverValue);
        }
      } catch {
        /* soft-fail: keep current localStorage value */
      }

      // 2. Per-user checks only when signed in.
      if (!user) {
        setIsAdmin(false);
        setIsPersonalBetaTester(false);
        return;
      }
      try {
        const { data: meData } = await supabase.functions.invoke('admin-flags', {
          body: { action: 'whoami' },
        });
        setIsAdmin(Boolean((meData as { isAdmin?: boolean })?.isAdmin));
      } catch {
        setIsAdmin(false);
      }

      // 3. Personal beta tester unlock check — independent of global flag.
      try {
        const { data: btData } = await supabase.functions.invoke('admin-flags', {
          body: { action: 'is_beta_tester' },
        });
        setIsPersonalBetaTester(
          Boolean((btData as { isBetaTester?: boolean })?.isBetaTester),
        );
      } catch {
        setIsPersonalBetaTester(false);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);


  useEffect(() => {
    refresh();
  }, [refresh]);

  // Effective Test Mode: globally on OR this user has a personal unlock.
  const enabled = globalEnabled || isPersonalBetaTester;

  // Track beta tester sessions: when Test Mode is effectively ON and the
  // current user is signed in but NOT an admin, ping the server.
  useEffect(() => {
    if (loading) return;
    if (!enabled) return;
    if (!user) return;
    if (isAdmin) return;
    supabase.functions
      .invoke('admin-flags', { body: { action: 'record_session' } })
      .catch(() => {
        /* noop */
      });
  }, [enabled, isAdmin, loading, user]);



  const setEnabled = useCallback(
    async (value: boolean) => {
      setTestModeLocal(value);
      setGlobalEnabled(value);

      if (isAdmin) {
        try {
          await supabase.functions.invoke('admin-flags', {
            body: { action: 'set', key: TEST_MODE_FLAG_KEY, value },
          });
        } catch {
          /* ignore — local override still applies */
        }
      }
    },
    [isAdmin],
  );

  // Memoize the context value so consumers don't re-render unnecessarily
  // when an unrelated piece of state inside this provider changes.
  const value = useMemo<TestModeContextValue>(
    () => ({ enabled, isAdmin, isPersonalBetaTester, loading, setEnabled, refresh }),
    [enabled, isAdmin, isPersonalBetaTester, loading, setEnabled, refresh],
  );

  return <TestModeContext.Provider value={value}>{children}</TestModeContext.Provider>;
};

