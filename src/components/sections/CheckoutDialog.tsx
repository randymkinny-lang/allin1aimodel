import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
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

const STRIPE_ACCOUNT_ID = 'acct_1TOXHhQbUzV3pKdK';
const stripePromise = loadStripe(
  'pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ',
  { stripeAccount: STRIPE_ACCOUNT_ID },
);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tier: Tier | null;
}

type Step = 'email' | 'payment' | 'success';

const PaymentForm: React.FC<{
  tier: Tier;
  customerId: string;
  email: string;
  mode: 'subscription' | 'one-time';
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ tier, customerId, email, mode, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user, getIdentityId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const identityId = user?.id ?? getIdentityId();

    try {
      if (mode === 'subscription') {
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: { return_url: window.location.origin },
          redirect: 'if_required',
        });
        if (setupError) throw new Error(setupError.message);
        if (setupIntent?.status !== 'succeeded') throw new Error('Payment setup did not complete');

        // CRITICAL: pass the confirmed payment method so the subscription has a
        // default card to charge. Entitlement is persisted server-side (RLS-safe).
        const { data, error: fnErr } = await supabase.functions.invoke('manage-subscription', {
          body: {
            action: 'activate-subscription',
            customerId,
            priceId: tier.priceId,
            paymentMethodId: setupIntent.payment_method,
            tierId: tier.id,
            tierName: tier.name,
            generations: tier.generations,
            email,
            identityId,
          },
        });
        if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message || 'Failed to activate');
      } else {
        const { error: payErr, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: window.location.origin },
          redirect: 'if_required',
        });
        if (payErr) throw new Error(payErr.message);
        if (paymentIntent?.status !== 'succeeded') throw new Error('Payment did not complete');

        // Persist the lifetime entitlement server-side (RLS-safe).
        const { data, error: fnErr } = await supabase.functions.invoke('manage-subscription', {
          body: {
            action: 'persist-entitlement',
            identityId,
            tierId: tier.id,
            tierName: tier.name,
            generations: tier.generations,
            isLifetime: tier.id === 'lifetime',
            customerId,
            paymentIntentId: paymentIntent.id,
            email,
          },
        });
        if (fnErr || data?.error) {
          // Payment already succeeded — surface a soft warning but continue.
          console.error('Persist entitlement failed:', data?.error || fnErr?.message);
        }
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
          {error}
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
          ) : mode === 'subscription' ? (
            `Subscribe · ${tier.priceLabel}/mo`
          ) : (
            `Pay ${tier.priceLabel}`
          )}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 text-center">
        Secured by Stripe · Your card info never touches our servers
      </p>
    </form>
  );
};


const CheckoutDialog: React.FC<Props> = ({ open, onOpenChange, tier }) => {
  const { user } = useAuth();
  const { refresh } = useSubscription();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [mode, setMode] = useState<'subscription' | 'one-time'>('subscription');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail(user?.email ?? '');
      setName((user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? '');
      setClientSecret(null);
      setCustomerId(null);
      setError(null);
    }
  }, [open, user]);

  if (!tier) return null;

  const isLifetime = tier.id === 'lifetime';

  const startCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    // MANDATORY: add this email to the project owner's CRM contact list.
    // Fire-and-forget so it never blocks the payment flow.
    void fetch('https://famous.ai/api/crm/69e42d4d86df19fff1064166/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: name || undefined,
        source: 'checkout',
        tags: ['newsletter', 'checkout', tier.id],
      }),
    }).catch(() => {});

    try {
      const action = isLifetime ? 'create-payment-intent' : 'create-setup-intent';
      const payload = isLifetime
        ? { action, email, name, amount: tier.price * 100, tierId: tier.id }
        : { action, email, name, tierId: tier.id, priceId: tier.priceId };

      const { data, error: fnErr } = await supabase.functions.invoke('manage-subscription', {
        body: payload,
      });
      if (fnErr || data?.error) throw new Error(data?.error || fnErr?.message || 'Failed to start checkout');

      setClientSecret(data.clientSecret);
      setCustomerId(data.customerId);
      setMode(data.mode);
      setStep('payment');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const handleSuccess = async () => {
    await refresh();
    setStep('success');
    toast({
      title: `${tier.name} activated!`,
      description: `You now have access to all ${tier.name} features.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            {step === 'success' ? 'Welcome aboard!' : `Subscribe · ${tier.name}`}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'success'
              ? `Your ${tier.name} plan is now active.`
              : isLifetime
                ? `One-time payment of ${tier.priceLabel} — unlock full ownership.`
                : `${tier.priceLabel}/month · ${tier.generations.toLocaleString()} generations`}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={startCheckout} className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300 space-y-1">
              {tier.features.slice(0, 4).map((f) => (
                <div key={f} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>{f}</span></div>
              ))}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5 border-white/10" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10" />
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
            <Button type="submit" disabled={loading || !email} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : 'Continue to Payment'}
            </Button>
          </form>
        )}

        {step === 'payment' && clientSecret && customerId && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#fbbf24' } } }}
          >
            <PaymentForm
              tier={tier}
              customerId={customerId}
              email={email}
              mode={mode}
              onSuccess={handleSuccess}
              onCancel={() => setStep('email')}
            />
          </Elements>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold">{tier.name} plan active</div>
              <div className="text-sm text-slate-400">
                {isLifetime ? 'Unlimited generations unlocked' : `${tier.generations.toLocaleString()} generations per month`}
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
              Start Creating
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
