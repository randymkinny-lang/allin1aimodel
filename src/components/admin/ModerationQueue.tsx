import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck,
  ShieldAlert,
  Eye,
  Ban,
  CheckCircle2,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
  FileWarning,
} from 'lucide-react';

type MediaFlag = {
  id: string;
  model_id: string | null;
  owner_id: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  classifier: string | null;
  nsfw_score: number | null;
  violence_score: number | null;
  flagged: boolean;
  categories: string[] | null;
  status: 'pending' | 'approved' | 'hidden' | 'banned';
  created_at: string;
  reviewed_at: string | null;
};

type Report = {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    hidden: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    banned: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dismissed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return <Badge className={map[status] ?? 'bg-white/5 text-slate-300 border-white/10'}>{status.toUpperCase()}</Badge>;
};

const ScorePill: React.FC<{ label: string; score: number | null | undefined }> = ({ label, score }) => {
  const s = Number(score ?? 0);
  const danger = s >= 0.6;
  const warn = s >= 0.3;
  const cls = danger
    ? 'bg-rose-500/15 text-rose-300'
    : warn
    ? 'bg-amber-500/15 text-amber-300'
    : 'bg-emerald-500/10 text-emerald-300';
  return (
    <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${cls}`}>
      {label} {(s * 100).toFixed(0)}%
    </span>
  );
};

const ModerationQueue: React.FC = () => {
  const { toast } = useToast();
  const [flags, setFlags] = React.useState<MediaFlag[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<'flagged' | 'all' | 'reports'>('flagged');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { action: 'queue' },
      });
      if (error) throw error;
      setFlags((data?.flags ?? []) as MediaFlag[]);
      setReports((data?.reports ?? []) as Report[]);
    } catch (err) {
      toast({
        title: 'Could not load moderation queue',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const review = async (flag: MediaFlag, decision: 'approve' | 'hide' | 'ban') => {
    setBusyId(flag.id);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { action: 'review', flag_id: flag.id, decision },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title:
          decision === 'approve'
            ? 'Media approved'
            : decision === 'hide'
            ? 'Media hidden'
            : 'Model banned',
        description:
          decision === 'ban'
            ? 'Linked model has been removed from public view.'
            : decision === 'hide'
            ? 'Media is now hidden from the public site.'
            : 'Media is back in the public site.',
      });
      await load();
    } catch (err) {
      toast({
        title: 'Action failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-media', {
        body: { action: 'resolve_report', report_id: id, status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: status === 'resolved' ? 'Report resolved' : 'Report dismissed',
      });
      await load();
    } catch (err) {
      toast({
        title: 'Action failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const visibleFlags = React.useMemo(() => {
    if (tab === 'flagged') return flags.filter((f) => f.flagged && f.status === 'pending');
    if (tab === 'all') return flags;
    return [];
  }, [flags, tab]);

  const counts = React.useMemo(() => {
    const pending = flags.filter((f) => f.flagged && f.status === 'pending').length;
    const openReports = reports.filter((r) => r.status === 'open').length;
    return { pending, openReports, total: flags.length };
  }, [flags, reports]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-300" />
            Moderation Queue
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            AI-classified uploads and user reports. Approve, hide, or ban with one click — bans
            propagate to the linked model and remove it from the public site.
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

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'flagged'} onClick={() => setTab('flagged')}>
          <AlertTriangle className="h-4 w-4 mr-1.5 inline" /> Flagged
          <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-rose-500/20 text-rose-300 text-xs">
            {counts.pending}
          </span>
        </TabButton>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>
          <ImageIcon className="h-4 w-4 mr-1.5 inline" /> All media
          <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-white/10 text-slate-300 text-xs">
            {counts.total}
          </span>
        </TabButton>
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>
          <FileWarning className="h-4 w-4 mr-1.5 inline" /> User reports
          <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
            {counts.openReports}
          </span>
        </TabButton>
      </div>

      {/* Body */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…
        </div>
      ) : tab === 'reports' ? (
        <ReportsList
          reports={reports}
          busyId={busyId}
          onResolve={resolveReport}
        />
      ) : visibleFlags.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
          <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <div className="text-slate-200 font-semibold">All clear</div>
          <div className="text-sm text-slate-500 mt-1">
            {tab === 'flagged'
              ? 'No flagged media awaiting review.'
              : 'No media has been classified yet.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleFlags.map((f) => (
            <div
              key={f.id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-white/10 bg-black/20"
            >
              <div className="flex-shrink-0">
                {f.media_type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.media_url}
                    alt="flagged"
                    className="h-28 w-28 sm:h-32 sm:w-32 rounded-lg object-cover bg-slate-800 border border-white/10"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-xs">
                    VIDEO
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={f.status} />
                  {f.flagged && (
                    <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">
                      AI-FLAGGED
                    </Badge>
                  )}
                  {(f.categories ?? []).map((c) => (
                    <Badge key={c} className="bg-white/10 text-slate-300 capitalize">
                      {c}
                    </Badge>
                  ))}
                  <span className="text-xs text-slate-500">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <ScorePill label="NSFW" score={f.nsfw_score} />
                  <ScorePill label="Violence" score={f.violence_score} />
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                    {f.classifier ?? 'unclassified'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 truncate">
                  <span className="text-slate-500">URL:</span>{' '}
                  <a
                    href={f.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:underline"
                  >
                    {f.media_url}
                  </a>
                </div>
                <div className="text-xs text-slate-500">
                  Model: <span className="font-mono text-slate-300">{f.model_id ?? '—'}</span>{' '}
                  · Owner: <span className="font-mono text-slate-300">{f.owner_id ?? '—'}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button
                    size="sm"
                    disabled={busyId === f.id || f.status === 'approved'}
                    onClick={() => review(f, 'approve')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === f.id || f.status === 'hidden'}
                    onClick={() => review(f, 'hide')}
                    variant="outline"
                    className="border-white/15 text-slate-200 hover:bg-white/5"
                  >
                    <EyeOff className="h-4 w-4 mr-1.5" /> Hide
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === f.id || f.status === 'banned' || !f.model_id}
                    onClick={() => {
                      if (
                        confirm(
                          'Ban this model? It will be removed from the public site and marked banned. This action is reversible from the database.',
                        )
                      ) {
                        review(f, 'ban');
                      }
                    }}
                    variant="destructive"
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    <Ban className="h-4 w-4 mr-1.5" /> Ban model
                  </Button>
                  <a
                    href={f.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-amber-300 inline-flex items-center gap-1 ml-2"
                  >
                    <Eye className="h-3.5 w-3.5" /> Open
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
      active
        ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
        : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5'
    }`}
  >
    {children}
  </button>
);

const ReportsList: React.FC<{
  reports: Report[];
  busyId: string | null;
  onResolve: (id: string, status: 'resolved' | 'dismissed') => void;
}> = ({ reports, busyId, onResolve }) => {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
        <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <div className="text-slate-200 font-semibold">No user reports</div>
        <div className="text-sm text-slate-500 mt-1">
          When users report content, it shows up here.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div
          key={r.id}
          className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={r.status} />
            <Badge className="bg-white/10 text-slate-300 capitalize">{r.target_type}</Badge>
            <span className="text-xs text-slate-500 font-mono truncate">
              {r.target_id}
            </span>
            <span className="ml-auto text-xs text-slate-500">
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-slate-200">
            <span className="font-semibold">Reason:</span> {r.reason}
          </div>
          {r.details && (
            <div className="text-sm text-slate-400 italic">"{r.details}"</div>
          )}
          {r.status === 'open' && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={busyId === r.id}
                onClick={() => onResolve(r.id, 'resolved')}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark resolved
              </Button>
              <Button
                size="sm"
                disabled={busyId === r.id}
                variant="outline"
                onClick={() => onResolve(r.id, 'dismissed')}
                className="border-white/15 text-slate-200 hover:bg-white/5"
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ModerationQueue;
