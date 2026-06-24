import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { Tier } from '@/data/tiers';
import { Loader2, CheckCircle2, Crown } from 'lucide-react';

// ============================================================
// PAYPAL CONFIGURATION - Fill these in from your PayPal account
// ============================================================
// 1. Your PayPal Business email (from paypal.com account settings)
const PAYPAL_BUSINESS_EMAIL = import.meta.env.VITE_PAYPAL_BUSINESS_EMAIL ?? '';

// 2. PayPal Subscription Plan IDs (create at paypal.com/billing/plans)
//    After creating a plan, paste its ID here (format: P-XXXXXXXXXXXXXXXXXXXXXXXX)
const PAYPAL_PLAN_IDS: Record<string, string> = {
  starter: import.meta.env.VITE_PAYPAL_PLAN_STARTER ?? '',
  creator: import.meta.env.VITE_PAYPAL_PLAN_CREATOR ?? '',
  agency: import.meta.env.VITE_PAYPAL_PLAN_AGENCY ?? '',
};

// 3. Lifetime plan one-time price
const LIFETIME_PRICE = 997;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tier: Tier | null;
}

type Step = 'email' | 'success';

export function CheckoutDialog({ open, onOpenChange, tier }: Props) {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail(user?.email ?? '');
    }
  }, [open, user]);

  const buildPayPalUrl = (): string => {
    if (!tier || !PAYPAL_BUSINESS_EMAIL) return '';
    const origin = window.location.origin;
    const returnUrl = encodeURIComponent(origin + '/?payment=success&plan=' + tier.id);
    const cancelUrl = encodeURIComponent(origin + '/?payment=cancelled');
    const itemName = encodeURIComponent('All in 1 AI Model - ' + tier.name + ' Plan');

    if (tier.id === 'lifetime') {
      return 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick' +
        '&business=' + encodeURIComponent(PAYPAL_BUSINESS_EMAIL) +
        '&item_name=' + itemName +
        '&amount=' + LIFETIME_PRICE +
        '&currency_code=USD' +
        '&return=' + returnUrl +
        '&cancel_return=' + cancelUrl +
        '&no_note=1';
    }

    const planId = PAYPAL_PLAN_IDS[tier.id ?? ''];
    if (planId) {
      return 'https://www.paypal.com/webapps/billing/plans/subscribe' +
        '?plan_id=' + planId +
        '&custom_id=' + encodeURIComponent(user?.id ?? email) +
        '&return_url=' + returnUrl +
        '&cancel_url=' + cancelUrl;
    }

    // Fallback: standard recurring payment button
    const amount = tier.price ?? 29;
    return 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick-subscriptions' +
      '&business=' + encodeURIComponent(PAYPAL_BUSINESS_EMAIL) +
      '&item_name=' + itemName +
      '&a3=' + amount +
      '&p3=1&t3=M&src=1&sra=1' +
      '&currency_code=USD' +
      '&return=' + returnUrl +
      '&cancel_return=' + cancelUrl +
      '&no_note=1';
  };

  const handleContinueToPayPal = async () => {
    if (!email || !tier) return;
    setLoading(true);

    // Log checkout attempt (non-fatal)
    try {
      await supabase.from('checkout_sessions').upsert({
        user_id: user?.id ?? null,
        email,
        tier_id: tier.id,
        status: 'pending',
        provider: 'paypal',
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,tier_id' });
    } catch (_) { /* ignore */ }

    const paypalUrl = buildPayPalUrl();
    setLoading(false);

    if (!paypalUrl) {
      toast({
        title: 'Payment not configured',
        description: 'Please contact support to complete your purchase.',
        variant: 'destructive',
      });
      return;
    }

    window.open(paypalUrl, '_blank', 'noopener,noreferrer');
    setStep('success');
  };

  const handleDone = async () => {
    await refreshSubscription();
    onOpenChange(false);
    toast({
      title: 'Payment submitted!',
      description: 'Your plan will activate once PayPal confirms the payment. Check your email for a receipt.',
    });
  };

  if (!tier) return null;

  const isLifetime = tier.id === 'lifetime';
  const priceLabel = isLifetime ? '$' + LIFETIME_PRICE + ' one-time' : '$' + (tier.price ?? 29) + '/month';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Crown className="w-5 h-5 text-yellow-400" />
            Upgrade to {tier.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 'email'
              ? 'Redirects to PayPal for secure payment.'
              : 'Complete your payment in the PayPal window.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <div className="space-y-4 pt-2">
            <div className="bg-gray-800 rounded-lg p-4 space-y-2 border border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan</span>
                <span className="font-semibold">{tier.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price</span>
                <span className="font-semibold text-green-400">{priceLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Payment</span>
                <span className="font-semibold text-blue-400">PayPal</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="checkout-email" className="text-sm text-gray-300">Your email</Label>
              <Input
                id="checkout-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                placeholder="you@example.com"
              />
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleContinueToPayPal}
              disabled={loading || !email.includes('@')}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Preparing...</>
                : <>Pay with PayPal &rarr;</>
              }
            </Button>

            <p className="text-xs text-center text-gray-500">
              Secured by PayPal · No card required · Cancel anytime
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 pt-2 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <div>
              <p className="text-lg font-semibold">PayPal window opened!</p>
              <p className="text-sm text-gray-400 mt-1">
                Complete your payment there. Your plan activates within minutes.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-sm text-left text-gray-300 space-y-1">
              <p>✓ Check <strong className="text-white">{email}</strong> for a PayPal receipt</p>
              <p>✓ Your plan activates automatically</p>
              <p>✓ Manage your subscription at paypal.com</p>
            </div>
            <Button className="w-full" onClick={handleDone}>Done</Button>
            <button
              className="text-xs text-gray-500 hover:text-gray-300 underline"
              onClick={handleContinueToPayPal}
            >
              Reopen PayPal window
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
    }
