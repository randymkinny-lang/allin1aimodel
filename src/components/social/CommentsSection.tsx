import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Flame,
  Heart,
  Loader2,
  MessageCircle,
  Reply,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';

interface CommentRow {
  id: string;
  model_id: string;
  user_id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
}

interface ProfileInfo {
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface CommentsSectionProps {
  modelId: string;
  onCountChange?: (count: number) => void;
  onRequireAuth?: () => void;
}

type SortMode = 'new' | 'top';

const PAGE_SIZE = 10;
const TOP_SORT_CAP = 500;
const REPLIES_COLLAPSED = 3;
const COMMENT_SELECT = 'id, model_id, user_id, body, created_at, parent_comment_id';

const fallbackHandle = (userId: string) => {
  const compact = (userId || '').replace(/-/g, '');
  return `user_${compact.slice(0, 6) || 'anon00'}`;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const CommentsSection: React.FC<CommentsSectionProps> = ({ modelId, onCountChange, onRequireAuth }) => {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortMode>('new');

  const [topLevel, setTopLevel] = useState<CommentRow[]>([]);
  const [fullTopList, setFullTopList] = useState<CommentRow[]>([]);
  const [repliesByParent, setRepliesByParent] = useState<Record<string, CommentRow[]>>({});
  const [totalTopLevel, setTotalTopLevel] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [pendingLike, setPendingLike] = useState<Record<string, boolean>>({});

  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});

  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [replyPosting, setReplyPosting] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Ensure the signed-in user has a profile row (lazy backfill since auth.users triggers aren't allowed)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Only call RPC if we don't already have the user's profile cached from a previous load
      if (profiles[user.id]) return;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, handle, display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProfiles((prev) => ({
          ...prev,
          [user.id]: {
            handle: (data as { handle: string | null }).handle,
            display_name: (data as { display_name: string | null }).display_name,
            avatar_url: (data as { avatar_url: string | null }).avatar_url,
          },
        }));
      } else {
        // No profile yet — create one
        await supabase.rpc('ensure_my_profile');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchProfilesFor = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !(id in profiles));
    if (missing.length === 0) return;
    const uniq = Array.from(new Set(missing));
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, handle, display_name, avatar_url')
      .in('user_id', uniq);
    if (error) {
      console.error('load profiles failed', error);
      return;
    }
    const next: Record<string, ProfileInfo> = {};
    for (const row of (data || []) as Array<{ user_id: string; handle: string | null; display_name: string | null; avatar_url: string | null }>) {
      next[row.user_id] = { handle: row.handle, display_name: row.display_name, avatar_url: row.avatar_url };
    }
    // Mark missing user_ids with empty profile so we don't re-fetch
    for (const id of uniq) {
      if (!next[id]) next[id] = { handle: null, display_name: null, avatar_url: null };
    }
    setProfiles((prev) => ({ ...prev, ...next }));
  }, [profiles]);

  const fetchRepliesForParents = useCallback(async (parentIds: string[]) => {
    if (parentIds.length === 0) return {} as Record<string, CommentRow[]>;
    const { data, error } = await supabase
      .from('model_comments')
      .select(COMMENT_SELECT)
      .eq('model_id', modelId)
      .is('deleted_at', null)
      .in('parent_comment_id', parentIds)
      .order('created_at', { ascending: true });
    if (error) { console.error('load replies failed', error); return {} as Record<string, CommentRow[]>; }
    const grouped: Record<string, CommentRow[]> = {};
    for (const row of (data || []) as CommentRow[]) {
      const pid = row.parent_comment_id as string;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(row);
    }
    return grouped;
  }, [modelId]);

  const fetchLikesFor = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', ids);
    if (error) { console.error('load likes failed', error); return; }
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const row of (data || []) as { comment_id: string; user_id: string }[]) {
      counts[row.comment_id] = (counts[row.comment_id] || 0) + 1;
      if (user && row.user_id === user.id) mine.add(row.comment_id);
    }
    setLikeCounts((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = counts[id] || 0;
      return next;
    });
    setMyLikes((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (mine.has(id)) next.add(id); else next.delete(id);
      }
      return next;
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setTopLevel([]);
      setFullTopList([]);
      setRepliesByParent({});

      const { count: allCount } = await supabase
        .from('model_comments')
        .select('id', { count: 'exact', head: true })
        .eq('model_id', modelId)
        .is('deleted_at', null);

      if (sort === 'new') {
        const { data: topData, count: topCount, error: topErr } = await supabase
          .from('model_comments')
          .select(COMMENT_SELECT, { count: 'exact' })
          .eq('model_id', modelId)
          .is('deleted_at', null)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (cancelled) return;
        if (topErr) {
          console.error('load comments failed', topErr);
          setTotalTopLevel(0); setTotalAll(0); onCountChange?.(0); setLoading(false); return;
        }
        const rows = (topData || []) as CommentRow[];
        const parentIds = rows.map((r) => r.id);
        const replies = await fetchRepliesForParents(parentIds);
        if (cancelled) return;

        const allReplies = Object.values(replies).flat();
        const allIds = [...parentIds, ...allReplies.map((r) => r.id)];
        await fetchLikesFor(allIds);
        await fetchProfilesFor([...rows.map((r) => r.user_id), ...allReplies.map((r) => r.user_id)]);
        if (cancelled) return;

        setTopLevel(rows);
        setRepliesByParent(replies);
        setTotalTopLevel(typeof topCount === 'number' ? topCount : rows.length);
        const tAll = typeof allCount === 'number' ? allCount : rows.length;
        setTotalAll(tAll);
        onCountChange?.(tAll);
        setLoading(false);
        return;
      }

      // sort === 'top'
      const { data: allTopData, error: allTopErr } = await supabase
        .from('model_comments')
        .select(COMMENT_SELECT)
        .eq('model_id', modelId)
        .is('deleted_at', null)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .limit(TOP_SORT_CAP);

      if (cancelled) return;
      if (allTopErr) {
        console.error('load comments (top) failed', allTopErr);
        setTotalTopLevel(0); setTotalAll(0); onCountChange?.(0); setLoading(false); return;
      }
      const allRows = (allTopData || []) as CommentRow[];
      const allIds = allRows.map((r) => r.id);

      const likeCountMap: Record<string, number> = {};
      const mine = new Set<string>();
      if (allIds.length > 0) {
        const { data: likeData, error: likeErr } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', allIds);
        if (likeErr) console.error('load top-sort likes failed', likeErr);
        else {
          for (const row of (likeData || []) as { comment_id: string; user_id: string }[]) {
            likeCountMap[row.comment_id] = (likeCountMap[row.comment_id] || 0) + 1;
            if (user && row.user_id === user.id) mine.add(row.comment_id);
          }
        }
      }

      const sorted = [...allRows].sort((a, b) => {
        const la = likeCountMap[a.id] || 0;
        const lb = likeCountMap[b.id] || 0;
        if (lb !== la) return lb - la;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const firstPage = sorted.slice(0, PAGE_SIZE);
      const parentIds = firstPage.map((r) => r.id);
      const replies = await fetchRepliesForParents(parentIds);
      if (cancelled) return;

      setLikeCounts((prev) => {
        const next = { ...prev };
        for (const id of allIds) next[id] = likeCountMap[id] || 0;
        return next;
      });
      setMyLikes((prev) => {
        const next = new Set(prev);
        for (const id of allIds) { if (mine.has(id)) next.add(id); else next.delete(id); }
        return next;
      });
      const allReplies = Object.values(replies).flat();
      const replyIds = allReplies.map((r) => r.id);
      await fetchLikesFor(replyIds);
      await fetchProfilesFor([...firstPage.map((r) => r.user_id), ...allReplies.map((r) => r.user_id)]);
      if (cancelled) return;

      setFullTopList(sorted);
      setTopLevel(firstPage);
      setRepliesByParent(replies);
      setTotalTopLevel(sorted.length);
      const tAll = typeof allCount === 'number' ? allCount : sorted.length;
      setTotalAll(tAll);
      onCountChange?.(tAll);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, sort, user?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    if (sort === 'new') {
      const from = topLevel.length;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('model_comments')
        .select(COMMENT_SELECT)
        .eq('model_id', modelId)
        .is('deleted_at', null)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) {
        toast({ title: 'Could not load more', description: error.message, variant: 'destructive' });
        setLoadingMore(false);
        return;
      }
      const newRows = (data || []) as CommentRow[];
      const newReplies = await fetchRepliesForParents(newRows.map((r) => r.id));
      const allReplies = Object.values(newReplies).flat();
      const newIds = [...newRows.map((r) => r.id), ...allReplies.map((r) => r.id)];
      await fetchLikesFor(newIds);
      await fetchProfilesFor([...newRows.map((r) => r.user_id), ...allReplies.map((r) => r.user_id)]);
      setTopLevel((prev) => [...prev, ...newRows]);
      setRepliesByParent((prev) => ({ ...prev, ...newReplies }));
    } else {
      const from = topLevel.length;
      const to = from + PAGE_SIZE;
      const newRows = fullTopList.slice(from, to);
      const newReplies = await fetchRepliesForParents(newRows.map((r) => r.id));
      const allReplies = Object.values(newReplies).flat();
      const replyIds = allReplies.map((r) => r.id);
      await fetchLikesFor(replyIds);
      await fetchProfilesFor([...newRows.map((r) => r.user_id), ...allReplies.map((r) => r.user_id)]);
      setTopLevel((prev) => [...prev, ...newRows]);
      setRepliesByParent((prev) => ({ ...prev, ...newReplies }));
    }

    setLoadingMore(false);
  }, [fetchLikesFor, fetchProfilesFor, fetchRepliesForParents, fullTopList, loadingMore, modelId, sort, topLevel.length]);

  const bumpCount = useCallback((delta: number) => {
    setTotalAll((t) => {
      const next = Math.max(0, t + delta);
      onCountChange?.(next);
      return next;
    });
  }, [onCountChange]);

  const handlePostTopLevel = useCallback(async () => {
    if (!user) { if (onRequireAuth) onRequireAuth(); else toast({ title: 'Sign in to comment' }); return; }
    const text = body.trim();
    if (!text) return;
    if (text.length > 2000) { toast({ title: 'Comment too long', description: 'Keep it under 2000 characters.', variant: 'destructive' }); return; }
    setPosting(true);
    const { data, error } = await supabase
      .from('model_comments')
      .insert({ model_id: modelId, user_id: user.id, body: text, parent_comment_id: null })
      .select(COMMENT_SELECT)
      .single();
    if (error) {
      toast({ title: 'Could not post', description: error.message, variant: 'destructive' });
    } else if (data) {
      const newRow = data as CommentRow;
      setTopLevel((prev) => [newRow, ...prev]);
      if (sort === 'top') setFullTopList((prev) => [newRow, ...prev]);
      setLikeCounts((prev) => ({ ...prev, [newRow.id]: 0 }));
      await fetchProfilesFor([newRow.user_id]);
      setTotalTopLevel((t) => t + 1);
      bumpCount(1);
      setBody('');
    }
    setPosting(false);
  }, [body, bumpCount, fetchProfilesFor, modelId, onRequireAuth, sort, user]);

  const handlePostReply = useCallback(async (parentId: string) => {
    if (!user) { if (onRequireAuth) onRequireAuth(); else toast({ title: 'Sign in to reply' }); return; }
    const text = (replyBody[parentId] || '').trim();
    if (!text) return;
    if (text.length > 2000) { toast({ title: 'Reply too long', description: 'Keep it under 2000 characters.', variant: 'destructive' }); return; }
    setReplyPosting((prev) => ({ ...prev, [parentId]: true }));
    const { data, error } = await supabase
      .from('model_comments')
      .insert({ model_id: modelId, user_id: user.id, body: text, parent_comment_id: parentId })
      .select(COMMENT_SELECT)
      .single();
    if (error) {
      toast({ title: 'Could not reply', description: error.message, variant: 'destructive' });
    } else if (data) {
      const newRow = data as CommentRow;
      setRepliesByParent((prev) => {
        const existing = prev[parentId] || [];
        return { ...prev, [parentId]: [...existing, newRow] };
      });
      setLikeCounts((prev) => ({ ...prev, [newRow.id]: 0 }));
      await fetchProfilesFor([newRow.user_id]);
      bumpCount(1);
      setReplyBody((prev) => ({ ...prev, [parentId]: '' }));
      setReplyOpen((prev) => ({ ...prev, [parentId]: false }));
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
    }
    setReplyPosting((prev) => ({ ...prev, [parentId]: false }));
  }, [bumpCount, fetchProfilesFor, modelId, onRequireAuth, replyBody, user]);

  const handleDelete = useCallback(async (row: CommentRow) => {
    if (!user) return;
    setDeletingId(row.id);
    const { error } = await supabase
      .from('model_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      setDeletingId(null);
      return;
    }
    if (row.parent_comment_id) {
      const parentId = row.parent_comment_id;
      setRepliesByParent((prev) => ({ ...prev, [parentId]: (prev[parentId] || []).filter((r) => r.id !== row.id) }));
      bumpCount(-1);
    } else {
      const replyCount = (repliesByParent[row.id] || []).length;
      setTopLevel((prev) => prev.filter((c) => c.id !== row.id));
      setFullTopList((prev) => prev.filter((c) => c.id !== row.id));
      setRepliesByParent((prev) => { const next = { ...prev }; delete next[row.id]; return next; });
      setTotalTopLevel((t) => Math.max(0, t - 1));
      bumpCount(-(1 + replyCount));
    }
    setDeletingId(null);
  }, [bumpCount, repliesByParent, user]);

  const handleToggleLike = useCallback(async (commentId: string) => {
    if (!user) { if (onRequireAuth) onRequireAuth(); else toast({ title: 'Sign in to like comments' }); return; }
    if (pendingLike[commentId]) return;
    setPendingLike((prev) => ({ ...prev, [commentId]: true }));

    const isLiked = myLikes.has(commentId);
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId); else next.add(commentId);
      return next;
    });
    setLikeCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) + (isLiked ? -1 : 1)) }));

    if (isLiked) {
      const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
      if (error) {
        setMyLikes((prev) => { const next = new Set(prev); next.add(commentId); return next; });
        setLikeCounts((prev) => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
        toast({ title: 'Could not unlike', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
      if (error && !String(error.code || '').startsWith('23')) {
        setMyLikes((prev) => { const next = new Set(prev); next.delete(commentId); return next; });
        setLikeCounts((prev) => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) - 1) }));
        toast({ title: 'Could not like', description: error.message, variant: 'destructive' });
      }
    }

    setPendingLike((prev) => { const next = { ...prev }; delete next[commentId]; return next; });
  }, [myLikes, onRequireAuth, pendingLike, user]);

  const toggleReplyOpen = (parentId: string) => {
    if (!user) { if (onRequireAuth) onRequireAuth(); return; }
    setReplyOpen((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const remainingTopLevel = Math.max(0, totalTopLevel - topLevel.length);
  const canPost = body.trim().length > 0 && !posting;

  const getDisplay = (userId: string) => {
    const p = profiles[userId];
    const handle = p?.handle || fallbackHandle(userId);
    const displayName = p?.display_name || handle;
    const avatarUrl = p?.avatar_url || null;
    return { handle, displayName, avatarUrl };
  };

  const renderAvatar = (userId: string, size: 'sm' | 'md' = 'md') => {
    const { avatarUrl, displayName } = getDisplay(userId);
    const initial = (displayName || 'U').charAt(0).toUpperCase();
    const cls = size === 'sm'
      ? 'h-7 w-7 text-[10px]'
      : 'h-9 w-9 text-sm';
    if (avatarUrl) {
      return (
        <div className={`${cls} flex-shrink-0 rounded-full overflow-hidden ring-1 ring-white/10 bg-slate-800`}>
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      );
    }
    const gradient = size === 'sm'
      ? 'bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 text-white'
      : 'bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 text-slate-950';
    return (
      <div className={`${cls} flex-shrink-0 rounded-full ${gradient} flex items-center justify-center font-bold`}>
        {initial || <UserIcon className="h-4 w-4" />}
      </div>
    );
  };

  const renderLikeButton = (id: string, size: 'sm' | 'md' = 'md') => {
    const count = likeCounts[id] || 0;
    const liked = myLikes.has(id);
    const busy = !!pendingLike[id];
    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
      <button
        onClick={() => handleToggleLike(id)}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike comment' : 'Like comment'}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition disabled:opacity-60 ${
          liked
            ? 'border-rose-400/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-400/40 hover:text-rose-300'
        }`}
      >
        <Heart className={`${iconSize} ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
        <span className="tabular-nums">{count}</span>
      </button>
    );
  };


  const renderIdentity = (userId: string) => {
    const p = profiles[userId];
    const realHandle = p?.handle || null;
    const handle = realHandle || fallbackHandle(userId);
    const displayName = p?.display_name || handle;
    const showBoth = displayName && displayName !== handle;

    const nameEl = realHandle ? (
      <Link
        to={`/u/${handle}`}
        className="text-sm font-semibold text-white hover:text-amber-300 hover:underline underline-offset-2 truncate max-w-[160px] transition"
      >
        {displayName}
      </Link>
    ) : (
      <span className="text-sm font-semibold text-white truncate max-w-[160px]">{displayName}</span>
    );

    const handleEl = realHandle ? (
      <Link
        to={`/u/${handle}`}
        className="text-xs text-slate-500 hover:text-amber-300 hover:underline underline-offset-2 truncate transition"
      >
        @{handle}
      </Link>
    ) : (
      <span className="text-xs text-slate-500 truncate">@{handle}</span>
    );

    return (
      <>
        {nameEl}
        {showBoth ? handleEl : handleEl}
      </>
    );
  };


  const renderReply = (r: CommentRow) => {
    const isOwn = user?.id === r.user_id;
    return (
      <li key={r.id} className="rounded-lg border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition p-3">
        <div className="flex items-start gap-2.5">
          <CornerDownRight className="h-3.5 w-3.5 text-slate-600 mt-1 flex-shrink-0" />
          {renderAvatar(r.user_id, 'sm')}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {renderIdentity(r.user_id)}
              {isOwn && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">You</span>
              )}
              <span className="text-xs text-slate-500">· {timeAgo(r.created_at)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap break-words">{r.body}</p>
            <div className="mt-2 flex items-center gap-2">{renderLikeButton(r.id, 'sm')}</div>
          </div>
          {isOwn && (
            <button
              onClick={() => handleDelete(r)}
              disabled={deletingId === r.id}
              className="flex-shrink-0 text-slate-500 hover:text-rose-400 p-1 rounded transition disabled:opacity-50"
              aria-label="Delete reply"
              title="Delete reply"
            >
              {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </li>
    );
  };

  const renderTopLevel = (c: CommentRow) => {
    const isOwn = user?.id === c.user_id;
    const replies = repliesByParent[c.id] || [];
    const replyCount = replies.length;
    const isExpanded = !!expandedReplies[c.id];
    const visibleReplies = isExpanded ? replies : replies.slice(0, REPLIES_COLLAPSED);
    const hiddenCount = Math.max(0, replyCount - REPLIES_COLLAPSED);
    const isReplying = !!replyOpen[c.id];
    const replyText = replyBody[c.id] || '';
    const canSendReply = replyText.trim().length > 0 && !replyPosting[c.id];
    const { handle } = getDisplay(c.user_id);

    return (
      <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition p-4">
        <div className="flex items-start gap-3">
          {renderAvatar(c.user_id, 'md')}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {renderIdentity(c.user_id)}
              {isOwn && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">You</span>
              )}
              <span className="text-xs text-slate-500">· {timeAgo(c.created_at)}</span>
              {replyCount > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-200 bg-blue-400/10 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  <MessageCircle className="h-3 w-3" />
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-200 whitespace-pre-wrap break-words">{c.body}</p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {renderLikeButton(c.id)}
              <button
                onClick={() => toggleReplyOpen(c.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-amber-300 hover:border-amber-400/40 transition"
              >
                {isReplying ? <X className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />}
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            </div>

            {isReplying && (
              <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                {user ? (
                  <>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyBody((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault();
                          if (canSendReply) handlePostReply(c.id);
                        }
                      }}
                      maxLength={2000}
                      rows={2}
                      placeholder={`Reply to @${handle}...`}
                      className="w-full bg-slate-950/80 border border-white/10 focus:border-amber-400/60 rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-y outline-none transition"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px] text-slate-500">{replyText.length}/2000</div>
                      <Button
                        size="sm"
                        onClick={() => handlePostReply(c.id)}
                        disabled={!canSendReply}
                        className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50 h-8"
                      >
                        {replyPosting[c.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Reply
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400">Sign in to reply.</div>
                )}
              </div>
            )}

            {replyCount > 0 && (
              <ul className="mt-3 space-y-2 pl-4 sm:pl-6 border-l border-white/10">
                {visibleReplies.map(renderReply)}
              </ul>
            )}
            {hiddenCount > 0 && (
              <button
                onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                className="mt-2 ml-4 sm:ml-6 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
              >
                {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" />Hide {hiddenCount} {hiddenCount === 1 ? 'reply' : 'replies'}</> : <><ChevronDown className="h-3.5 w-3.5" />Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</>}
              </button>
            )}
          </div>
          {isOwn && (
            <button
              onClick={() => handleDelete(c)}
              disabled={deletingId === c.id}
              className="flex-shrink-0 text-slate-500 hover:text-rose-400 p-1 rounded transition disabled:opacity-50"
              aria-label="Delete comment"
              title="Delete comment"
            >
              {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </li>
    );
  };

  const headerCount = useMemo(() => totalAll, [totalAll]);

  return (
    <section id="comments" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
      <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold">Comments</h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full">
            <MessageCircle className="h-3.5 w-3.5" />
            {headerCount}
          </span>
        </div>

        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => sort !== 'new' && setSort('new')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${sort === 'new' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
            aria-pressed={sort === 'new'}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Newest
          </button>
          <button
            onClick={() => sort !== 'top' && setSort('top')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${sort === 'top' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
            aria-pressed={sort === 'top'}
          >
            <Flame className="h-3.5 w-3.5" />
            Top
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        {user ? (
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (canPost) handlePostTopLevel();
                }
              }}
              maxLength={2000}
              rows={3}
              placeholder="Share your thoughts..."
              className="w-full bg-slate-950/60 border border-white/10 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 resize-y outline-none transition"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-[11px] text-slate-500">
                {body.length}/2000 · <span className="hidden sm:inline">⌘/Ctrl + Enter to post</span>
              </div>
              <Button
                onClick={handlePostTopLevel}
                disabled={!canPost}
                className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                Post
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => (onRequireAuth ? onRequireAuth() : undefined)}
            className="w-full text-left px-4 py-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-amber-400/40 transition text-sm text-slate-300"
          >
            <span className="font-semibold text-white">Sign in</span> to leave a comment.
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/5">
          <MessageCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-300 font-semibold">No comments yet</div>
          <p className="text-slate-500 text-sm mt-1">Be the first to share your thoughts.</p>
        </div>
      ) : (
        <ul className="space-y-3">{topLevel.map(renderTopLevel)}</ul>
      )}

      {remainingTopLevel > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <MessageCircle className="h-4 w-4 mr-1.5" />}
            Load {Math.min(PAGE_SIZE, remainingTopLevel)} more
          </Button>
        </div>
      )}
    </section>
  );
};

export default CommentsSection;
