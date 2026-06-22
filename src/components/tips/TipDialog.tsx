import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, Heart, DollarSign } from 'lucide-react';

const STRIPE_ACCOUNT_ID = 'acct_1TOXHhQbUzV3pKdK';
const stripePromise = loadStripe(
  'pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ',
  { stripeAccount: STRIPE_ACCOUNT_ID },
);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  creatorUserId: string;
  creatorName: string;
}

type Step = 'amount' | 'payment' | 'success';

const PRESETS = [5, 10, 20, 50, 100];

const PaymentForm: React.FC<{
  amount: number;
  paymentIntentId: string;
  creatorName: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ amount, paymentIntentId, creatorName, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
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
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });

      if (payErr) throw new Error(payErr.message);
      if (paymentIntent?.status !== 'succeeded') {
        throw new Error(`Payment ${paymentIntent?.status || 'did not complete'}`);
      }

      // Tell our backend to flip the earnings row to succeeded so lifetime earnings update immediately
      await supabase.functions.invoke('famouspay-connect', {
        body: {
          action: 'mark-fan-payment-succeeded',
          paymentIntentId,
        },
      });

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
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
          ) : (
            <><Heart className="h-4 w-4 mr-2" />Tip ${amount.toFixed(2)}</>
          )}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 text-center">
        Secured by FamousPay · Goes directly to {creatorName}
      </p>
    </form>
  );
};

const TipDialog: React.FC<Props> = ({ open, onOpenChange, creatorUserId, creatorName }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [fanEmail, setFanEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('amount');
      setAmount(10);
      setCustomAmount('');
      setMessage('');
      setFanEmail(user?.email ?? '');
      setClientSecret(null);
      setPaymentIntentId(null);
      setError(null);
    }
  }, [open, user]);

  const effectiveAmount = customAmount ? Math.max(1, Number(customAmount) || 0) : amount;

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorUserId || effectiveAmount < 1) {
      setError('Minimum tip is $1.00');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('famouspay-connect', {
        body: {
          action: 'create-fan-payment',
          creatorUserId,
          amount: Math.round(effectiveAmount * 100), // cents
          kind: 'tip',
          fanEmail: fanEmail || undefined,
          message: message || undefined,
        },
      });
      if (fnErr || data?.error) {
        throw new Error(data?.error || fnErr?.message || 'Failed to start tip');
      }
      if (!data?.clientSecret) throw new Error('No clientSecret returned');
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep('payment');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setStep('success');
    toast({
      title: 'Tip sent!',
      description: `You tipped ${creatorName} $${effectiveAmount.toFixed(2)}. Thank you!`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-400" />
            {step === 'success' ? 'Tip sent!' : `Send a tip to ${creatorName}`}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'success'
              ? 'Your support goes directly to the creator.'
              : 'Support your favorite creator directly via FamousPay.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <form onSubmit={start} className="space-y-4">
            <div>
              <Label className="text-slate-300">Choose an amount</Label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {PRESETS.map((p) => {
                  const active = !customAmount && amount === p;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => {
                        setAmount(p);
                        setCustomAmount('');
                      }}
                      className={`h-10 rounded-lg text-sm font-semibold border transition ${
                        active
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      ${p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="custom" className="text-slate-300">Custom amount (USD)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="custom"
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="25.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="msg" className="text-slate-300">Message (optional)</Label>
              <Textarea
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Say something nice to ${creatorName}…`}
                maxLength={280}
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={3}
              />
              <div className="text-right text-[11px] text-slate-500 mt-1">
                {message.length}/280
              </div>
            </div>

            {!user && (
              <div>
                <Label htmlFor="email" className="text-slate-300">Your email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={fanEmail}
                  onChange={(e) => setFanEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || effectiveAmount < 1}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</>
              ) : (
                <>Continue · ${effectiveAmount.toFixed(2)}</>
              )}
            </Button>
          </form>
        )}

        {step === 'payment' && clientSecret && paymentIntentId && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'night', variables: { colorPrimary: '#fbbf24' } },
            }}
          >
            <PaymentForm
              amount={effectiveAmount}
              paymentIntentId={paymentIntentId}
              creatorName={creatorName}
              onSuccess={handleSuccess}
              onCancel={() => setStep('amount')}
            />
          </Elements>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-rose-400" />
            </div>
            <div>
              <div className="font-semibold">${effectiveAmount.toFixed(2)} sent to {creatorName}</div>
              <div className="text-sm text-slate-400">Your support helps keep creators making content.</div>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TipDialog;
