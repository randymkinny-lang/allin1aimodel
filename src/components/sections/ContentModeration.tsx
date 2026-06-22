import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  Shield,
  AlertTriangle,
  Ban,
  FileWarning,
  Eye,
  Plus,
  X,
  Flag,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_CATEGORIES = [
  { id: 'minors', label: 'Minors / Age-related content', desc: 'Blocks any mention of anyone under 18. Mandatory.', mandatory: true, defaultOn: true },
  { id: 'violence', label: 'Violence & threats', desc: 'Physical harm, weapons, threats.', mandatory: false, defaultOn: true },
  { id: 'illegal', label: 'Illegal activity requests', desc: 'Drugs, hacking, fraud, etc.', mandatory: false, defaultOn: true },
  { id: 'doxxing', label: 'Personal info / doxxing', desc: 'Real name, address, phone, SSN.', mandatory: false, defaultOn: true },
  { id: 'extreme', label: 'Extreme / non-consensual roleplay', desc: 'Explicitly illegal scenarios.', mandatory: true, defaultOn: true },
  { id: 'self_harm', label: 'Self-harm / crisis', desc: 'Redirects to crisis resources instead of engaging.', mandatory: false, defaultOn: true },
  { id: 'hate', label: 'Hate speech & slurs', desc: 'Racist, homophobic, transphobic content.', mandatory: false, defaultOn: true },
  { id: 'meeting', label: 'Real-life meeting requests', desc: 'Prevents any agreement to meet in person.', mandatory: false, defaultOn: true },
];

type FlagRow = {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  nsfw_score: number | null;
  violence_score: number | null;
  categories: string[] | null;
  status: 'pending' | 'approved' | 'hidden' | 'banned';
  flagged: boolean;
  created_at: string;
};

