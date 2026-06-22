import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useModels, type SavedModel } from '@/contexts/ModelsContext';
import { toast } from '@/components/ui/use-toast';
import { Check, Copy, Globe, Link2, Loader2, Lock, QrCode, ExternalLink } from 'lucide-react';

interface ShareModelDialogProps {
  model: SavedModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareModelDialog: React.FC<ShareModelDialogProps> = ({ model, open, onOpenChange }) => {
  const { togglePublish } = useModels();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Local mirror so UI updates instantly while refresh completes
  const [localPublic, setLocalPublic] = useState<boolean>(!!model?.is_public);
  const [localSlug, setLocalSlug] = useState<string | null>(model?.slug ?? null);

  useEffect(() => {
    setLocalPublic(!!model?.is_public);
    setLocalSlug(model?.slug ?? null);
    setCopied(false);
  }, [model?.id, model?.is_public, model?.slug]);

  const shareUrl = useMemo(() => {
    if (!localSlug) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/m/${localSlug}`;
  }, [localSlug]);

  const qrSrc = useMemo(() => {
    if (!shareUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
      shareUrl
    )}`;
  }, [shareUrl]);

  const handleToggle = async (nextPublic: boolean) => {
    if (!model) return;
    setBusy(true);
    const res = await togglePublish(model.id, nextPublic);
    setBusy(false);
    if (res.error) {
      toast({ title: 'Something went wrong', description: res.error, variant: 'destructive' });
      return;
    }
    setLocalPublic(nextPublic);
    setLocalSlug(res.slug ?? null);
    toast({
      title: nextPublic ? 'Model published' : 'Model unpublished',
      description: nextPublic
        ? 'Anyone with the link can now view this model.'
        : 'Your share link no longer works.',
    });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Link copied', description: shareUrl });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const handleOpenLink = () => {
    if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `${model?.name || 'model'}-qr.png`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-amber-400" />
            Share {model?.name || 'model'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Publish a public page with the bio, personality, interests and gallery. You can unpublish any time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            {localPublic ? (
              <Globe className="h-5 w-5 text-emerald-400" />
            ) : (
              <Lock className="h-5 w-5 text-slate-500" />
            )}
            <div>
              <Label htmlFor="publish-switch" className="text-white font-medium cursor-pointer">
                {localPublic ? 'Public' : 'Private'}
              </Label>
              <div className="text-xs text-slate-400">
                {localPublic ? 'Visible to anyone with the link' : 'Only you can view this'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <Switch
              id="publish-switch"
              checked={localPublic}
              onCheckedChange={handleToggle}
              disabled={busy}
            />
          </div>
        </div>

        {localPublic && shareUrl ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Share link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="bg-slate-900 border-white/10 text-white font-mono text-xs"
                />
                <Button
                  onClick={handleCopy}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleOpenLink}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-3">
              <div className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> Scan to view on mobile
              </div>
              <div className="bg-white p-3 rounded-lg">
                <img src={qrSrc} alt="QR code" width={200} height={200} />
              </div>
              <button
                onClick={handleDownloadQr}
                className="text-xs text-amber-300 hover:text-amber-200 underline"
              >
                Download QR code
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-500 p-6 rounded-xl border border-dashed border-white/10">
            Toggle the switch above to generate a public share link and QR code.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModelDialog;
