import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  RefreshCw,
  ImageIcon,
  Film,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface DailyRow {
  day: string;
  total: number;
  images: number;
  videos: number;
  cost_estimate: number;
}

const fmtUSD = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDay = (iso: string) => {
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
};

const GenerationUsageCard: React.FC = () => {
  const [rows, setRows] = React.useState<DailyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pull recent raw events (RLS allows select) and aggregate per UTC day
      // on the client — avoids needing extra grants on a DB view.
      const { data, error } = await supabase
        .from('generation_events')
        .select('media_type, cost_estimate, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const byDay = new Map<string, DailyRow>();
      for (const ev of (data as any[]) || []) {
        const day = new Date(ev.created_at).toISOString().slice(0, 10);
        const row =
          byDay.get(day) ||
          ({ day, total: 0, images: 0, videos: 0, cost_estimate: 0 } as DailyRow);
        row.total += 1;
        if (ev.media_type === 'video') row.videos += 1;
        else row.images += 1;
        row.cost_estimate += Number(ev.cost_estimate) || 0;
        byDay.set(day, row);
      }
      const sorted = Array.from(byDay.values())
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, 30);
      setRows(sorted);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const totals = React.useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += Number(r.total) || 0;
        acc.images += Number(r.images) || 0;
        acc.videos += Number(r.videos) || 0;
        acc.cost += Number(r.cost_estimate) || 0;
        return acc;
      },
      { total: 0, images: 0, videos: 0, cost: 0 },
    );
  }, [rows]);

  const maxTotal = React.useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.total) || 0)),
    [rows],
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/10 to-transparent p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 text-sky-300 text-sm font-semibold uppercase tracking-wide">
            <Activity className="h-4 w-4" /> Replicate usage
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">AI Generation Usage &amp; Spend</h2>
          <p className="mt-2 text-sm text-slate-300 max-w-xl">
            Daily image &amp; video generations logged to{' '}
            <span className="font-mono">generation_events</span> with rough Replicate cost
            estimates, so you can monitor API usage and burn rate.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-white/15 text-slate-200 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary tiles (last 30 days) */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryTile
          icon={<TrendingUp className="h-4 w-4 text-sky-300" />}
          label="Total (30d)"
          value={totals.total.toLocaleString()}
        />
        <SummaryTile
          icon={<ImageIcon className="h-4 w-4 text-emerald-300" />}
          label="Images"
          value={totals.images.toLocaleString()}
        />
        <SummaryTile
          icon={<Film className="h-4 w-4 text-fuchsia-300" />}
          label="Videos"
          value={totals.videos.toLocaleString()}
        />
        <SummaryTile
          icon={<DollarSign className="h-4 w-4 text-amber-300" />}
          label="Est. spend"
          value={fmtUSD(totals.cost)}
        />
      </div>

      {/* Per-day breakdown */}
      <div className="mt-6">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
            Failed to load usage: {error}
          </div>
        )}

        {loading && !rows.length && (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading usage…
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
            No generations logged yet. Usage will appear here once images or videos are created.
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] uppercase tracking-wide text-slate-500 font-semibold bg-white/[0.02]">
              <div className="col-span-3">Day</div>
              <div className="col-span-5">Generations</div>
              <div className="col-span-2 text-right">Img / Vid</div>
              <div className="col-span-2 text-right">Est. cost</div>
            </div>
            {rows.map((r) => {
              const pct = Math.round(((Number(r.total) || 0) / maxTotal) * 100);
              const isToday = r.day === todayIso;
              return (
                <div
                  key={r.day}
                  className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-white/[0.03] transition"
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-slate-200 font-medium">{fmtDay(r.day)}</span>
                    {isToday && (
                      <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[10px] px-1.5 py-0">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                      <span className="text-slate-300 tabular-nums w-10 text-right font-semibold">
                        {r.total}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-xs text-slate-400 tabular-nums">
                    <span className="text-emerald-300">{r.images}</span>
                    {' / '}
                    <span className="text-fuchsia-300">{r.videos}</span>
                  </div>
                  <div className="col-span-2 text-right text-amber-300 font-semibold tabular-nums">
                    {fmtUSD(r.cost_estimate)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Cost figures are approximate per-run estimates (SDXL ~$0.004 hd / ~$0.011 4k; video
        ~$0.045–0.05 per second) for budgeting only — see your Replicate dashboard for billed
        amounts.
      </p>
    </div>
  );
};

const SummaryTile: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {icon}
      {label}
    </div>
    <div className="mt-1.5 text-2xl font-extrabold text-white tabular-nums">{value}</div>
  </div>
);

export default GenerationUsageCard;
