import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/sections/Footer';
import TestModeBanner from '@/components/TestModeBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTestMode } from '@/contexts/TestModeContext';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Database,
  Cpu,
  Image as ImageIcon,
  CreditCard,
  ScrollText,
} from 'lucide-react';

type Status = 'ok' | 'degraded' | 'down';
interface SubsystemResult { status: Status; latency_ms: number; detail: string }
interface HealthResponse {
  overall: Status;
  checked_at: string;
  subsystems: Record<string, SubsystemResult>;
  alerts: Record<string, { alerted: boolean; consecutive_failures: number }>;
}
interface FunctionError { id: string; occurred_at: string; function_name: string; level: string; message: string; detail: unknown }

const SUBSYSTEMS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'database', label: 'Database', icon: Database },
  { key: 'gateway', label: 'Gateway API', icon: Cpu },
  { key: 'replicate', label: 'Replicate', icon: ImageIcon },
  { key: 'famouspay', label: 'FamousPay', icon: CreditCard },
];

const StatusPill: React.FC<{ status?: Status }> = ({ status }) => {
  if (status === 'ok') return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
  if (status === 'degraded') return <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
  if (status === 'down') return <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30"><XCircle className="h-3 w-3 mr-1" />Down</Badge>;
  return <Badge className="bg-white/5 text-slate-400 border-white/10">—</Badge>;
};

const AdminHealth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: flagsLoading } = useTestMode();
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [logs, setLogs] = React.useState<Record<string, FunctionError[]>>({});
  const [history, setHistory] = React.useState<{ subsystem: string; status: Status; checked_at: string; detail: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const runCheck = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('health', { body: { action: 'check' } });
      if (error) throw error;
      setHealth(data as HealthResponse);
      setLastError(null);
    } catch (e) {
      setLastError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('health', { body: { action: 'logs' } });
      if (error) throw error;
      const d = data as { logs: Record<string, FunctionError[]>; history: typeof history };
      setLogs(d.logs ?? {});
      setHistory(d.history ?? []);
    } catch {
      // not admin or function unavailable
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;
    runCheck();
    loadLogs();
  }, [isAdmin, runCheck, loadLogs]);

  React.useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    const id = setInterval(() => { runCheck(); loadLogs(); }, 30_000);
    return () => clearInterval(id);
  }, [isAdmin, autoRefresh, runCheck, loadLogs]);

  const resetAlerts = async () => {
    try {
      await supabase.functions.invoke('health', { body: { action: 'reset' } });
      toast({ title: 'Alert counters reset', description: 'All subsystems back to 0 consecutive failures.' });
      loadLogs();
    } catch (e) {
      toast({ title: 'Reset failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TestModeBanner />
      <Header onNavigate={(id) => navigate(`/#${id}`)} onStart={() => navigate('/')} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">{children}</main>
      <Footer />
    </div>
  );

  if (authLoading || flagsLoading) {
    return shell(<div className="flex items-center justify-center py-32 text-slate-400"><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…</div>);
  }
  if (!user) {
    return shell(
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <Lock className="h-10 w-10 text-amber-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Admin sign-in required</h1>
        <Button onClick={() => navigate('/')} className="mt-6 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold"><ArrowLeft className="h-4 w-4 mr-2" /> Back to site</Button>
      </div>,
    );
  }
  if (!isAdmin) {
    return shell(
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8">
        <div className="flex items-center gap-3 text-rose-300"><ShieldAlert className="h-6 w-6" /><h1 className="text-xl font-bold">Access denied</h1></div>
        <p className="mt-3 text-slate-300">Your account ({user.email}) is not in the ADMIN_EMAILS allowlist.</p>
      </div>,
    );
  }

  const overall = health?.overall;

  return shell(
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate('/admin')} className="text-sm text-slate-400 hover:text-amber-300 flex items-center gap-2 mb-3">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Activity className="h-7 w-7 text-emerald-400" /> System Health
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Auto-refreshing every 30s · Alert email sent to ADMIN_EMAILS after 3 consecutive failures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAutoRefresh((v) => !v)} className="border-white/15 text-slate-200 hover:bg-white/5">
            {autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          </Button>
          <Button onClick={() => { runCheck(); loadLogs(); }} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Check now
          </Button>
          <Button variant="outline" onClick={resetAlerts} className="border-white/15 text-slate-200 hover:bg-white/5">Reset alerts</Button>
        </div>
      </div>

      {lastError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
          <strong>Probe error:</strong> {lastError}
        </div>
      )}

      {/* Overall status */}
      <div className={`rounded-2xl border p-6 ${overall === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5' : overall === 'degraded' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {overall === 'ok' && <CheckCircle2 className="h-7 w-7 text-emerald-400" />}
            {overall === 'degraded' && <AlertTriangle className="h-7 w-7 text-amber-400" />}
            {overall === 'down' && <XCircle className="h-7 w-7 text-rose-400" />}
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Overall</div>
              <div className="text-2xl font-bold capitalize">{overall ?? 'pending…'}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Last checked {health ? new Date(health.checked_at).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      {/* Subsystem grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUBSYSTEMS.map(({ key, label, icon: Icon }) => {
          const sub = health?.subsystems?.[key];
          const fails = health?.alerts?.[key]?.consecutive_failures ?? 0;
          const dotColor = sub?.status === 'ok' ? 'bg-emerald-400' : sub?.status === 'degraded' ? 'bg-amber-400' : sub?.status === 'down' ? 'bg-rose-400' : 'bg-slate-600';
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${dotColor} ${sub?.status === 'ok' ? 'animate-pulse' : ''}`} />
                  <Icon className="h-5 w-5 text-slate-300" />
                  <div className="font-semibold">{label}</div>
                </div>
                <StatusPill status={sub?.status} />
              </div>
              <div className="mt-3 text-sm text-slate-400">{sub?.detail ?? 'Awaiting first probe…'}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Latency: {sub?.latency_ms ?? '—'} ms</span>
                <span className={fails >= 3 ? 'text-rose-300' : fails > 0 ? 'text-amber-300' : ''}>
                  Consecutive failures: {fails}{fails >= 3 ? ' · ALERTED' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent history */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3"><Activity className="h-5 w-5 text-emerald-400" /> Recent probes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="text-left py-2">Time</th><th className="text-left">Subsystem</th><th className="text-left">Status</th><th className="text-left">Detail</th></tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map((h, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-2 text-slate-400">{new Date(h.checked_at).toLocaleTimeString()}</td>
                  <td className="font-mono text-slate-300">{h.subsystem}</td>
                  <td><StatusPill status={h.status} /></td>
                  <td className="text-slate-400 truncate max-w-xs">{h.detail}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No probes recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs viewer */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><ScrollText className="h-5 w-5 text-amber-300" /> Last 10 errors per edge function</h2>
        {Object.keys(logs).length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">No errors logged. All systems quiet.</div>
        ) : (
          <div className="space-y-5">
            {Object.entries(logs).map(([fn, entries]) => (
              <div key={fn}>
                <div className="font-mono text-sm text-slate-200 mb-2">{fn} <span className="text-slate-500">({entries.length})</span></div>
                <div className="space-y-2">
                  {entries.map((e) => (
                    <div key={e.id} className="rounded-lg border border-white/5 bg-black/30 p-3 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{new Date(e.occurred_at).toLocaleString()}</span>
                        <Badge className={e.level === 'error' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : e.level === 'warn' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'}>{e.level}</Badge>
                      </div>
                      <div className="mt-1 text-slate-200 whitespace-pre-wrap break-all">{e.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
  );
};

export default AdminHealth;
