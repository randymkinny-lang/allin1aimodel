import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Coins,
  ExternalLink,
  Gift,
  Loader2,
  Lock,
  RefreshCcw,
  Rocket,
  Send,
  Shield,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';


interface PayoutAccount {
  user_id: string;
  famouspay_account_id: string | null;
  account_status: 'pending' | 'onboarding' | 'active' | 'restricted' | 'disabled';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string | null;
  default_currency: string | null;
  lifetime_earnings_cents: number;
  pending_balance_cents: number;
  available_balance_cents: number;
  next_payout_date: string | null;
  last_synced_at: string | null;
}

// Match edge function — keep in sync with famouspay-connect.
const TIER_FEE: Record<string, { pct: number; label: string }> = {
  free: { pct: 20, label: 'Free' },
  starter: { pct: 10, label: 'Starter' },
  creator: { pct: 8, label: 'Creator' },
  pro: { pct: 5, label: 'Pro' },
  business: { pct: 5, label: 'Business' },
  professional: { pct: 5, label: 'Professional' },
  agency: { pct: 0, label: 'Agency' },
  course_partner: { pct: 0, label: 'Course Partner' },
  enterprise: { pct: 0, label: 'Enterprise' },
  lifetime: { pct: 0, label: 'Lifetime' },
};

