import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fanName: string;
  platform: string;
  onSubmit: (body: string) => Promise<void>;
}

const QUICK_PROMPTS = [
  "Hey beautiful — what's up?",
  'Just tipped you $20 — keep up the amazing work!',
  'Can you send me a custom video? willing to pay extra',
  'Are you a real person or a bot?',
  "I've been following you for ages, finally said hi",
  'How was your weekend?',
];

const SimulateDmDialog: React.FC<Props> = ({ open, onOpenChange, fanName, platform, onSubmit }) => {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setBody('');
      setSubmitting(false);
    }
  }, [open]);

  const send = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" /> Simulate a DM from {fanName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Drop in a fan message from <strong className="text-amber-300">{platform}</strong> — your AI chatbot will see it
            and reply automatically (if auto-reply is on for this platform).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-400">Message</Label>
            <Input
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a fan message…"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1.5">Quick examples</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBody(q)}
                  className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-amber-400/10 hover:border-amber-400/30 hover:text-amber-200 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="bg-white/5 border-white/10 text-slate-300">
            Cancel
          </Button>
          <Button onClick={send} disabled={!body.trim() || submitting} className="bg-amber-400 text-slate-950 hover:bg-amber-500">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send as fan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimulateDmDialog;
