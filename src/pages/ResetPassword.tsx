import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { toast } from '@/components/ui/use-toast';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse recovery token from URL (hash fragment or query params) and
  // establish a session so updateUser() can change the password.
  useEffect(() => {
    const run = async () => {
      try {
        // Supabase typically returns tokens in the URL hash:
        // #access_token=...&refresh_token=...&type=recovery
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const access_token = hashParams.get('access_token') || queryParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const token_hash = hashParams.get('token_hash') || queryParams.get('token_hash');
        const code = queryParams.get('code');
        const errorDescription =
          hashParams.get('error_description') || queryParams.get('error_description');

        if (errorDescription) {
          setErrorMsg(decodeURIComponent(errorDescription));
          return;
        }

        // Newer PKCE flow: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            return;
          }
          setReady(true);
          return;
        }

        // Legacy / implicit flow: #access_token=...&refresh_token=...
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setErrorMsg(error.message);
            return;
          }
          setReady(true);
          return;
        }

        // OTP-style recovery: ?token_hash=...&type=recovery
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type: type as 'recovery',
            token_hash,
          });
          if (error) {
            setErrorMsg(error.message);
            return;
          }
          setReady(true);
          return;
        }

        // Maybe the user is already in a recovery session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          return;
        }

        setErrorMsg(
          'Invalid or expired reset link. Please request a new password reset email.'
        );
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to process reset link.');
      }
    };
    run();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Passwords don't match",
        description: 'Make sure both fields are identical.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully. Welcome back!',
      });
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/80 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 mb-6">
          <BrandLogo size={40} className="rounded-xl" />
          <span className="font-bold text-xl">
            All in 1 <span className="text-amber-400">AI Model</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
        <p className="text-slate-400 text-sm mb-6">
          Choose a strong password for your account. You'll be signed in automatically.
        </p>

        {errorMsg ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
            >
              Back to home
            </Button>
          </div>
        ) : !ready ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Verifying reset link…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm">New password</Label>
              <div className="relative mt-1">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="bg-white/5 border-white/10 text-white pl-9"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Confirm new password</Label>
              <div className="relative mt-1">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="bg-white/5 border-white/10 text-white pl-9"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating password…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Update password</>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
