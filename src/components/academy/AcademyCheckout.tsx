import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { upsertSafe } from '@/lib/upsertSafe';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, BookOpen, Lock } from 'lucide-react';

const STRIPE_ACCOUNT_ID = 'acct_1TOXHhQbUzV3pKdK';
const stripePromise = loadStripe(
  'pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ',
  { stripeAccount: STRIPE_ACCOUNT_ID },
);

export type AcademyTier = 'text' | 'video';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tier: AcademyTier;
  onSuccess: () => void;
}

const PRICES: Record<AcademyTier, { amount: number; label: string; name: string }> = {
  text: { amount: 2899, label: '$28.99', name: 'Text Curriculum' },
  video: { amount: 4999, label: '$49.99', name: 'Full Video Curriculum' },
};

const PaymentForm: React.FC<{
  tier: AcademyTier;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ tier, amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const { error: payErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/academy' },
        redirect: 'if_required',
      });
      if (payErr) throw new Error(payErr.message);
      if (paymentIntent?.status !== 'succeeded') throw new Error('Payment did not complete');

      // Persist the purchase record using upsertSafe to dodge the PostgREST
      // "no unique or exclusion constraint matching the ON CONFLICT specification"
      // schema-cache bug that intermittently breaks ON CONFLICT (user_id, tier)
      // even though academy_purchases has a UNIQUE(user_id, tier) constraint.
      if (user?.id) {
        const { error: persistErr } = await upsertSafe(
          'academy_purchases',
          {
            user_id: user.id,
            tier,
            amount_cents: amount,
            stripe_payment_intent_id: paymentIntent.id,
            status: 'completed',
          },
          ['user_id', 'tier'],
        );
        if (persistErr) {
          // Payment succeeded on Stripe — log but don't block the success flow.
          console.error('Failed to persist academy purchase:', persistErr.message);
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
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:from-amber-500 hover:to-amber-700"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
          ) : (
            <>Pay {PRICES[tier].label}</>
          )}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 text-center">
        Secured by Stripe · One-time payment · Lifetime access
      </p>
    </form>
  );
};

const AcademyCheckout: React.FC<Props> = ({ open, onOpenChange, tier, onSuccess }) => {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'signin' | 'payment' | 'success'>('payment');

  useEffect(() => {
    if (!open) return;
    if (!user) {
      setStep('signin');
      return;
    }
    setStep('payment');
    setError(null);
    setClientSecret(null);
    setLoading(true);
    supabase.functions
      .invoke('create-academy-payment-intent', {
        body: { tier, userId: user.id, email: user.email },
      })
      .then(({ data, error: fnErr }) => {
        if (fnErr || data?.error) {
          setError(data?.error || fnErr?.message || 'Failed to start checkout');
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .finally(() => setLoading(false));
  }, [open, tier, user]);

  const handleSuccess = () => {
    setStep('success');
    toast({
      title: 'Curriculum unlocked!',
      description: 'You now have lifetime access to the full Consistency Beats Perfection Curriculum.',
    });
    onSuccess();
  };

  const info = PRICES[tier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-400" />
            {step === 'success' ? 'You\'re in!' : `Unlock ${info.name}`}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'success'
              ? 'All chapters are now unlocked for lifetime access.'
              : `${info.label} · One-time payment · Lifetime access`}
          </DialogDescription>
        </DialogHeader>

        {step === 'signin' && (
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold">Sign in to purchase</div>
              <div className="text-sm text-slate-400">
                Create a free account or sign in so we can tie this curriculum to your profile forever.
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
              Close & sign in
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
                {error}
              </div>
            )}
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'night', variables: { colorPrimary: '#fbbf24' } },
                }}
              >
                <PaymentForm
                  tier={tier}
                  amount={info.amount}
                  onSuccess={handleSuccess}
                  onCancel={() => onOpenChange(false)}
                />
              </Elements>
            )}
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold">{info.name} unlocked</div>
              <div className="text-sm text-slate-400">
                All 16 modules + bonus are yours for life.
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
              Start Reading
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default AcademyCheckout;
