import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  RefreshCw,
  Inbox,
  CheckCircle2,
  Archive,
  Mail,
  Globe,
  Monitor,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackRow {
  id: string;
  email: string | null;
  message: string;
  user_id: string | null;
  user_agent: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  new: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  reviewed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  archived: 'bg-white/5 text-slate-400 border-white/10',
};

const isTransientFetchError = (err: unknown) => {
  const msg = (err as Error)?.message ?? '';
  return /failed to fetch|networkerror|load failed|fetch failed/i.test(msg);
};

const BetaFeedbackInbox: React.FC = () => {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!session?.access_token) {
      setErrorMsg('Sign in required to load feedback.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-flags', {
        body: { action: 'list_feedback' },
      });
      if (error) throw error;
      setRows(((data as { feedback?: FeedbackRow[] })?.feedback) ?? []);
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      setErrorMsg(msg);
      if (!isTransientFetchError(err)) {
        toast({
          title: 'Failed to load feedback',
          description: msg,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, authLoading, session]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.functions.invoke('admin-flags', {
        body: { action: 'update_feedback', id, status },
      });
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      toast({
        title: 'Update failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const newCount = rows.filter((r) => r.status === 'new').length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-indigo-400" />
            Beta Tester Feedback
            {newCount > 0 && (
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                {newCount} new
              </Badge>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reports submitted via the purple banner that non-admin testers see when Test Mode is on.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading || authLoading}
          className="border-white/15 text-slate-200 hover:bg-white/5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-200">Couldn&apos;t load feedback</div>
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
        <div className="py-12 text-center text-slate-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading feedback…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No feedback yet. Once a tester submits a report, it will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <Badge
                    className={
                      statusStyles[r.status] ?? statusStyles.new
                    }
                  >
                    {r.status.toUpperCase()}
                  </Badge>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  {r.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a
                        href={`mailto:${r.email}`}
                        className="text-slate-300 hover:text-indigo-300 underline-offset-2 hover:underline"
                      >
                        {r.email}
                      </a>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingId === r.id || r.status === 'reviewed'}
                    onClick={() => updateStatus(r.id, 'reviewed')}
                    className="h-7 text-xs text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingId === r.id || r.status === 'resolved'}
                    onClick={() => updateStatus(r.id, 'resolved')}
                    className="h-7 text-xs text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingId === r.id || r.status === 'archived'}
                    onClick={() => updateStatus(r.id, 'archived')}
                    className="h-7 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  >
                    <Archive className="h-3 w-3 mr-1" /> Archive
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {r.message}
              </p>

              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                {r.page_url && (
                  <span className="flex items-center gap-1 truncate max-w-full">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.page_url}</span>
                  </span>
                )}
                {r.user_agent && (
                  <span className="flex items-center gap-1 truncate max-w-full">
                    <Monitor className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.user_agent}</span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default BetaFeedbackInbox;