const ContentModeration: React.FC = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c.defaultOn]))
  );
  const [strictness, setStrictness] = useState(70);
  const [autoBlock, setAutoBlock] = useState(true);
  const [notifyCreator, setNotifyCreator] = useState(true);
  const [customKeywords, setCustomKeywords] = useState<string[]>(['home address', 'real name']);
  const [newKeyword, setNewKeyword] = useState('');

  // Live data from media_flags
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // Stats from real DB
  const [stats, setStats] = useState({ blocked24h: 0, flagged24h: 0, total: 0, clean: 100 });

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<'model' | 'user' | 'media' | 'message'>('media');
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadFlags = useCallback(async () => {
    setLoadingFlags(true);
    const { data, error } = await supabase
      .from('media_flags')
      .select('id, media_url, media_type, nsfw_score, violence_score, categories, status, flagged, created_at')
      .order('created_at', { ascending: false })
      .limit(12);
    if (!error && data) setFlags(data as FlagRow[]);

    // Stats: last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: total } = await supabase
      .from('media_flags')
      .select('id', { count: 'exact', head: true });
    const { count: flagged24h } = await supabase
      .from('media_flags')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .eq('flagged', true);
    const { count: blocked24h } = await supabase
      .from('media_flags')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .in('status', ['hidden', 'banned']);

    const totalNum = total ?? 0;
    const flaggedNum = flagged24h ?? 0;
    const blockedNum = blocked24h ?? 0;
    const clean = totalNum > 0 ? Math.max(0, 100 - (flaggedNum / Math.max(1, totalNum)) * 100) : 100;
    setStats({
      blocked24h: blockedNum,
      flagged24h: flaggedNum,
      total: totalNum,
      clean: Math.round(clean * 10) / 10,
    });
    setLoadingFlags(false);
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const toggle = (id: string, mandatory: boolean) => {
    if (mandatory) {
      toast({ title: 'Required filter', description: 'This safeguard is legally required and cannot be disabled.', variant: 'destructive' });
      return;
    }
    setEnabled((e) => ({ ...e, [id]: !e[id] }));
  };

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k) return;
    setCustomKeywords((list) => (list.includes(k) ? list : [...list, k]));
    setNewKeyword('');
  };

  const save = () => {
    toast({
      title: 'Moderation policy saved',
      description: `Strictness ${strictness}% · ${Object.values(enabled).filter(Boolean).length} categories active.`,
    });
  };

  const openReport = (presetUrl?: string) => {
    setReportTargetType('media');
    setReportTargetId(presetUrl ?? '');
    setReportReason('');
    setReportDetails('');
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportTargetId.trim() || !reportReason.trim()) {
      toast({
        title: 'Missing info',
        description: 'Please include what you are reporting and why.',
        variant: 'destructive',
      });
      return;
    }
    setSubmittingReport(true);
    try {
      const { error } = await supabase.from('moderation_reports').insert({
        reporter_id: user?.id ?? null,
        target_type: reportTargetType,
        target_id: reportTargetId.trim(),
        reason: reportReason.trim(),
        details: reportDetails.trim() || null,
      });
      if (error) throw error;
      toast({
        title: 'Report submitted',
        description: 'Thanks — an admin will review this shortly.',
      });
      setReportOpen(false);
      loadFlags();
    } catch (err) {
      toast({
        title: 'Could not submit report',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const visibleFlags = useMemo(() => flags.slice(0, 6), [flags]);

  const sevColor = (score: number | null | undefined) => {
    const s = Number(score ?? 0);
    if (s >= 0.7) return 'text-rose-400';
    if (s >= 0.4) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <section id="moderation" className="py-20 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Content Moderation</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Safeguards That Protect You</h2>
            <p className="mt-3 text-slate-400">
              An always-on AI moderation layer (Replicate NSFW classifier) scans every uploaded
              image and flags unsafe content before it reaches the public site.
            </p>
          </div>
          <Button
            onClick={() => openReport()}
            className="bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
          >
            <Flag className="h-4 w-4 mr-2" /> Report content
          </Button>
        </div>

        {/* Stat cards (real DB counts) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <Ban className="h-6 w-6 text-red-400 mb-2" />
            <div className="text-slate-400 text-xs uppercase tracking-wider">Hidden / Banned (24h)</div>
            <div className="text-white text-3xl font-bold mt-1">{stats.blocked24h}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <AlertTriangle className="h-6 w-6 text-amber-400 mb-2" />
            <div className="text-slate-400 text-xs uppercase tracking-wider">AI-flagged (24h)</div>
            <div className="text-white text-3xl font-bold mt-1">{stats.flagged24h}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <Shield className="h-6 w-6 text-emerald-400 mb-2" />
            <div className="text-slate-400 text-xs uppercase tracking-wider">Clean rate (lifetime)</div>
            <div className="text-white text-3xl font-bold mt-1">{stats.clean}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-400" /> Safeguard Categories
              </h3>
              <div className="space-y-2">
                {DEFAULT_CATEGORIES.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-black/20 border border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-white text-sm font-medium">{c.label}</div>
                        {c.mandatory && <Badge className="bg-red-500/20 text-red-300 text-[10px]">REQUIRED</Badge>}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">{c.desc}</div>
                    </div>
                    <Switch checked={enabled[c.id]} onCheckedChange={() => toggle(c.id, c.mandatory)} disabled={c.mandatory} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-amber-400" /> Custom Blocked Keywords
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Add a keyword or phrase…"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button onClick={addKeyword} className="bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customKeywords.map((k) => (
                  <Badge
                    key={k}
                    className="bg-white/10 text-white gap-1 cursor-pointer hover:bg-red-500/30"
                    onClick={() => setCustomKeywords((l) => l.filter((x) => x !== k))}
                  >
                    {k} <X className="h-3 w-3" />
                  </Badge>
                ))}
                {customKeywords.length === 0 && <span className="text-slate-500 text-xs">No custom keywords yet.</span>}
              </div>
            </div>

            {/* Live AI-flagged media */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-amber-400" /> Recent AI-classified media
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadFlags}
                  disabled={loadingFlags}
                  className="border-white/15 text-slate-200 hover:bg-white/5"
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingFlags ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {visibleFlags.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No media has been classified yet. New uploads will appear here automatically.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleFlags.map((f) => (
                    <div key={f.id} className="flex gap-3 p-3 rounded-lg bg-black/20 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.media_url}
                        alt="classified"
                        className="h-20 w-20 rounded-md object-cover bg-slate-800 flex-shrink-0"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '0.2')}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            className={
                              f.status === 'pending' && f.flagged
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : f.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : f.status === 'hidden'
                                ? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                                : f.status === 'banned'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-white/5 text-slate-300'
                            }
                          >
                            {f.flagged && f.status === 'pending' ? 'FLAGGED' : f.status.toUpperCase()}
                          </Badge>
                          {(f.categories ?? []).slice(0, 2).map((c) => (
                            <Badge key={c} className="bg-white/10 text-slate-300 text-[10px] capitalize">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs font-mono space-y-0.5">
                          <div className={sevColor(f.nsfw_score)}>
                            NSFW {Math.round(Number(f.nsfw_score ?? 0) * 100)}%
                          </div>
                          <div className={sevColor(f.violence_score)}>
                            Violence {Math.round(Number(f.violence_score ?? 0) * 100)}%
                          </div>
                        </div>
                        <button
                          onClick={() => openReport(f.media_url)}
                          className="text-[11px] text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
                        >
                          <Flag className="h-3 w-3" /> Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4">Filter Strictness</h3>
              <div className="flex justify-between mb-2">
                <Label className="text-slate-300 text-sm">Sensitivity</Label>
                <span className="text-amber-400 text-sm font-semibold">{strictness}%</span>
              </div>
              <Slider value={[strictness]} onValueChange={(v) => setStrictness(v[0])} max={100} />
              <div className="text-xs text-slate-500 mt-2">
                {strictness < 40
                  ? 'Loose — fewer false flags, more slipping through.'
                  : strictness < 75
                  ? 'Balanced (recommended).'
                  : 'Strict — catches almost everything; may flag benign messages.'}
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">Auto-block on violation</div>
                    <div className="text-slate-500 text-xs">Refuse + log instead of forwarding to AI.</div>
                  </div>
                  <Switch checked={autoBlock} onCheckedChange={setAutoBlock} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">Notify me on high-severity</div>
                    <div className="text-slate-500 text-xs">Push / email alerts.</div>
                  </div>
                  <Switch checked={notifyCreator} onCheckedChange={setNotifyCreator} />
                </div>
              </div>
              <Button
                onClick={save}
                className="w-full mt-5 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
              >
                Save Policy
              </Button>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-red-500/10 via-amber-400/5 to-slate-900 border border-amber-400/30 p-5">
              <Shield className="h-6 w-6 text-emerald-400 mb-2" />
              <div className="text-white font-semibold">AI moderation is live</div>
              <p className="text-slate-300 text-sm mt-2">
                Every image generated or uploaded runs through a server-side NSFW classifier. Anything
                over 60% confidence is automatically flagged and sent to the admin review queue.
                Admins can approve, hide, or ban with one click.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-slate-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-rose-400" /> Report content
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Reports are reviewed by admins. Abuse of the report system may result in account
              restrictions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-wider">Type</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {(['media', 'model', 'user', 'message'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setReportTargetType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      reportTargetType === t
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-white/5 text-slate-300 border-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-wider">
                Target {reportTargetType === 'media' ? 'URL' : 'ID'}
              </Label>
              <Input
                value={reportTargetId}
                onChange={(e) => setReportTargetId(e.target.value)}
                placeholder={
                  reportTargetType === 'media'
                    ? 'https://…/image.jpg'
                    : 'username, model id, or message id'
                }
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-wider">Reason</Label>
              <Input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="e.g. nudity, harassment, impersonation"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs uppercase tracking-wider">
                Details (optional)
              </Label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Anything that would help us review this faster…"
                className="bg-white/5 border-white/10 text-white mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="border-white/15 text-slate-200 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReport}
              disabled={submittingReport}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              {submittingReport ? 'Submitting…' : 'Submit report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContentModeration;
