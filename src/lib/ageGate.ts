// Age verification state management (localStorage-backed)

const KEY = 'aii:age-verified';
const TS_KEY = 'aii:age-verified-at';

export function isAgeVerified(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setAgeVerified(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(KEY, '1');
      window.localStorage.setItem(TS_KEY, new Date().toISOString());
    } else {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(TS_KEY);
    }
    window.dispatchEvent(new CustomEvent('aii:age-verified-changed'));
  } catch {
    // ignore storage errors
  }
}

export function clearAgeVerification() {
  setAgeVerified(false);
}

export function getVerifiedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TS_KEY);
  } catch {
    return null;
  }
}
