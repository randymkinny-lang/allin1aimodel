import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plug, Trash2, Bot, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: string;
  handle: string;
  status: string;
  auto_reply: boolean;
  connected_at: string;
}

export const SUPPORTED_PLATFORMS = [
  'Instagram',
  'TikTok',
  'OnlyFans',
  'Fanvue',
  'Fansly',
  'Twitter/X',
  'Telegram',
  'Threads',
  'Reddit',
  'Patreon',
  'YouTube',
  'Facebook',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  accounts: ConnectedAccount[];
  onChanged: () => void;
}

const ConnectAccountsDialog: React.FC<Props> = ({ open, onOpenChange, userId, accounts, onChanged }) => {
  const [platform, setPlatform] = useState<string>('Instagram');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setHandle('');
      setPlatform('Instagram');
    }
  }, [open]);

  const availablePlatforms = SUPPORTED_PLATFORMS.filter(
    (p) => !accounts.some((a) => a.platform === p),
  );

  const connect = async () => {
    if (!handle.trim()) {
      toast({ title: 'Handle required', description: 'Enter your username or page handle.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('connected_accounts').insert({
      user_id: userId,
      platform,
      handle: handle.trim(),
      status: 'active',
      auto_reply: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not connect account', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Connected!', description: `${platform} (${handle.trim()}) is now in your unified inbox.` });
    setHandle('');
    if (availablePlatforms.length > 1) {
      const next = availablePlatforms.find((p) => p !== platform);
      if (next) setPlatform(next);
    }
    onChanged();
  };

  const toggleAutoReply = async (acc: ConnectedAccount, value: boolean) => {
    const { error } = await supabase
      .from('connected_accounts')
      .update({ auto_reply: value })
      .eq('id', acc.id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    onChanged();
  };

  const disconnect = async (acc: ConnectedAccount) => {
    if (!window.confirm(`Disconnect ${acc.platform} (${acc.handle})?`)) return;
    const { error } = await supabase.from('connected_accounts').delete().eq('id', acc.id);
    if (error) {
      toast({ title: 'Disconnect failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Disconnected', description: `${acc.platform} removed from your inbox.` });
    onChanged();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-amber-400" /> Connect your social accounts
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add every platform you use. Conversations from connected platforms appear in your unified inbox, and your
            AI chatbot will automatically reply to incoming DMs when auto-reply is on.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white mb-3">Add a new account</div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {(availablePlatforms.length > 0 ? availablePlatforms : SUPPORTED_PLATFORMS).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Username / Handle</Label>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="bg-white/5 border-white/10 text-white mt-1"
                onKeyDown={(e) => e.key === 'Enter' && connect()}
              />
            </div>
            <Button onClick={connect} disabled={saving} className="bg-amber-400 text-slate-950 hover:bg-amber-500">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Demo connection — uses your handle to seed simulated DMs. The AI chatbot will respond to them in your persona.
          </p>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          <div className="text-sm font-semibold text-white">Connected accounts ({accounts.length})</div>
          {accounts.length === 0 ? (
            <div className="text-sm text-slate-500 p-3 rounded-lg border border-dashed border-white/10">
              No platforms connected yet. Add one above to start receiving messages.
            </div>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold">{a.platform}</div>
                  <div className="text-xs text-slate-400 truncate">{a.handle}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">AI</span>
                  <Switch
                    checked={a.auto_reply}
                    onCheckedChange={(v) => toggleAutoReply(a, v)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => disconnect(a)}
                  className="text-slate-400 hover:text-red-400 h-8 w-8"
                  title="Disconnect"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="bg-white/5 border-white/10 text-slate-300">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectAccountsDialog;
