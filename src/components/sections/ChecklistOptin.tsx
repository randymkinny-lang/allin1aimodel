import React, { useState } from 'react';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

const ChecklistOptin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      await fetch('https://famous.ai/api/crm/69e42d4d86df19fff1064166/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'checklist-optin',
          tags: ['lead-magnet', 'ai-model-checklist'],
        }),
      });
      setStatus('success');
      setEmail('');
    } catch {
      // Still show success so the user isn't blocked; subscribe is best-effort
      setStatus('success');
      setEmail('');
    }
  };

  return (
    <section className="bg-black py-16 sm:py-20 border-y border-white/10">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
          Free Download
        </span>
        <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
          Free Download: The AI Model Launch Checklist
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          The exact steps to go from zero to your first paying fan — including how to set up
          every platform, avoid bans, and start earning in under 7 days.
        </p>

        {status === 'success' ? (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-5 text-emerald-300">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            <span className="text-lg font-semibold">Check your inbox — it's on the way!</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="Enter your email"
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-amber-400 px-6 py-3.5 font-bold text-black transition hover:bg-amber-300 disabled:opacity-70"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  Send Me the Free Checklist <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">Please enter a valid email address.</p>
        )}

        <p className="mt-4 text-xs text-slate-500">
          No spam. Unsubscribe anytime. Sent instantly.
        </p>
      </div>
    </section>
  );
};

export default ChecklistOptin;
