import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, Crown } from 'lucide-react';
import { TIERS, type Tier } from '@/data/tiers';
import CheckoutDialog from './sections/CheckoutDialog';

interface Props {
  title?: string;
  description?: string;
  requiredTierId: string; // e.g. 'creator', 'pro', 'professional', 'enterprise'
  variant?: 'card' | 'overlay' | 'inline';
  className?: string;
}

/**
 * Reusable gate shown when a user's current tier doesn't include a feature.
 * Clicking the CTA opens CheckoutDialog pre-loaded with the minimum required tier.
 */
const UpgradePrompt: React.FC<Props> = ({
  title = 'Locked feature',
  description = 'Upgrade your plan to unlock this.',
  requiredTierId,
  variant = 'card',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const tier: Tier = TIERS.find((t) => t.id === requiredTierId) ?? TIERS[0];

  const CTA = (
    <Button
      onClick={() => setOpen(true)}
      className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
    >
      <Crown className="h-4 w-4 mr-2" />
      Upgrade to {tier.name} · {tier.priceLabel}{tier.interval === 'month' ? '/mo' : ''}
    </Button>
  );

  if (variant === 'overlay') {
    return (
      <>
        <div className={`absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm rounded-2xl ${className}`}>
          <div className="text-center max-w-md p-6">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-slate-300 text-sm mt-2 mb-5">{description}</p>
            {CTA}
          </div>
        </div>
        <CheckoutDialog open={open} onOpenChange={setOpen} tier={tier} />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <div className={`flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-400/10 border border-amber-400/30 ${className}`}>
          <div className="flex items-center gap-2 text-amber-200 text-sm">
            <Lock className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{description}</span>
          </div>
          {CTA}
        </div>
        <CheckoutDialog open={open} onOpenChange={setOpen} tier={tier} />
      </>
    );
  }

  return (
    <>
      <div className={`rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-slate-900 to-purple-500/10 p-8 text-center ${className}`}>
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="text-slate-300 mt-2 mb-5 max-w-lg mx-auto">{description}</p>
        <div className="inline-block">{CTA}</div>
        <div className="mt-4 text-xs text-slate-500">Instant unlock · Cancel anytime</div>
      </div>
      <CheckoutDialog open={open} onOpenChange={setOpen} tier={tier} />
    </>
  );
};

export default UpgradePrompt;
