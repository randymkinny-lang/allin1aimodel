import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Ticket,
  Copy,
  Trash2,
  RefreshCw,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';

type Invite = {
  code: string;
  email: string | null;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
  note: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const BetaInvitesCard: React.FC = () => {
  const { toast } = useToast();
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  // Form state
  const [bulkCount, setBulkCount] = React.useState<number>(5);
  const [emailList, setEmailList] = React.useState('');
  const [note, setNote] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'unused' | 'used'>('all');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-flags', {
        body: { action: 'list_invites' },
      });
      if (error) throw error;
      setInvites(((data as { invites?: Invite[] })?.invites) ?? []);
    } catch (err) {
      toast({
        title: 'Failed to load invites',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleBulkGenerate = async () => {
    const n = Math.max(1, Math.min(200, Number(bulkCount) || 0));
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-flags', {
        body: {
          action: 'create_invites',
          count: n,
          note: note.trim() || undefined,
        },
      });
      if (error) throw error;
      const created = (data as { created?: number })?.created ?? 0;
      toast({
        title: `Generated ${created} invite${created === 1 ? '' : 's'}`,
        description: 'Share these codes with beta testers — one signup each.',
      });
      await refresh();
    } catch (err) {
      toast({
        title: 'Failed to generate invites',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEmailInvites = async () => {
    const emails = emailList
      .split(/[\s,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /.+@.+\..+/.test(e));
    if (emails.length === 0) {
      toast({
        title: 'No valid emails',
        description: 'Enter one or more email addresses (comma, space, or newline separated).',
        variant: 'destructive',
      });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-flags', {
        body: {
          action: 'create_invites',
          emails,
          note: note.trim() || undefined,
        },
      });
      if (error) throw error;
      const created = (data as { created?: number })?.created ?? 0;
      toast({
        title: `Created ${created} email invite${created === 1 ? '' : 's'}`,
        description:
          'Copy each code from the table below and send it to the corresponding tester.',
      });
      setEmailList('');
      await refresh();
    } catch (err) {
      toast({
        title: 'Failed to create invites',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copied!', description: code });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUnused = async () => {
    const unused = invites.filter((i) => !i.used_at).map((i) => i.code);
    if (unused.length === 0) {
      toast({ title: 'No unused codes to copy.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(unused.join('\n'));
      toast({
        title: `Copied ${unused.length} unused code${unused.length === 1 ? '' : 's'}`,
        description: 'Paste into your email client to send them out.',
      });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete invite ${code}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.functions.invoke('admin-flags', {
        body: { action: 'delete_invite', code },
      });
      if (error) throw error;
      toast({ title: 'Invite deleted' });
      setInvites((prev) => prev.filter((i) => i.code !== code));
    } catch (err) {
      toast({
        title: 'Failed to delete invite',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  };

  const filtered = invites.filter((i) => {
    if (filter === 'unused') return !i.used_at;
    if (filter === 'used') return Boolean(i.used_at);
    return true;
  });

  const stats = {
    total: invites.length,
    used: invites.filter((i) => i.used_at).length,
    unused: invites.filter((i) => !i.used_at).length,
  };

  return (
    <section className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-transparent p-6">
      <div className="flex items-start justify-between gap-6 flex-wrap mb-5">
        <div>
          <div className="flex items-center gap-2 text-violet-300 text-sm font-semibold uppercase tracking-wide">
            <Ticket className="h-4 w-4" /> Beta Program
          </div>
          <h2 className="mt-1 text-xl font-bold flex items-center gap-3">
            Invite Beta Testers
            <span className="text-xs font-normal text-slate-400">
              {stats.unused} unused · {stats.used} redeemed · {stats.total} total
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Generate one-time signup codes. New users who enter a valid code at signup are
            permanently tagged as beta testers and get Test Mode unlocked for their account
            — even if you later disable global Test Mode.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUnused}
            disabled={stats.unused === 0}
            className="border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <Copy className="h-4 w-4 mr-1.5" /> Copy unused
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Generators */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Bulk anonymous */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Plus className="h-4 w-4 text-violet-300" /> Bulk-generate codes
          </div>
          <p className="text-xs text-slate-400">
            Mass-mint anonymous one-time codes you can share anywhere.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">How many?</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                className="bg-white/5 border-white/10 text-white mt-1"
                disabled={creating}
              />
            </div>
            <Button
              onClick={handleBulkGenerate}
              disabled={creating}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Generate
            </Button>
          </div>
        </div>

        {/* Per-email */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Mail className="h-4 w-4 text-violet-300" /> Invite specific emails
          </div>
          <p className="text-xs text-slate-400">
            One code per email. Comma, space, or newline separated.
          </p>
          <Textarea
            value={emailList}
            onChange={(e) => setEmailList(e.target.value)}
            placeholder="alice@example.com, bob@example.com"
            className="bg-white/5 border-white/10 text-white min-h-[60px]"
            disabled={creating}
          />
          <Button
            onClick={handleEmailInvites}
            disabled={creating || !emailList.trim()}
            className="w-full bg-violet-500 hover:bg-violet-600 text-white"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-1.5" />
            )}
            Create email invites
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs text-slate-400">Optional note (saved with new invites)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Q3 closed beta, Twitter wave 2"
          className="bg-white/5 border-white/10 text-white mt-1"
          maxLength={200}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-3">
        {(['all', 'unused', 'used'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filter === f
                ? 'bg-violet-500/20 border-violet-400/40 text-violet-200'
                : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {f === 'all' && `All (${stats.total})`}
            {f === 'unused' && `Unused (${stats.unused})`}
            {f === 'used' && `Redeemed (${stats.used})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Code</th>
                <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Created</th>
                <th className="text-left px-4 py-2.5 font-semibold">Note</th>
                <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="h-4 w-4 inline-block mr-2 animate-spin" />
                    Loading invites…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No invites yet. Generate some above to get started.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.code} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-amber-200">{inv.code}</td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {inv.email ?? <span className="text-slate-500 italic">— any —</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {inv.used_at ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Redeemed{' '}
                          <span className="opacity-70 ml-1">{formatDate(inv.used_at)}</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 gap-1">
                          <Clock className="h-3 w-3" /> Unused
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[180px] truncate">
                      {inv.note ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(inv.code)}
                          className="p-1.5 rounded-md hover:bg-white/10 text-slate-300"
                          title="Copy code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.code)}
                          className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-300"
                          title="Delete invite"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default BetaInvitesCard;
