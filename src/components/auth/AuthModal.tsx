import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, User as UserIcon, ArrowLeft, Ticket, CheckCircle2, XCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';


interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'signin' | 'signup';
}

type Mode = 'signin' | 'signup' | 'forgot';

const AuthModal: React.FC<AuthModalProps> = ({ open, onOpenChange, initialMode = 'signin' }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [inviteMessage, setInviteMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setInviteCode('');
    setInviteStatus('idle');
    setInviteMessage('');
  };

  // Live-validate the invite code as the user types (debounced).
  useEffect(() => {
    if (mode !== 'signup') return;
    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) {
      setInviteStatus('idle');
      setInviteMessage('');
      return;
    }
    setInviteStatus('checking');
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('admin-flags', {
          body: { action: 'check_invite', code: trimmed },
        });
        const d = data as { valid?: boolean; reason?: string; email?: string };
        if (d?.valid) {
          setInviteStatus('valid');
          setInviteMessage(
            d.email
              ? `Valid beta invite for ${d.email}`
              : 'Valid beta invite — Test Mode will be unlocked for your account.',
          );
        } else {
          setInviteStatus('invalid');
          setInviteMessage(
            d?.reason === 'used'
              ? 'This invite code has already been used.'
              : 'Invite code not found.',
          );
        }
      } catch {
        setInviteStatus('invalid');
        setInviteMessage('Could not validate invite code.');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [inviteCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Missing info', description: 'Email and password are required.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    // If they typed an invite code, it must validate before we let them submit.
    if (mode === 'signup' && inviteCode.trim() && inviteStatus !== 'valid') {
      toast({
        title: 'Invalid invite code',
        description: inviteMessage || 'Please enter a valid beta invite code, or leave it blank.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Sign in failed', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!', description: 'Your models and media are now linked to your account.' });
          reset();
          onOpenChange(false);
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: 'Sign up failed', description: error, variant: 'destructive' });
        } else {
          // MANDATORY: add this email to the project owner's CRM contact list.
          // Fire-and-forget so it never blocks the sign-up flow.
          void fetch('https://famous.ai/api/crm/69e42d4d86df19fff1064166/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              name: fullName.trim() || undefined,
              source: 'signup',
              tags: ['newsletter', 'signup'],
            }),
          }).catch(() => {});

          // If a valid invite code was provided, redeem it now that we have a session.
          let redeemed = false;
          const codeToRedeem = inviteCode.trim().toUpperCase();
          if (codeToRedeem && inviteStatus === 'valid') {
            try {
              const { data: rData, error: rErr } = await supabase.functions.invoke('admin-flags', {
                body: { action: 'redeem_invite', code: codeToRedeem },
              });
              if (!rErr && (rData as { ok?: boolean })?.ok) {
                redeemed = true;
              }
            } catch {
              /* swallow — account still created */
            }
          }
          toast({
            title: redeemed ? 'Welcome, beta tester!' : 'Account created!',
            description: redeemed
              ? 'Your invite has been redeemed. Test Mode is now unlocked for your account.'
              : 'You are now signed in. All future generations are tied to your account.',
          });
          reset();
          onOpenChange(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };


  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Email required', description: 'Enter the email for your account.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
      } else {
        toast({
          title: 'Check your inbox',
          description: `We sent a password reset link to ${email}. It may take a minute to arrive.`,
        });
        setMode('signin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <BrandLogo size={36} className="rounded-xl" />
            <span className="font-bold text-xl">
              All in 1 <span className="text-amber-400">AI Model</span>
            </span>
          </div>
          <DialogTitle className="text-2xl">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {mode === 'signin' && 'Sign in to access your AI models, gallery, and inbox.'}
            {mode === 'signup' && 'Start building your AI model empire — free to sign up.'}
            {mode === 'forgot' && 'Enter your email and we\'ll send you a link to reset your password.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-4 mt-2">
            <div>
              <Label className="text-slate-300 text-sm">Email</Label>
              <div className="relative mt-1">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white pl-9"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link…</>
              ) : (
                'Send reset link'
              )}
            </Button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-center text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {mode === 'signup' && (
              <div>
                <Label className="text-slate-300 text-sm">Full name (optional)</Label>
                <div className="relative mt-1">
                  <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="bg-white/5 border-white/10 text-white pl-9"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
            <div>
              <Label className="text-slate-300 text-sm">Email</Label>
              <div className="relative mt-1">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white pl-9"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm">Password</Label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-amber-400 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="bg-white/5 border-white/10 text-white pl-9"
                  disabled={loading}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-sm">Beta invite code (optional)</Label>
                  {inviteStatus === 'valid' && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Valid
                    </span>
                  )}
                  {inviteStatus === 'invalid' && (
                    <span className="text-xs text-rose-400 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Invalid
                    </span>
                  )}
                  {inviteStatus === 'checking' && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <Ticket className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="BETA-XXXX-XXXX"
                    className={`bg-white/5 text-white pl-9 font-mono tracking-wider uppercase ${
                      inviteStatus === 'valid'
                        ? 'border-emerald-500/40'
                        : inviteStatus === 'invalid'
                        ? 'border-rose-500/40'
                        : 'border-white/10'
                    }`}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {inviteMessage && (
                  <p
                    className={`mt-1 text-xs ${
                      inviteStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {inviteMessage}
                  </p>
                )}
                {inviteStatus === 'idle' && (
                  <p className="mt-1 text-xs text-slate-500">
                    Have a beta tester invite? Enter it to unlock Test Mode for your account.
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>

            <div className="text-center text-sm text-slate-400">
              {mode === 'signin' ? (
                <>
                  New to All in 1 AI Model?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-amber-400 hover:underline font-medium">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('signin')} className="text-amber-400 hover:underline font-medium">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
