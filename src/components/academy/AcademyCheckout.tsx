import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { upsertSafe } from '@/lib/upsertSafe';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, BookOpen, Lock } from 'lucide-react';

type AcademyTier = 'text' | 'video';

interface Props {
  open: boolean;
  onClose: () => void;
  tier: AcademyTier;
  onSuccess: () => void;
}

const PRICES: Record<AcademyTier, { amount: number; label: string; name: string }> = {
  text: { amount: 2899, label: '$28.99', name: 'Text Curriculum' },
  video: { amount: 4999, label: '$49.99', name: 'Full Video Curriculum' },
};

const PAYPAL_BUSINESS_EMAIL = import.meta.env.VITE_PAYPAL_BUSINESS_EMAIL || 'your-paypal@business.com';

const AcademyCheckout: React.FC<Props> = ({ open, onClose, tier, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const price = PRICES[tier];

  const handlePayPalCheckout = async () => {
    if (!user) {
      toast({ title: 'Please sign in', description: 'You must be signed in to purchase.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const amountDollars = (price.amount / 100).toFixed(2);
      const itemName = encodeURIComponent('All in 1 AI Model - Academy ' + price.name);
      const returnUrl = encodeURIComponent(window.location.origin + '/academy?payment=success&tier=' + tier);
      const cancelUrl = encodeURIComponent(window.location.origin + '/academy?payment=cancelled');

      const paypalUrl =
        'https://www.paypal.com/cgi-bin/webscr' +
        '?cmd=_xclick' +
        '&business=' + encodeURIComponent(PAYPAL_BUSINESS_EMAIL) +
        '&item_name=' + itemName +
        '&amount=' + amountDollars +
        '&currency_code=USD' +
        '&return=' + returnUrl +
        '&cancel_return=' + cancelUrl +
        '&no_shipping=1';

      window.open(paypalUrl, '_blank', 'width=600,height=700');

      // Optimistically record the purchase intent; full confirmation via PayPal IPN/webhook
      await upsertSafe(supabase, 'academy_purchases', {
        user_id: user.id,
        tier,
        amount: price.amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      toast({
        title: 'PayPal checkout opened',
        description: 'Complete your payment in the PayPal window. Your access will be granted once payment is confirmed.',
      });

      onClose();
    } catch (err) {
      console.error('PayPal checkout error:', err);
      toast({ title: 'Error', description: 'Could not open PayPal checkout. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Academy {price.name}
          </DialogTitle>
          <DialogDescription>
            One-time purchase — {price.label} via PayPal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="font-medium">{price.name}</p>
              <p className="text-sm text-muted-foreground">Lifetime access to all {tier === 'video' ? 'video and text' : 'text'} lessons</p>
            </div>
            <span className="ml-auto font-bold text-lg">{price.label}</span>
          </div>

          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Secure payment via PayPal. No account required.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePayPalCheckout} disabled={loading} className="flex-1">
            {loading ? 'Opening PayPal...' : 'Pay ' + price.label + ' with PayPal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcademyCheckout;
