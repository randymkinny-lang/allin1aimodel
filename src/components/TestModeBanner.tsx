import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useTestMode } from '@/contexts/TestModeContext';

/**
 * Visible-only-when-test-mode-is-on banner so QA always knows the paywall is off.
 * Reads from the runtime TestModeContext (admin-flippable, persisted in localStorage).
 */
const TestModeBanner: React.FC = () => {
  const { enabled } = useTestMode();
  const [dismissed, setDismissed] = useState(false);
  if (!enabled || dismissed) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-xs sm:text-sm font-semibold">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">
          TEST MODE — all paid features, plans, and Academy chapters are temporarily unlocked for testing.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/10 transition"
          aria-label="Dismiss test mode banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TestModeBanner;
