import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  CalendarDays, Upload, Image as ImageIcon, Video, Send, Trash2, Copy, Clock, Plus,
  Instagram, Twitter, Facebook, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Youtube,
} from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import UpgradePrompt from '@/components/UpgradePrompt';

// --- Types -----------------------------------------------------------------
type MediaItem = { url: string; type: 'image' | 'video'; name: string };
type PerPlatformResult = { ok: boolean; id?: string; error?: string; at?: string };
type PostStatus = 'queued' | 'publishing' | 'published' | 'partial' | 'failed';

interface QueuedPost {
  id: string;
  caption: string;
  media: MediaItem[];
  platforms: string[];
  scheduled_at: string;
  status: PostStatus;
  attempts: number;
  last_error: string | null;
  publish_results: Record<string, PerPlatformResult>;
}

const ALL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-400' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-cyan-400' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-blue-400' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-400' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'onlyfans', name: 'OnlyFans', icon: ImageIcon, color: 'text-sky-400' },
];

const TEMPLATES = [
  { id: 't1', name: 'Morning Selfie', caption: 'Good morning, loves — what are we up to today?' },
  { id: 't2', name: 'Workout Post', caption: 'Sweaty but cute — join me on my VIP channel for the full routine.' },
  { id: 't3', name: 'Weekend Tease', caption: 'Friday night vibes... something special just dropped on my exclusive.' },
];

// --- Status pill -----------------------------------------------------------
const StatusPill: React.FC<{ status: PostStatus }> = ({ status }) => {
  const map: Record<PostStatus, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
    queued:     { label: 'Queued',     cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',   Icon: Clock },
    publishing: { label: 'Publishing', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   Icon: Loader2 },
    published:  { label: 'Published',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: CheckCircle2 },
    partial:    { label: 'Partial',    cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30', Icon: AlertTriangle },
    failed:     { label: 'Failed',     cls: 'bg-red-500/15 text-red-300 border-red-500/30',         Icon: XCircle },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}>
      <Icon className={`h-3 w-3 ${status === 'publishing' ? 'animate-spin' : ''}`} /> {label}
    </span>
  );
};

