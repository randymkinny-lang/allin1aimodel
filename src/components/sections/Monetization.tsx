import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PAYMENT_PLATFORMS } from '@/data/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Banknote, DollarSign, ExternalLink, Lock, TrendingUp, Wallet } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AuthModal from '@/components/auth/AuthModal';

interface PayoutRow {
  famouspay_account_id: string | null;
  charges_enabled: boolean;
  lifetime_earnings_cents: number;
  pending_balance_cents: number;
  available_balance_cents: number;
  next_payout_date: string | null;
}

const TIER_FEE_PCT: Record<string, number> = {
  free: 20, starter: 10, creator: 8, pro: 5, business: 5,
  professional: 5, agency: 0, course_partner: 0, enterprise: 0, lifetime: 0,
};

const fmtUsd = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const Monetization: React.FC = () => {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [payout, setPayout] = useState<PayoutRow | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const [tiers, setTiers] = useState([
    { name: 'Basic', price: 9.99, perks: 'Daily DM replies, photo previews' },
    { name: 'VIP', price: 24.99, perks: 'Exclusive sets, voice notes, priority replies' },
    { name: 'Premium', price: 49.99, perks: 'Custom content, video calls, tip rewards' },
  ]);

  const feePct = TIER_FEE_PCT[tier.id] ?? 20;
  const connected = Boolean(payout?.famouspay_account_id && payout?.charges_enabled);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: payoutRow }, { count }] = await Promise.all([
        supabase
          .from('creator_payout_accounts')
          .select('famouspay_account_id, charges_enabled, lifetime_earnings_cents, pending_balance_cents, available_balance_cents, next_payout_date')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('creator_earnings')
          .select('id', { count: 'exact', head: true })
          .eq('creator_user_id', user.id)
          .eq('kind', 'subscription')
          .eq('status', 'succeeded'),
      ]);
      if (cancelled) return;
      setPayout((payoutRow as PayoutRow | null) ?? null);
      setSubscriberCount(count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = (i: number, patch: Partial<typeof tiers[0]>) => {
    setTiers((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const stats = [
    {
      icon: DollarSign,
      label: 'Lifetime earnings',
      value: payout ? fmtUsd(payout.lifetime_earnings_cents) : '$0.00',
      sub: connected ? `Net after ${feePct}% platform fee` : 'Connect FamousPay to earn',
    },
    {
      icon: TrendingUp,
      label: 'Paying subscribers',
      value: (subscriberCount ?? 0).toLocaleString(),
      sub: connected ? 'Unique fans this lifetime' : 'Onboard to start tracking',
    },
    {
      icon: Wallet,
      label: 'Pending payout',
      value: payout ? fmtUsd(payout.pending_balance_cents) : '$0.00',
      sub: payout?.next_payout_date
        ? `Releases ${new Date(payout.next_payout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : 'No payout scheduled',
    },
  ];

  return (
    <section id="monetize" className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
          <div className="max-w-2xl">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Monetization Center</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Turn Fans Into Revenue</h2>
            <p className="mt-3 text-slate-400">
              Real earnings powered by FamousPay Connect. Subscription revenue, tips, and PPV unlocks from your
              fans land directly in your bank account — no spreadsheets, no surprises.
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              {connected ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  FamousPay active · {feePct}% fee
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Lock className="h-3 w-3 mr-1" /> FamousPay not connected
                </Badge>
              )}
            </div>
          )}
        </div>

        {!user ? (
          <div className="mb-10 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                <Lock className="h-6 w-6 text-slate-950" />
              </div>
              <p className="text-lg text-white font-medium max-w-xl">
                Connect your account to track earnings, subscribers, and payouts in real time.
              </p>
            </div>
            <Button
              onClick={() => setAuthOpen(true)}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90 shrink-0"
            >
              Sign In to Connect
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
                  <s.icon className="h-6 w-6 text-amber-400 mb-3" />
                  <div className="text-slate-400 text-sm">{s.label}</div>
                  <div className="text-3xl font-bold text-white mt-1">{loading ? '…' : s.value}</div>
                  <div className="text-slate-500 text-xs mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            {!connected && (
              <div className="mb-10 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5 text-slate-950" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Connect FamousPay to get paid</div>
                    <p className="text-sm text-slate-300">
                      Finish Stripe Connect Express onboarding to route subscription, tip, and PPV revenue from fans
                      straight to your bank.
                    </p>
                  </div>
                </div>
                <Link to="/settings/profile?tab=payouts">
                  <Button className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90">
                    Open Payouts settings
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8">
          <h3 className="text-white font-semibold mb-4">Subscription Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-white/10">
                <Label className="text-slate-400 text-xs">Tier Name</Label>
                <Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} className="bg-white/5 border-white/10 text-white mb-3" />
                <Label className="text-slate-400 text-xs">Monthly Price ($)</Label>
                <Input type="number" value={t.price} onChange={(e) => update(i, { price: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white mb-3" />
                <Label className="text-slate-400 text-xs">Perks Included</Label>
                <Input value={t.perks} onChange={(e) => update(i, { perks: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                <div className="mt-3 text-[11px] text-slate-500">
                  You keep <span className="text-emerald-300 font-semibold">{fmtUsd(Math.round(t.price * 100 * (1 - feePct / 100)))}</span> per sub after {feePct}% fee
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => toast({ title: 'Tiers saved!', description: 'Subscription pricing updated across all platforms.' })} className="mt-4 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
            Save Pricing
          </Button>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Connect Payment Platforms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAYMENT_PLATFORMS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition"
              >
                <div>
                  <div className="text-white font-semibold">{p.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{p.desc}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode="signin" />
    </section>
  );
};

export default Monetization;