const fmtUsd = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const PayoutsTab: React.FC = () => {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null); // 'create' | 'continue' | 'refresh' | 'dashboard' | 'disconnect' | 'payout'
  const [error, setError] = useState<string | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutsRefreshKey, setPayoutsRefreshKey] = useState(0);

  const feeInfo = TIER_FEE[tier.id] ?? TIER_FEE.free;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('creator_payout_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setAccount((data as PayoutAccount | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // If we returned from FamousPay onboarding with ?status=complete, pull fresh data.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'complete' || status === 'refresh') {
      handleRefresh(true);
      // Clean the URL
      params.delete('status');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '');
      window.history.replaceState({}, '', url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use the new dedicated edge function — single call creates account + returns onboarding URL.
  const handleStartOnboarding = async () => {
    if (!user) return;
    setWorking('create');
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-famouspay-connect-account', {
        body: {
          email: user.email,
          returnUrl: `${window.location.origin}/settings/profile?tab=payouts&status=complete`,
          refreshUrl: `${window.location.origin}/settings/profile?tab=payouts&status=refresh`,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      await load();
      const url = data?.onboardingUrl || data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error('No onboarding URL returned');
    } catch (err) {
      setError((err as Error).message);
      toast({ title: 'Could not start onboarding', description: (err as Error).message, variant: 'destructive' });
      setWorking(null);
    }
  };

  // Resume onboarding via the legacy famouspay-connect function (which already
  // handles the "account exists, just need a fresh link" case).
  const handleContinueOnboarding = async () => {
    setWorking('continue');
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-famouspay-connect-account', {
        body: {
          returnUrl: `${window.location.origin}/settings/profile?tab=payouts&status=complete`,
          refreshUrl: `${window.location.origin}/settings/profile?tab=payouts&status=refresh`,
        },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      const url = data?.onboardingUrl || data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error('No onboarding URL returned');
    } catch (err) {
      setError((err as Error).message);
      toast({ title: 'Onboarding link failed', description: (err as Error).message, variant: 'destructive' });
      setWorking(null);
    }
  };

  const handleRefresh = async (silent = false) => {
    setWorking('refresh');
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('famouspay-connect', {
        body: { action: 'refresh-account' },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      await load();
      setPayoutsRefreshKey((k) => k + 1);
      if (!silent) toast({ title: 'Account synced', description: 'Latest balance pulled from FamousPay.' });
    } catch (err) {
      setError((err as Error).message);
      if (!silent) toast({ title: 'Sync failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const handleOpenDashboard = async () => {
    setWorking('dashboard');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('famouspay-connect', {
        body: { action: 'create-login-link' },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      if (data.url) window.open(data.url, '_blank', 'noopener');
    } catch (err) {
      toast({ title: 'Could not open dashboard', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect FamousPay? Your payout account record will be removed — you can reconnect anytime.')) return;
    setWorking('disconnect');
    try {
      const { error: fnErr } = await supabase.functions.invoke('famouspay-connect', {
        body: { action: 'disconnect' },
      });
      if (fnErr) throw new Error(fnErr.message);
      setAccount(null);
      toast({ title: 'FamousPay disconnected' });
    } catch (err) {
      toast({ title: 'Disconnect failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const handleRequestPayout = async (amountCents: number | null, method: 'standard' | 'instant') => {
    setWorking('payout');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('request-payout', {
        body: { action: 'request', amountCents: amountCents ?? undefined, method },
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message);
      toast({
        title: 'Payout requested',
        description: `${fmtUsd(data.payout?.amount_cents ?? 0)} is on its way to your bank.`,
      });
      setPayoutDialogOpen(false);
      await load();
      setPayoutsRefreshKey((k) => k + 1);
    } catch (err) {
      toast({ title: 'Payout failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setWorking(null);
    }
  };

  const statusBadge = useMemo(() => {
    if (!account) return null;
    if (account.charges_enabled && account.payouts_enabled) {
      return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"><BadgeCheck className="h-3 w-3 mr-1" /> Active</Badge>;
    }
    if (account.details_submitted) {
      return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30"><Shield className="h-3 w-3 mr-1" /> Under review</Badge>;
    }
    return <Badge className="bg-slate-500/20 text-slate-300 border border-slate-400/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Onboarding</Badge>;
  }, [account]);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 animate-pulse h-64" />;
  }

  // Not connected yet — show onboarding hero
  if (!account?.famouspay_account_id) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-blue-500/10 p-8">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center shrink-0">
              <Banknote className="h-7 w-7 text-slate-950" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-2xl font-bold text-white">Connect FamousPay to get paid</h2>
              <p className="text-slate-300 mt-2 max-w-xl">
                FamousPay is powered by Stripe Connect Express. Subscription revenue, tips, and PPV unlocks from your
                fans flow straight to your bank — we only keep a small platform fee based on your plan.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={handleStartOnboarding}
                  disabled={working !== null}
                  className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90"
                >
                  {working === 'create' || working === 'continue' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting onboarding…</>
                  ) : (
                    <><Rocket className="h-4 w-4 mr-2" /> Start FamousPay onboarding</>
                  )}
                </Button>
                <a
                  href="https://stripe.com/connect/express"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-slate-300 hover:text-white"
                >
                  Learn how payouts work <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {error && (
                <div className="mt-4 flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <FeeCard tierId={tier.id} tierName={tier.name} feePct={feeInfo.pct} />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Bank-grade KYC', body: 'Stripe handles identity verification and compliance so you stay focused on content.' },
            { icon: Wallet, title: 'Daily payouts', body: 'Available balance is auto-deposited to your bank account on a rolling schedule.' },
            { icon: TrendingUp, title: 'Tier-based fees', body: 'Higher plans pay lower platform fees — upgrade to keep more of every dollar.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <f.icon className="h-5 w-5 text-amber-400 mb-2" />
              <div className="font-semibold text-white">{f.title}</div>
              <p className="text-sm text-slate-400 mt-1">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // Connected — show dashboard
  const needsAction = !account.charges_enabled || !account.payouts_enabled;
  const canPayout = account.payouts_enabled && (account.available_balance_cents ?? 0) >= 100;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">FamousPay account</h2>
              {statusBadge}
            </div>
            <p className="text-sm text-slate-400 mt-1 font-mono">{account.famouspay_account_id}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {account.country || 'US'} · {(account.default_currency || 'usd').toUpperCase()}
              {account.last_synced_at && ` · Synced ${new Date(account.last_synced_at).toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleRefresh(false)}
              disabled={working !== null}
              className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
            >
              {working === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCcw className="h-4 w-4 mr-1.5" />}
              Sync
            </Button>
            <Button
              onClick={() => setPayoutDialogOpen(true)}
              disabled={working !== null || !canPayout}
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50"
              title={!canPayout ? 'Need at least $1.00 available to request a payout' : 'Request a payout to your bank'}
            >
              {working === 'payout' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              Request payout
            </Button>
            <Button
              onClick={handleOpenDashboard}
              disabled={working !== null}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90"
            >
              {working === 'dashboard' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ArrowUpRight className="h-4 w-4 mr-1.5" />}
              Open dashboard
            </Button>
          </div>
        </div>

        {needsAction && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <AlertCircle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-white">Finish onboarding to start receiving payouts</div>
              <p className="text-sm text-slate-300 mt-0.5">
                FamousPay still needs a few details before we can route fan payments to your bank.
              </p>
            </div>
            <Button
              onClick={() => handleContinueOnboarding()}
              disabled={working !== null}
              className="bg-white text-slate-950 hover:bg-slate-100"
            >
              {working === 'continue' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </Button>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Lifetime earnings"
          value={fmtUsd(account.lifetime_earnings_cents)}
          hint="Net after platform fee"
        />
        <StatCard
          icon={Wallet}
          label="Available now"
          value={fmtUsd(account.available_balance_cents)}
          hint={`${fmtUsd(account.pending_balance_cents)} still pending`}
          accent
        />
        <StatCard
          icon={CalendarClock}
          label="Next auto-payout"
          value={fmtDate(account.next_payout_date)}
          hint="Daily Stripe rolling schedule"
        />
      </section>

      <FeeCard tierId={tier.id} tierName={tier.name} feePct={feeInfo.pct} />

      <PayoutHistory
        userId={user!.id}
        refreshKey={payoutsRefreshKey}
        accountConnected={!!account.famouspay_account_id}
      />

      <EarningsHistory userId={user!.id} />


      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleDisconnect}
          disabled={working !== null}
          className="bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-rose-300"
        >
          Disconnect FamousPay
        </Button>
      </div>

      <RequestPayoutDialog
        open={payoutDialogOpen}
        onClose={() => setPayoutDialogOpen(false)}
        availableCents={account.available_balance_cents ?? 0}
        currency={(account.default_currency || 'usd').toUpperCase()}
        onConfirm={handleRequestPayout}
        working={working === 'payout'}
      />
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}> = ({ icon: Icon, label, value, hint, accent }) => (
  <div className={`p-5 rounded-2xl border ${accent ? 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent' : 'border-white/10 bg-white/5'}`}>
    <Icon className={`h-5 w-5 mb-2 ${accent ? 'text-amber-400' : 'text-slate-300'}`} />
    <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
    <div className="text-2xl font-bold text-white mt-1">{value}</div>
    {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
  </div>
);

const FeeCard: React.FC<{ tierId: string; tierName: string; feePct: number }> = ({ tierId, tierName, feePct }) => {
  const tiers: [string, string, number][] = [
    ['free', 'Free', 20],
    ['starter', 'Starter', 10],
    ['pro', 'Pro', 5],
    ['agency', 'Agency', 0],
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h3 className="font-semibold text-white">Your platform fee</h3>
          <p className="text-sm text-slate-400">Based on your current <span className="text-amber-300">{tierName}</span> plan</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{feePct}%</div>
          <div className="text-xs text-slate-500">per transaction</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {tiers.map(([id, label, pct]) => {
          const active = tierId === id;
          return (
            <div
              key={id}
              className={`rounded-lg border p-3 text-center ${active ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10 bg-slate-950/40'}`}
            >
              <div className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</div>
              <div className={`text-lg font-bold ${active ? 'text-amber-300' : 'text-white'}`}>{pct}%</div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Upgrade your plan to lower your fee. All fees are taken from gross before funds hit your FamousPay balance.
      </p>
    </section>
  );
};

// ====================================================================
// Real payout history — pulled from creator_payouts (synced via webhook
// + request-payout list action).
// ====================================================================
interface PayoutRow {
  id: string;
  famouspay_payout_id: string | null;
  amount_cents: number;
  currency: string | null;
  status: string;
  arrival_date: string | null;
  method: string | null;
  initiated_by: string | null;
  failure_code: string | null;
  failure_message: string | null;
  description: string | null;
  created_at: string;
}

const payoutStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
    case 'in_transit':
      return <Badge className="bg-blue-500/15 text-blue-300 border border-blue-400/30"><Send className="h-3 w-3 mr-1" />In transit</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/15 text-amber-300 border border-amber-400/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pending</Badge>;
    case 'failed':
      return <Badge className="bg-rose-500/15 text-rose-300 border border-rose-400/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case 'canceled':
      return <Badge className="bg-slate-500/20 text-slate-300 border border-slate-400/30">Canceled</Badge>;
    default:
      return <Badge className="bg-slate-500/15 text-slate-300 border border-slate-400/30">{status}</Badge>;
  }
};

const PayoutHistory: React.FC<{ userId: string; refreshKey: number; accountConnected: boolean }> = ({
  userId,
  refreshKey,
  accountConnected,
}) => {
  const [rows, setRows] = useState<PayoutRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchLocal = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('creator_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25);
    setRows((data as PayoutRow[]) ?? []);
    setLoading(false);
  }, [userId]);

  // Pull-and-reconcile from FamousPay
  const syncRemote = useCallback(async () => {
    if (!accountConnected) return;
    setSyncing(true);
    try {
      await supabase.functions.invoke('request-payout', { body: { action: 'list' } });
    } catch {
      // Soft-fail — local rows are still authoritative for the UI.
    } finally {
      setSyncing(false);
      fetchLocal();
    }
  }, [accountConnected, fetchLocal]);

  useEffect(() => {
    fetchLocal();
  }, [fetchLocal, refreshKey]);

  useEffect(() => {
    // Initial remote sync once on mount, so the table reflects FamousPay's own list.
    if (accountConnected) syncRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountConnected]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Banknote className="h-4 w-4 text-amber-300" />
            Payout history
          </h3>
          <p className="text-sm text-slate-400">
            Real payouts from FamousPay to your bank account. Status updates arrive via webhook.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={syncRemote}
          disabled={syncing || loading}
          className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCcw className="h-4 w-4 mr-1.5" />}
          Sync from FamousPay
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
          <Send className="h-8 w-8 text-slate-500 mx-auto mb-2" />
          <div className="text-white font-semibold">No payouts yet</div>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Once you request a payout (or FamousPay's daily auto-payout fires), it will show up here with live status.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
                <th className="py-2 px-3 font-medium">Initiated</th>
                <th className="py-2 px-3 font-medium">Arrival</th>
                <th className="py-2 px-3 font-medium">Method</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    <div>{fmtDate(r.created_at)}</div>
                    <div className="text-[11px] text-slate-500">
                      {r.initiated_by === 'manual' ? 'Manual' : 'Auto'}
                      {r.famouspay_payout_id && ` · ${r.famouspay_payout_id.slice(0, 14)}…`}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    {r.arrival_date ? fmtDate(r.arrival_date) : '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-400 capitalize">{r.method || 'standard'}</td>
                  <td className="py-3 px-3">
                    <div>{payoutStatusBadge(r.status)}</div>
                    {r.failure_message && (
                      <div className="text-[11px] text-rose-300 mt-1 max-w-[220px] truncate" title={r.failure_message}>
                        {r.failure_code ? `${r.failure_code}: ` : ''}{r.failure_message}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-white font-semibold tabular-nums">
                    {fmtUsd(r.amount_cents)}
                    <div className="text-[11px] text-slate-500 font-normal">
                      {(r.currency || 'usd').toUpperCase()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

// ====================================================================
// Earnings history (per-transaction ledger of fan payments).
// Renamed from the original "Payout history" — the actual payouts now
// live in the dedicated PayoutHistory component above.
// ====================================================================
interface EarningRow {
  id: string;
  kind: string | null;
  status: string | null;
  gross_amount_cents: number | null;
  platform_fee_cents: number | null;
  net_amount_cents: number | null;
  currency: string | null;
  created_at: string;
  fan_email: string | null;
}

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  subscription: { label: 'Subscription', icon: TrendingUp, tint: 'text-emerald-300' },
  tip:          { label: 'Tip',          icon: Gift,        tint: 'text-amber-300' },
  ppv:          { label: 'PPV unlock',   icon: Lock,        tint: 'text-purple-300' },
  payout:       { label: 'Payout',       icon: Banknote,    tint: 'text-blue-300' },
};

const earningStatusBadge = (status: string | null) => {
  switch (status) {
    case 'succeeded':
    case 'paid':
      return <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/15 text-amber-300 border border-amber-400/30">Pending</Badge>;
    case 'refunded':
      return <Badge className="bg-slate-500/20 text-slate-300 border border-slate-400/30">Refunded</Badge>;
    case 'failed':
      return <Badge className="bg-rose-500/15 text-rose-300 border border-rose-400/30">Failed</Badge>;
    default:
      return <Badge className="bg-slate-500/15 text-slate-300 border border-slate-400/30">{status || 'Unknown'}</Badge>;
  }
};

const EarningsHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [rows, setRows] = useState<EarningRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'subscription' | 'tip' | 'ppv'>('all');
  const [limit, setLimit] = useState(10);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('creator_earnings')
      .select('id, kind, status, gross_amount_cents, platform_fee_cents, net_amount_cents, currency, created_at, fan_email')
      .eq('creator_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setRows([]);
    } else {
      setRows((data as EarningRow[]) ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === 'all') return rows;
    return rows.filter((r) => (r.kind || '').toLowerCase() === filter);
  }, [rows, filter]);

  const summary = useMemo(() => {
    const base = rows ?? [];
    const succeeded = base.filter((r) => r.status === 'succeeded' || r.status === 'paid');
    const grossNet = succeeded.reduce((acc, r) => acc + (r.net_amount_cents ?? r.gross_amount_cents ?? 0), 0);
    const last30 = succeeded
      .filter((r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000)
      .reduce((acc, r) => acc + (r.net_amount_cents ?? r.gross_amount_cents ?? 0), 0);
    return { totalNet: grossNet, last30Net: last30, txCount: succeeded.length };
  }, [rows]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const header = ['date', 'type', 'status', 'gross', 'fee', 'net', 'currency', 'id'];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.kind || '',
      r.status || '',
      ((r.gross_amount_cents ?? 0) / 100).toFixed(2),
      ((r.platform_fee_cents ?? 0) / 100).toFixed(2),
      ((r.net_amount_cents ?? r.gross_amount_cents ?? 0) / 100).toFixed(2),
      (r.currency || 'usd').toUpperCase(),
      r.id,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `famouspay-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS: Array<{ id: typeof filter; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'all',          label: 'All',          icon: Coins },
    { id: 'subscription', label: 'Subscriptions', icon: TrendingUp },
    { id: 'tip',          label: 'Tips',         icon: Gift },
    { id: 'ppv',          label: 'PPV',          icon: Lock },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-300" />
            Earnings ledger
          </h3>
          <p className="text-sm text-slate-400">
            {summary.txCount.toLocaleString()} settled transactions ·{' '}
            <span className="text-emerald-300">{fmtUsd(summary.totalNet)}</span> net lifetime ·{' '}
            <span className="text-amber-300">{fmtUsd(summary.last30Net)}</span> last 30 days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchRows}
            disabled={loading}
            className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCcw className="h-4 w-4 mr-1.5" />}
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={!filtered.length}
            className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const FIcon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setLimit(10); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                active
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <FIcon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
          <Coins className="h-8 w-8 text-slate-500 mx-auto mb-2" />
          <div className="text-white font-semibold">No earnings yet</div>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Once a fan subscribes, tips, or unlocks PPV content, the transaction will appear here in real time.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2 px-3 font-medium">Date</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium text-right">Gross</th>
                  <th className="py-2 px-3 font-medium text-right">Fee</th>
                  <th className="py-2 px-3 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, limit).map((r) => {
                  const meta = KIND_META[(r.kind || '').toLowerCase()] || { label: r.kind || 'Other', icon: Coins, tint: 'text-slate-300' };
                  const KIcon = meta.icon;
                  const net = r.net_amount_cents ?? r.gross_amount_cents ?? 0;
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <div>{fmtDate(r.created_at)}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center ${meta.tint}`}>
                            <KIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{meta.label}</div>
                            {r.fan_email && <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{r.fan_email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">{earningStatusBadge(r.status)}</td>
                      <td className="py-3 px-3 text-right text-slate-200 tabular-nums">
                        {fmtUsd(r.gross_amount_cents ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                        −{fmtUsd(r.platform_fee_cents ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-semibold tabular-nums">
                        {fmtUsd(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > limit && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setLimit((l) => l + 10)}
                className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
              >
                Show more ({filtered.length - limit} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

// ====================================================================
// Request Payout dialog
// ====================================================================
const RequestPayoutDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  availableCents: number;
  currency: string;
  working: boolean;
  onConfirm: (amountCents: number | null, method: 'standard' | 'instant') => void;
}> = ({ open, onClose, availableCents, currency, working, onConfirm }) => {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<'standard' | 'instant'>('standard');

  useEffect(() => {
    if (open) {
      setAmountStr((availableCents / 100).toFixed(2));
      setMethod('standard');
    }
  }, [open, availableCents]);

  const parsedCents = useMemo(() => {
    const n = Number(amountStr);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [amountStr]);

  const overLimit = parsedCents > availableCents;
  const tooSmall = parsedCents < 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Send className="h-4 w-4 text-emerald-400" />
            Request a payout
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Move money from your FamousPay balance to your linked bank account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase tracking-wider text-emerald-200/80">Available balance</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{fmtUsd(availableCents)} <span className="text-sm text-emerald-200/60 font-normal">{currency}</span></div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Amount</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={(availableCents / 100).toString()}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-7 bg-white/5 border-white/10 text-white"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setAmountStr((availableCents / 100).toFixed(2))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-300 hover:text-amber-200 px-2 py-0.5 rounded bg-amber-400/10"
              >
                Max
              </button>
            </div>
            {overLimit && <p className="text-xs text-rose-300 mt-1">Amount exceeds available balance</p>}
            {tooSmall && amountStr && <p className="text-xs text-amber-300 mt-1">Minimum payout is $1.00</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200">Speed</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['standard', 'instant'] as const).map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border p-3 text-left transition ${
                      active
                        ? 'border-amber-400/50 bg-amber-400/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${active ? 'text-amber-200' : 'text-white'}`}>
                      {m === 'standard' ? 'Standard' : 'Instant'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {m === 'standard' ? '1–3 business days · free' : 'In minutes · 1.5% fee'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={working}
            className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(parsedCents === availableCents ? null : parsedCents, method)}
            disabled={working || overLimit || tooSmall}
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-semibold hover:opacity-90"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Send {fmtUsd(parsedCents)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutsTab;