const ContentScheduler: React.FC = () => {
  const { isActive, tier } = useSubscription();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Composer state
  const [stagedFiles, setStagedFiles] = useState<MediaItem[]>([]);
  const [stagedRawFiles, setStagedRawFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram', 'twitter']);
  const [when, setWhen] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);

  // Queue from DB
  const [queue, setQueue] = useState<QueuedPost[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Bulk edit
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCaption, setBulkCaption] = useState('');

  // --- Load queue from Supabase ------------------------------------------
  const loadQueue = useCallback(async () => {
    if (!user) { setQueue([]); return; }
    setLoadingQueue(true);
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })
      .limit(100);
    setLoadingQueue(false);
    if (error) {
      console.warn('[scheduler] load failed:', error.message);
      return;
    }
    setQueue((data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      caption: (row.caption as string) || '',
      media: (row.media as MediaItem[]) || [],
      platforms: (row.platforms as string[]) || [],
      scheduled_at: row.scheduled_at as string,
      status: (row.status as PostStatus) || 'queued',
      attempts: (row.attempts as number) || 0,
      last_error: (row.last_error as string) || null,
      publish_results: (row.publish_results as Record<string, PerPlatformResult>) || {},
    })));
  }, [user]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Poll every 8s while there are in-flight posts so users see status flips
  // without a manual refresh. We use polling instead of Supabase Realtime
  // here on purpose — Realtime has a separate websocket decoder path that's
  // been flaky in this environment, and the queue is small so polling is
  // cheap. Hidden tabs skip the poll to avoid wasted requests.
  useEffect(() => {
    if (!user) return;
    const hasInFlight = queue.some((p) =>
      p.status === 'queued' && new Date(p.scheduled_at).getTime() <= Date.now()
      || p.status === 'publishing'
    );
    if (!hasInFlight) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadQueue();
    }, 8000);
    return () => clearInterval(id);
  }, [queue, user, loadQueue]);

  const calendarDays = useMemo(() => {
    const days: { date: Date; posts: QueuedPost[] }[] = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      days.push({ date: d, posts: queue.filter((p) => p.scheduled_at.slice(0, 10) === iso) });
    }
    return days;
  }, [queue]);

  if (!isActive) {
    return (
      <section id="scheduler" className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Content Scheduler</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Bulk Upload & Schedule</h2>
            <p className="mt-3 text-slate-400">Batch create posts and schedule them across every connected platform.</p>
          </div>
          <UpgradePrompt
            title="Scheduling unlocks with any paid plan"
            description="Bulk upload, drag-and-drop, calendar view, cross-platform scheduling, and reusable templates — all on Starter and up."
            requiredTierId="starter"
          />
        </div>
      </section>
    );
  }

  // --- File handling -----------------------------------------------------
  const onFilesChosen = (files: FileList | null) => {
    if (!files) return;
    const rawList = Array.from(files);
    const items: MediaItem[] = rawList.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
      name: f.name,
    }));
    setStagedFiles((s) => [...s, ...items]);
    setStagedRawFiles((s) => [...s, ...rawList]);
    toast({ title: `${items.length} file${items.length === 1 ? '' : 's'} added` });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFilesChosen(e.dataTransfer.files);
  };

  const togglePlatform = (id: string) => {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  // Upload staged files to the public scheduler-media bucket so the
  // edge function can hand a real, fetchable URL to Instagram / TikTok / etc.
  const uploadMediaToBucket = async (): Promise<MediaItem[]> => {
    if (!user) return [];
    const uploaded: MediaItem[] = [];
    for (let i = 0; i < stagedRawFiles.length; i++) {
      const raw = stagedRawFiles[i];
      const placeholder = stagedFiles[i];
      const ext = (raw.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('scheduler-media')
        .upload(path, raw, { contentType: raw.type || undefined, upsert: false });
      if (upErr) {
        throw new Error(`Upload failed for ${raw.name}: ${upErr.message}`);
      }
      const { data: pub } = supabase.storage.from('scheduler-media').getPublicUrl(path);
      uploaded.push({
        url: pub.publicUrl,
        type: placeholder?.type || (raw.type.startsWith('video') ? 'video' : 'image'),
        name: raw.name,
      });
    }
    return uploaded;
  };

  const schedulePost = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to schedule posts.', variant: 'destructive' });
      return;
    }
    if (stagedRawFiles.length === 0 || platforms.length === 0) {
      toast({ title: 'Missing info', description: 'Add media and at least one platform.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload media to public bucket
      const media = await uploadMediaToBucket();
      // 2. Insert row
      const { error } = await supabase.from('scheduled_posts').insert({
        user_id: user.id,
        caption,
        media,
        platforms,
        scheduled_at: new Date(when).toISOString(),
        status: 'queued',
      });
      if (error) throw new Error(error.message);

      // 3. Reset composer + reload
      setStagedFiles([]); setStagedRawFiles([]); setCaption('');
      await loadQueue();
      toast({
        title: 'Scheduled!',
        description: `Will auto-publish to ${platforms.length} platform(s) at ${new Date(when).toLocaleString()}. The cron job runs every minute.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Could not schedule', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const useTemplate = (t: typeof TEMPLATES[number]) => {
    setCaption(t.caption);
    toast({ title: `Template applied: ${t.name}` });
  };

  const removePost = async (id: string) => {
    setQueue((q) => q.filter((p) => p.id !== id));
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      loadQueue();
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const applyBulkCaption = async () => {
    if (!bulkCaption || selectedIds.length === 0) return;
    const { error } = await supabase
      .from('scheduled_posts')
      .update({ caption: bulkCaption })
      .in('id', selectedIds);
    if (error) {
      toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Updated ${selectedIds.length} post(s)` });
    setBulkCaption(''); setSelectedIds([]);
    loadQueue();
  };

  // Manual publish/retry — calls the edge function directly so the user
  // doesn't have to wait for the next 60s cron tick.
  const publishNow = async (post: QueuedPost) => {
    setRetryingId(post.id);
    try {
      const { data, error } = await supabase.functions.invoke('publish-scheduled-post', {
        body: { post_id: post.id },
      });
      if (error) throw new Error(error.message);
      const result = data?.result;
      if (result) {
        if (result.status === 'published') {
          toast({ title: 'Published!', description: `Posted to ${Object.keys(result.results || {}).length} platform(s).` });
        } else if (result.status === 'partial') {
          toast({ title: 'Partially published', description: 'Some platforms succeeded, some failed. See details.', variant: 'destructive' });
        } else {
          toast({ title: 'Publish failed', description: post.last_error || 'See per-platform errors below.', variant: 'destructive' });
        }
      }
      loadQueue();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Publish failed', description: msg, variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section id="scheduler" className="py-20 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Content Scheduler</div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Batch Create. Schedule. Auto-Publish.</h2>
          <p className="mt-3 text-slate-400">Drag files in, write captions, pick platforms & times. A background worker runs every minute and publishes each post to Instagram, TikTok, X, YouTube, and Facebook using your connected OAuth tokens.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Composer */}
          <div className="lg:col-span-2 space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="rounded-2xl bg-white/5 border-2 border-dashed border-white/15 hover:border-amber-400/40 transition p-8 text-center"
            >
              <Upload className="h-10 w-10 text-amber-400 mx-auto mb-3" />
              <div className="text-white font-semibold">Drag & drop photos/videos here</div>
              <div className="text-slate-400 text-sm mt-1">or</div>
              <Button onClick={() => inputRef.current?.click()} className="mt-3 bg-white/10 hover:bg-white/20 text-white">
                <Plus className="h-4 w-4 mr-2" /> Browse Files
              </Button>
              <input
                ref={inputRef} type="file" multiple accept="image/*,video/*"
                className="hidden" onChange={(e) => onFilesChosen(e.target.files)}
              />
              {stagedFiles.length > 0 && (
                <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {stagedFiles.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-black/30">
                      {f.type === 'image' ? (
                        <img src={f.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white"><Video className="h-6 w-6" /></div>
                      )}
                      <button
                        onClick={() => {
                          setStagedFiles(s => s.filter((_, j) => j !== i));
                          setStagedRawFiles(s => s.filter((_, j) => j !== i));
                        }}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 rounded-full p-1">
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Caption</Label>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption that'll be used across platforms…"
                  className="bg-white/5 border-white/10 text-white mt-2 min-h-[90px]" />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-slate-500 mr-1">Templates:</span>
                  {TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => useTemplate(t)}
                      className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:border-amber-400/40">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Platforms</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_PLATFORMS.map((p) => {
                    const active = platforms.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlatform(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          active ? 'bg-amber-400/15 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}>
                        <p.icon className="h-3.5 w-3.5" /> {p.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Connect each platform's OAuth from the Unified Inbox so the publisher has access tokens. Without tokens the post will land in "failed" with a clear error.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-sm">When to post</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-2" />
                </div>
                <div className="flex items-end">
                  <Button onClick={schedulePost} disabled={submitting} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {submitting ? 'Uploading…' : 'Schedule Post'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {stagedFiles.length > 0 && platforms.length > 0 && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h3 className="text-white font-semibold mb-3">Platform Previews</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {platforms.slice(0, 4).map((pid) => {
                    const p = ALL_PLATFORMS.find((x) => x.id === pid)!;
                    return (
                      <div key={pid} className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <div className={`flex items-center gap-2 text-xs font-semibold mb-2 ${p.color}`}>
                          <p.icon className="h-3.5 w-3.5" /> {p.name}
                        </div>
                        {stagedFiles[0] && stagedFiles[0].type === 'image' && (
                          <img src={stagedFiles[0].url} className="w-full aspect-square object-cover rounded" alt="" />
                        )}
                        <div className="text-slate-300 text-xs mt-2 line-clamp-3">{caption || 'Your caption preview…'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Queue list + bulk edit */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" /> Queue ({queue.length})
                  {loadingQueue && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </h3>
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Input value={bulkCaption} onChange={(e) => setBulkCaption(e.target.value)}
                      placeholder={`Bulk caption for ${selectedIds.length} selected`}
                      className="bg-white/5 border-white/10 text-white text-xs h-8 w-64" />
                    <Button onClick={applyBulkCaption} size="sm" className="bg-amber-400 text-slate-950 font-semibold h-8">
                      <Copy className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                {queue.map((p) => {
                  const due = new Date(p.scheduled_at).getTime() <= Date.now();
                  const canPublishNow = (p.status === 'queued' && due) || p.status === 'partial' || p.status === 'failed';
                  return (
                    <div key={p.id} className={`p-3 rounded-lg border transition ${
                      selectedIds.includes(p.id) ? 'bg-amber-400/10 border-amber-400/50' : 'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 accent-amber-400" />
                        <div className="h-12 w-12 rounded bg-black/40 overflow-hidden flex-shrink-0">
                          {p.media[0]?.type === 'image' ? (
                            <img src={p.media[0].url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Video className="h-4 w-4 text-white" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-white text-sm truncate flex-1">{p.caption || '(no caption)'}</div>
                            <StatusPill status={p.status} />
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                            <span>{new Date(p.scheduled_at).toLocaleString()}</span>
                            <span>·</span>
                            <div className="flex gap-1 flex-wrap">
                              {p.platforms.map((pl) => {
                                const r = p.publish_results[pl];
                                const cls = !r ? 'bg-slate-700 text-slate-300'
                                  : r.ok ? 'bg-emerald-700/60 text-emerald-100'
                                  : 'bg-red-700/60 text-red-100';
                                return (
                                  <Badge key={pl} variant="secondary" className={`text-[10px] h-4 px-1 ${cls}`} title={r?.error || (r?.ok ? `Posted (${r.id || 'ok'})` : 'Pending')}>
                                    {pl}{r?.ok ? ' ✓' : (r ? ' ✗' : '')}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {canPublishNow && (
                            <button
                              onClick={() => publishNow(p)}
                              disabled={retryingId === p.id}
                              title={p.status === 'queued' ? 'Publish now' : 'Retry'}
                              className="text-slate-400 hover:text-amber-400 p-1 disabled:opacity-50">
                              {retryingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </button>
                          )}
                          <button onClick={() => removePost(p.id)} className="text-slate-500 hover:text-red-400 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {(p.status === 'failed' || p.status === 'partial') && p.last_error && (
                        <div className="mt-2 ml-8 text-[11px] text-red-300/80 bg-red-500/5 border border-red-500/20 rounded px-2 py-1 break-words">
                          {p.last_error}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!loadingQueue && queue.length === 0 && (
                  <div className="text-slate-500 text-sm text-center py-8">
                    No posts scheduled yet. Drop in some media above to schedule your first post.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-400" /> Next 14 Days</h3>
              <div className="space-y-1">
                {calendarDays.map(({ date, posts }) => (
                  <div key={date.toISOString()} className={`flex items-center gap-3 p-2 rounded ${posts.length ? 'bg-amber-400/5' : ''}`}>
                    <div className="w-16 text-xs">
                      <div className="text-slate-400">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-white font-semibold">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {posts.length === 0 && <span className="text-slate-600 text-xs">—</span>}
                      {posts.map((p) => (
                        <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                          {new Date(p.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {p.platforms.length}p
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 to-amber-400/10 border border-amber-400/30 p-5">
              <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider">How publishing works</div>
              <div className="text-white font-semibold mt-1">Real platform APIs, every minute</div>
              <p className="text-slate-300 text-sm mt-2">
                A cron job runs <span className="text-amber-300">every minute</span> and publishes any post whose time has come. Instagram uses Graph API container + publish, TikTok uses /v2/post/publish/inbox, X uses v2 /tweets with v1.1 media upload, and YouTube uses /upload/youtube/v3/videos.
              </p>
              <p className="text-slate-300 text-sm mt-2">
                On {tier.name} you can batch up to {tier.generations.toLocaleString()} generations per month and schedule them all from one queue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentScheduler;
