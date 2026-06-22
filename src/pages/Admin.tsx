import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/sections/Footer';
import TestModeBanner from '@/components/TestModeBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  RefreshCw,
  Flag,
  Eye,
  ArrowLeft,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTestMode } from '@/contexts/TestModeContext';
import ModerationQueue from '@/components/admin/ModerationQueue';
import BetaFeedbackInbox from '@/components/admin/BetaFeedbackInbox';
import BetaTestersList from '@/components/admin/BetaTestersList';
import BetaInvitesCard from '@/components/admin/BetaInvitesCard';
import GenerationUsageCard from '@/components/admin/GenerationUsageCard';


const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const {
    enabled,
    isAdmin,
    loading: flagsLoading,
    setEnabled,
    refresh,
  } = useTestMode();

  const [busy, setBusy] = React.useState(false);

  const handleToggle = async (next: boolean) => {
    setBusy(true);
    try {
      await setEnabled(next);
      toast({
        title: next ? 'Test mode ENABLED' : 'Test mode disabled',
        description: next
          ? 'All paywalls and gated features are unlocked for everyone on this server.'
          : 'Normal paywall behavior restored.',
      });
    } catch (err) {
      toast({
        title: 'Failed to update flag',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLocalOnly = (next: boolean) => {
    setEnabled(next); // when not admin, this only updates localStorage
    toast({
      title: next ? 'Local test mode ON' : 'Local test mode OFF',
      description:
        'This change is only saved in your browser. Sign in as an admin to change it for everyone.',
    });
  };

  // ---- Auth gate UI states --------------------------------------------------
  const renderShell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TestModeBanner />
      <Header onNavigate={(id) => navigate(`/#${id}`)} onStart={() => navigate('/')} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">{children}</main>

      <Footer />
    </div>
  );

  if (authLoading || flagsLoading) {
    return renderShell(
      <div className="flex items-center justify-center py-32 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading admin panel…
      </div>,
    );
  }

  if (!user) {
    return renderShell(
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <Lock className="h-10 w-10 text-amber-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Admin sign-in required</h1>
        <p className="mt-2 text-slate-400">
          You need to be signed in with an admin email to access this page.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="mt-6 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to site
        </Button>
      </div>,
    );
  }

  if (!isAdmin) {
    return renderShell(
      <div className="space-y-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-slate-400 hover:text-amber-300 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </button>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8">
          <div className="flex items-center gap-3 text-rose-300">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-bold">Access denied</h1>
          </div>
          <p className="mt-3 text-slate-300">
            Your account (<span className="font-mono">{user.email}</span>) is not in the{' '}
            <span className="font-mono">ADMIN_EMAILS</span> allowlist, so you can&apos;t change
            server-wide flags.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            You can still toggle test mode for <strong>your own browser only</strong> below — it&apos;s
            stored in localStorage and won&apos;t affect anyone else.
          </p>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4 text-amber-300" /> Local test mode
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Unlock all paid features in your browser only.
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleLocalOnly}
              aria-label="Toggle local test mode"
            />
          </div>
        </div>
      </div>,
    );
  }

  // ---- Authorized admin view ------------------------------------------------
  return renderShell(
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-400 hover:text-amber-300 flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            Admin · Runtime Flags
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Signed in as <span className="font-mono text-slate-300">{user.email}</span>
            <Badge className="ml-2 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              ADMIN
            </Badge>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refresh()}
          className="border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Test mode card */}
      <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold uppercase tracking-wide">
              <Flag className="h-4 w-4" /> Feature flag
            </div>
            <h2 className="mt-1 text-xl font-bold">Test Mode · Unlock all paid features</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              When ON, every visitor (signed in or not) is treated as if they own the top-tier
              lifetime plan. The Academy unlocks all 16 modules, every paywall lifts, and the amber
              banner appears site-wide. Use this for QA passes only.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <Badge
                className={
                  enabled
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }
              >
                {enabled ? 'ENABLED' : 'DISABLED'}
              </Badge>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> Persisted in localStorage + admin_flags table
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <Switch
              checked={enabled}
              disabled={busy}
              onCheckedChange={handleToggle}
              aria-label="Toggle test mode"
              className="scale-125"
            />
            <span className="text-xs text-slate-500">
              {busy ? 'Saving…' : enabled ? 'Click to disable' : 'Click to enable'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscriptions admin entry */}
      <button
        type="button"
        onClick={() => navigate('/admin/subscriptions')}
        className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition p-6 flex items-center justify-between gap-4 group"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Subscriptions</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Browse every <span className="font-mono">user_subscriptions</span> row, search, and take admin actions (cancel, reactivate, comp).
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-300 transition" />
      </button>

      {/* AI generation usage & Replicate spend monitoring */}
      <GenerationUsageCard />

      {/* Beta invites — generate signup codes */}

      <BetaInvitesCard />

      {/* Active beta testers list */}
      <BetaTestersList />

      {/* Beta tester feedback inbox */}
      <BetaFeedbackInbox />



      {/* Live moderation queue (AI-classified media + user reports) */}
      <ModerationQueue />

      {/* Help */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400 space-y-2">
        <p className="text-slate-200 font-semibold">How this works</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Toggling here writes to the <span className="font-mono">admin_flags</span> table via the
            secure <span className="font-mono">admin-flags</span> edge function (service-role only).
          </li>
          <li>
            Every browser also caches the value in <span className="font-mono">localStorage</span>{' '}
            so QA sessions stick across reloads without a redeploy.
          </li>
          <li>
            Only emails in the <span className="font-mono">ADMIN_EMAILS</span> environment variable
            can flip the server flag. Everyone else gets a local-only override.
          </li>
          <li>
            Uploaded media is auto-classified by the <span className="font-mono">moderate-media</span>{' '}
            edge function (Replicate NSFW classifier). Anything over the threshold lands in the
            queue above for one-click approve / hide / ban.
          </li>
        </ul>
      </div>
    </div>,
  );
};

export default Admin;
