import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  Gift,
  XCircle,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CONNECTED_ACCOUNT = 'acct_1TOXHhQbUzV3pKdK';
const PAGE_SIZE = 25;

type SubRow = {
  user_id: string;
  email: string | null;
  tier_id: string | null;
  tier_name: string | null;
  status: string | null;
  monthly_generation_limit: number | null;
  generations_used: number | null;
  period_end: string | null;
  is_lifetime: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
};

const statusClass = (status: string | null) => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'canceling':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'past_due':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'canceled':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'trialing':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    default:
      return 'bg-white/5 text-slate-300 border-white/10';
  }
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const SubscriptionsAdmin: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<SubRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'admin-list-subscriptions',
          page,
          pageSize: PAGE_SIZE,
          search,
        },
      });
      if (error) throw error;
      const payload = data as { rows?: SubRow[]; total?: number; error?: string };
      if (payload?.error) throw new Error(payload.error);
      setRows(payload?.rows || []);
      setTotal(payload?.total || 0);
    } catch (err) {
      toast({
        title: 'Failed to load subscriptions',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const runAction = async (
    action: 'admin-cancel-at-period-end' | 'admin-reactivate' | 'admin-comp-month',
    row: SubRow,
  ) => {
    setBusyUserId(row.user_id);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action,
          userId: row.user_id,
          subscriptionId: row.stripe_subscription_id || undefined,
        },
      });
      if (error) throw error;
      const payload = data as { error?: string; ok?: boolean };
      if (payload?.error) throw new Error(payload.error);

      const label =
        action === 'admin-cancel-at-period-end'
          ? 'Cancellation scheduled at period end'
          : action === 'admin-reactivate'
            ? 'Subscription reactivated'
            : 'Comped 1 free month';
      toast({ title: label, description: row.email || row.user_id });
      await load();
    } catch (err) {
      toast({
        title: 'Action failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const fpDashboardUrl = (customerId: string) =>
    `https://dashboard.famouspay.com/${CONNECTED_ACCOUNT}/customers/${customerId}`;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Source of truth synced from FamousPay (
            <span className="font-mono">{CONNECTED_ACCOUNT}</span>) via the{' '}
            <span className="font-mono">famouspay-webhook</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={onSearchSubmit} className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search email, tier, customer id…"
              className="pl-9 w-72 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </form>
          <Button
            variant="outline"
            onClick={() => load()}
            disabled={loading}
            className="border-white/15 text-slate-200 hover:bg-white/5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Tier</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Usage</TableHead>
              <TableHead className="text-slate-400">Customer</TableHead>
              <TableHead className="text-slate-400">Period end</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading subscriptions…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                  No subscription rows{search ? ` matching “${search}”` : ' yet'}.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const used = row.generations_used ?? 0;
                const limit = row.monthly_generation_limit ?? 0;
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const isBusy = busyUserId === row.user_id;
                const canCancel = !!row.stripe_subscription_id && row.status === 'active';
                const canReactivate =
                  !!row.stripe_subscription_id &&
                  (row.status === 'canceling' || row.status === 'canceled');
                return (
                  <TableRow key={row.user_id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-slate-200">
                      <div className="font-medium">{row.email || '—'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.user_id.slice(0, 8)}…</div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="font-medium">{row.tier_name || row.tier_id || '—'}</div>
                      {row.is_lifetime && (
                        <Badge className="mt-1 bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
                          LIFETIME
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusClass(row.status)} uppercase text-[10px]`}>
                        {row.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="text-xs font-mono">
                        {used} / {limit > 0 ? limit : '∞'}
                      </div>
                      {limit > 0 && (
                        <div className="mt-1 h-1 w-24 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full ${
                              pct >= 90
                                ? 'bg-rose-400'
                                : pct >= 70
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.stripe_customer_id ? (
                        <a
                          href={fpDashboardUrl(row.stripe_customer_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-amber-300 hover:text-amber-200"
                          title="Open in FamousPay dashboard"
                        >
                          {row.stripe_customer_id.slice(0, 16)}…
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {fmtDate(row.period_end)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            className="text-slate-300 hover:text-white hover:bg-white/5"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-900 border-white/10 text-slate-200"
                        >
                          <DropdownMenuLabel className="text-slate-400 text-xs">
                            Manage subscription
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            disabled={!canCancel}
                            onClick={() => runAction('admin-cancel-at-period-end', row)}
                            className="focus:bg-white/5"
                          >
                            <XCircle className="h-4 w-4 mr-2 text-amber-300" />
                            Cancel at period end
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canReactivate}
                            onClick={() => runAction('admin-reactivate', row)}
                            className="focus:bg-white/5"
                          >
                            <RotateCw className="h-4 w-4 mr-2 text-emerald-300" />
                            Reactivate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => runAction('admin-comp-month', row)}
                            className="focus:bg-white/5"
                          >
                            <Gift className="h-4 w-4 mr-2 text-purple-300" />
                            Comp 1 month
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-500">
          {total === 0 ? 'No rows' : (
            <>
              Showing <span className="text-slate-300 font-mono">
                {(page - 1) * PAGE_SIZE + 1}
                {'–'}
                {Math.min(page * PAGE_SIZE, total)}
              </span>{' '}
              of <span className="text-slate-300 font-mono">{total}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-white/15 text-slate-200 hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-xs text-slate-400 font-mono">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-white/15 text-slate-200 hover:bg-white/5"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </section>
  );
};

export default SubscriptionsAdmin;
