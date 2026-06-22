import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap } from 'lucide-react';
import { TIERS, type Tier } from '@/data/tiers';
import { useSubscription } from '@/contexts/SubscriptionContext';
import CheckoutDialog from './CheckoutDialog';

const COURSE_PARTNER_EMAIL = 'allin1aimodels@gmail.com';

const Pricing: React.FC = () => {
  const { subscription, tier: currentTier } = useSubscription();
  const [selected, setSelected] = useState<Tier | null>(null);
  const [open, setOpen] = useState(false);

  const handleSelect = (t: Tier) => {
    setSelected(t);
    setOpen(true);
  };

  const isCurrent = (t: Tier) => subscription?.status === 'active' && subscription.tier_id === t.id;

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Pricing</div>
          <h2 className="text-3xl lg:text-5xl font-bold text-white">Simple Plans for Every Stage</h2>
          <p className="mt-3 text-slate-400">
            From solo creator to agency to full ownership. Pick your tier — features unlock instantly.
          </p>
        </div>

        {subscription?.status === 'active' && (
          <div className="max-w-2xl mx-auto mb-8 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-center">
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <Crown className="h-4 w-4" /> Active plan: {currentTier.name}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {subscription.generations_used} / {subscription.monthly_generation_limit.toLocaleString()} generations used
              {subscription.is_lifetime ? ' · Lifetime owner' : ''}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto mb-8 rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-2.5 flex items-center justify-center gap-2 text-center">
          <Zap className="h-4 w-4 text-slate-900 shrink-0" />
          <p className="text-slate-900 text-xs sm:text-sm font-semibold">
            Founding Member Pricing — Rates lock in at your first payment and never increase as long as you stay subscribed.
          </p>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {TIERS.map((t, idx) => {
            const current = isCurrent(t);
            const isOneTime = t.interval === 'one-time';
            return (
              <div
                key={t.id}
                className={`relative rounded-2xl p-6 border flex flex-col ${
                  t.highlight
                    ? 'bg-gradient-to-b from-amber-400/10 to-transparent border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.15)]'
                    : isOneTime
                    ? 'bg-gradient-to-b from-purple-500/10 to-transparent border-purple-400/40 hover:border-purple-400/60'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                } transition`}
              >
                {t.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      isOneTime ? 'bg-purple-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {t.badge}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-semibold">TIER {idx + 1}</div>
                  {current && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="text-white font-bold text-xl mt-2">{t.name}</div>
                <div className="text-slate-400 text-xs mb-4">{t.tagline}</div>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-bold text-white">{t.priceLabel}</span>
                  <span className="text-slate-400 text-sm">{isOneTime ? 'one-time' : '/mo'}</span>
                </div>
                {!isOneTime && (
                  <div className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-1 mb-4 w-fit">
                    <Zap className="h-3 w-3" />
                    {t.generations.toLocaleString()} generations/mo
                  </div>
                )}
                <ul className="space-y-2 mb-6 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                      <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isOneTime ? 'text-purple-400' : 'text-amber-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelect(t)}
                  disabled={current}
                  className={`w-full ${
                    t.highlight
                      ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold'
                      : isOneTime
                      ? 'bg-gradient-to-r from-purple-500 to-purple-700 text-white font-semibold'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {current ? 'Current Plan' : isOneTime ? 'Claim Ownership' : 'Get Started'}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          Need to bundle this with your courses? Email us at{' '}
          <a href={`mailto:${COURSE_PARTNER_EMAIL}`} className="text-amber-400 font-semibold hover:underline">
            {COURSE_PARTNER_EMAIL}
          </a>{' '}
          for Course Partner pricing.
        </p>

        <p className="text-center text-xs text-slate-500 mt-3">
          Cancel anytime · Features unlock instantly after payment · Secure checkout by Stripe
        </p>
      </div>

      <CheckoutDialog open={open} onOpenChange={setOpen} tier={selected} />
    </section>
  );
};

export default Pricing;
