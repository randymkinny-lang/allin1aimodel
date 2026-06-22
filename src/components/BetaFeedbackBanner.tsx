import React, { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useTestMode } from '@/contexts/TestModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const DISMISS_KEY = 'lumina:beta-feedback-banner-dismissed';

const BetaFeedbackBanner: React.FC = () => {
  const { enabled, isAdmin, loading } = useTestMode();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Only show for: test mode ON, not loading, not an admin.
  if (loading || !enabled || isAdmin || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: 'Please enter a message',
        description: 'Tell us what you saw, what you expected, or what broke.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('beta_feedback').insert({
        email: email.trim() || null,
        message: message.trim(),
        user_id: user?.id ?? null,
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
        page_url:
          typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
      });
      if (error) throw error;

      // Also subscribe their email to the CRM so the operator can follow up.
      if (email.trim()) {
        try {
          await fetch(
            'https://famous.ai/api/crm/69e42d4d86df19fff1064166/subscribe',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email.trim(),
                source: 'beta-feedback',
                tags: ['beta-tester', 'feedback'],
              }),
            },
          );
        } catch {
          /* non-fatal */
        }
      }

      setSubmitted(true);
      setMessage('');
      toast({
        title: 'Feedback sent — thank you!',
        description: 'Your report was logged. The team will review it shortly.',
      });
    } catch (err) {
      toast({
        title: 'Could not send feedback',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset the success state shortly after close so the form is fresh next time.
    setTimeout(() => setSubmitted(false), 300);
  };

  return (
    <>
      <div className="sticky top-0 z-[55] w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-xs sm:text-sm">
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="flex-1 leading-tight">
            <span className="font-semibold">Beta Test Mode</span> — all paid
            features are unlocked for testing. Found a bug or have feedback?
          </span>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="h-7 bg-white text-indigo-700 hover:bg-white/90 font-semibold px-3"
          >
            Send Feedback
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-white/15 transition"
            aria-label="Dismiss beta feedback banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              Send beta feedback
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Help us improve the app — describe what you tried, what happened,
              and what you expected.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-semibold">Thanks for the report!</h3>
              <p className="text-sm text-slate-400">
                Your feedback has been logged for the team. Feel free to send
                more anytime.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  className="border-white/15 text-slate-200 hover:bg-white/5"
                  onClick={() => setSubmitted(false)}
                >
                  Send another
                </Button>
                <Button
                  className="bg-indigo-500 hover:bg-indigo-600"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  Your email (optional, so we can follow up)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">
                  What happened? <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  required
                  placeholder="e.g. When I clicked 'Generate Image' on the Studio tab, the page froze for 30s and then showed an error toast saying 'fetch failed'. I expected an image to appear."
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  We&apos;ll also include your browser + the page URL automatically.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="border-white/15 text-slate-200 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BetaFeedbackBanner;
