import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, DollarSign } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  creatorPaypalEmail?: string;
  onSuccess?: () => void;
}

const PRESETS = [5, 10, 20, 50, 100];
const PAYPAL_BUSINESS_EMAIL = import.meta.env.VITE_PAYPAL_BUSINESS_EMAIL || 'your-paypal@business.com';

const TipDialog: React.FC<Props> = ({ open, onClose, creatorName, creatorPaypalEmail, onSuccess }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resolvedAmount = customAmount ? parseFloat(customAmount) : amount;
  const paypalEmail = creatorPaypalEmail || PAYPAL_BUSINESS_EMAIL;

  const handleSendTip = () => {
    if (!resolvedAmount || resolvedAmount < 1) {
      toast({ title: 'Invalid amount', description: 'Please enter at least $1.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const amountStr = resolvedAmount.toFixed(2);
      const itemName = encodeURIComponent('Tip for ' + creatorName + (message ? ': ' + message.substring(0, 50) : ''));
      const returnUrl = encodeURIComponent(window.location.href + '?tip=success');
      const cancelUrl = encodeURIComponent(window.location.href + '?tip=cancelled');

      const paypalUrl =
        'https://www.paypal.com/cgi-bin/webscr' +
        '?cmd=_xclick' +
        '&business=' + encodeURIComponent(paypalEmail) +
        '&item_name=' + itemName +
        '&amount=' + amountStr +
        '&currency_code=USD' +
        '&return=' + returnUrl +
        '&cancel_return=' + cancelUrl +
        '&no_shipping=1';

      window.open(paypalUrl, '_blank', 'width=600,height=700');

      toast({
        title: 'PayPal opened!',
        description: 'Complete your tip in the PayPal window. Thank you for supporting ' + creatorName + '!',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Tip error:', err);
      toast({ title: 'Error', description: 'Could not open PayPal. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Send a Tip to {creatorName}
          </DialogTitle>
          <DialogDescription>
            Support {creatorName} with a one-time tip via PayPal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Choose amount</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset && !customAmount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setAmount(preset); setCustomAmount(''); }}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">Message (optional)</Label>
            <Textarea
              placeholder={"Leave a nice message for " + creatorName + "..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Tips are processed securely via PayPal. No account required.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSendTip} disabled={loading || !resolvedAmount} className="flex-1">
            {loading ? 'Opening PayPal...' : 'Send $' + (resolvedAmount || 0).toFixed(2) + ' Tip'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TipDialog;
