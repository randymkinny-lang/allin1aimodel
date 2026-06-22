import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SessionRow {
  user_id: string;
  email: string;
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
}

type SortKey = 'email' | 'first_seen_at' | 'last_seen_at' | 'session_count';
type SortDir = 'asc' | 'desc';

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const relativeTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

const isTransientFetchError = (err: unknown) => {
  const msg = (err as Error)?.message ?? '';
  return /failed to fetch|networkerror|load failed|fetch failed/i.test(msg);
};

const BetaTestersList: React.FC = () => {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = React.useState<SessionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>('last_seen_at');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');

  const load = React.useCallback(async () => {
    // Wait until auth has fully loaded — the gateway rejects calls that
    // arrive without a valid Authorization header, so don't even try to
    // invoke until supabase-js can attach a real session token.
    if (authLoading) return;
    if (!session?.access_token) {
      setErrorMsg('Sign in required to load beta testers.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-flags', {
        body: { action: 'list_sessions' },
      });
      if (error) throw new Error(error.message);
      setRows(((data as { sessions?: SessionRow[] })?.sessions) ?? []);
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      setErrorMsg(msg);
      // Don't spam the user with a toast for transient network blips —
      // they'll see the inline error and can hit Refresh.
      if (!isTransientFetchError(err)) {
        toast({
          title: 'Failed to load beta testers',
          description: msg,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, authLoading, session]);

  React.useEffect(() => {
    load();
  }, [load]);

  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === 'first_seen_at' || sortKey === 'last_seen_at') {
        av = new Date(a[sortKey]).getTime();
        bv = new Date(b[sortKey]).getTime();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'email' ? 'asc' : 'desc');
    }
  };

  const SortIcon: React.FC<{ k: SortKey }> = ({ k }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const HeaderBtn: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1.5 text-left font-semibold text-slate-200 hover:text-amber-300 transition"
    >
      {children}
      <SortIcon k={k} />
    </button>
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-300" />
            Beta Testers
            <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 ml-2">
              {rows.length}
            </Badge>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Non-admin users who loaded the app while Test Mode was enabled.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading || authLoading}
          className="border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-200">Couldn&apos;t load beta testers</div>
            <div className="text-xs text-amber-300/80 mt-1 break-words">{errorMsg}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="mt-3 border-amber-400/30 text-amber-200 hover:bg-amber-500/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Try again
            </Button>
          </div>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading testers…</div>
      ) : sorted.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No beta testers tracked yet. Once a non-admin user signs in with Test Mode on, they&apos;ll
          appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">
                  <HeaderBtn k="email">Email</HeaderBtn>
                </th>
                <th className="px-4 py-3 text-left">
                  <HeaderBtn k="first_seen_at">First seen</HeaderBtn>
                </th>
                <th className="px-4 py-3 text-left">
                  <HeaderBtn k="last_seen_at">Last seen</HeaderBtn>
                </th>
                <th className="px-4 py-3 text-right">
                  <HeaderBtn k="session_count">Sessions</HeaderBtn>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((r) => (
                <tr key={r.user_id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-mono text-slate-200">{r.email}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <div>{formatDate(r.first_seen_at)}</div>
                    <div className="text-xs text-slate-500">{relativeTime(r.first_seen_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <div>{formatDate(r.last_seen_at)}</div>
                    <div className="text-xs text-emerald-400/80">{relativeTime(r.last_seen_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 font-mono">
                      {r.session_count}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default BetaTestersList;
