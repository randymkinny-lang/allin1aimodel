/**
 * TEST MODE — runtime admin-controlled flag.
 *
 * Replaces the old hardcoded `TEST_MODE_UNLOCK_ALL` boolean. The current
 * value is held in localStorage so QA sessions stick across reloads, and is
 * mirrored to the `admin_flags` table via the `admin-flags` edge function so
 * it can be flipped at runtime by an admin without a redeploy.
 *
 * Components should prefer the reactive `useTestMode()` hook from
 * `@/contexts/TestModeContext`. The functions exported here are the
 * synchronous source of truth used at module load (e.g. `useState`
 * initializers) before the provider mounts.
 */

export const TEST_MODE_LS_KEY = 'lumina_test_mode_unlock_all';
export const TEST_MODE_FLAG_KEY = 'test_mode_unlock_all';

/** Synchronously read the persisted test-mode value from localStorage. */
export function isTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TEST_MODE_LS_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist the test-mode value locally. Does NOT hit the server. */
export function setTestModeLocal(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEST_MODE_LS_KEY, value ? 'true' : 'false');
    // Notify listeners in this tab (storage event only fires across tabs).
    window.dispatchEvent(new CustomEvent('lumina:test-mode-change', { detail: value }));
  } catch {
    /* ignore */
  }
}
