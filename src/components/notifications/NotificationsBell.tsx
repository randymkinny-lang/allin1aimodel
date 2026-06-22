import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, UserPlus, Heart, MessageCircle, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type NotificationType = 'follow' | 'model_like' | 'comment_like' | 'comment_reply';

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  entity_id: string | null;
  entity_type: string | null;
  read_at: string | null;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ModelLite {
  id: string;
  slug: string | null;
  name: string | null;
}

interface CommentLite {
  id: string;
  model_id: string;
  body: string | null;
}

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  const yr = Math.floor(day / 365);
  return `${yr}y`;
};

const TypeIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  const cls = 'h-3.5 w-3.5 text-white';
  if (type === 'follow') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 ring-2 ring-slate-950">
        <UserPlus className={cls} />
      </span>
    );
  }
  if (type === 'model_like') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 ring-2 ring-slate-950">
        <Heart className={cls} />
      </span>
    );
  }
  if (type === 'comment_like') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 ring-2 ring-slate-950">
        <ThumbsUp className={cls} />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500 ring-2 ring-slate-950">
      <MessageCircle className={cls} />
    </span>
  );
};

const NotificationsBell: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [models, setModels] = useState<Record<string, ModelLite>>({});
  const [comments, setComments] = useState<Record<string, CommentLite>>({});
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items],
  );

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('notifications')
        .select('id, recipient_id, actor_id, type, entity_id, entity_type, read_at, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error || !rows) {
        setItems([]);
        return;
      }
      const list = rows as NotificationRow[];
      setItems(list);

      const actorIds = Array.from(new Set(list.map((n) => n.actor_id))).filter(Boolean);
      const modelIds = Array.from(
        new Set(
          list
            .filter((n) => n.type === 'model_like' && n.entity_id)
            .map((n) => n.entity_id as string),
        ),
      );
      const commentIds = Array.from(
        new Set(
          list
            .filter(
              (n) =>
                (n.type === 'comment_like' || n.type === 'comment_reply') && n.entity_id,
            )
            .map((n) => n.entity_id as string),
        ),
      );

      const [profRes, modelRes, commentRes] = await Promise.all([
        actorIds.length
          ? supabase
              .from('profiles')
              .select('user_id, handle, display_name, avatar_url')
              .in('user_id', actorIds)
          : Promise.resolve({ data: [] as ProfileLite[] }),
        modelIds.length
          ? supabase.from('models').select('id, slug, name').in('id', modelIds)
          : Promise.resolve({ data: [] as ModelLite[] }),
        commentIds.length
          ? supabase
              .from('model_comments')
              .select('id, model_id, body')
              .in('id', commentIds)
          : Promise.resolve({ data: [] as CommentLite[] }),
      ]);

      const profMap: Record<string, ProfileLite> = {};
      ((profRes.data as ProfileLite[]) || []).forEach((p) => {
        profMap[p.user_id] = p;
      });
      setProfiles(profMap);

      const modelMap: Record<string, ModelLite> = {};
      ((modelRes.data as ModelLite[]) || []).forEach((m) => {
        modelMap[m.id] = m;
      });

      // Fetch parent models for comments not already loaded
      const commentList = (commentRes.data as CommentLite[]) || [];
      const commentMap: Record<string, CommentLite> = {};
      commentList.forEach((c) => {
        commentMap[c.id] = c;
      });
      setComments(commentMap);

      const extraModelIds = commentList
        .map((c) => c.model_id)
        .filter((id) => id && !modelMap[id]);
      if (extraModelIds.length) {
        const { data: more } = await supabase
          .from('models')
          .select('id, slug, name')
          .in('id', extraModelIds);
        ((more as ModelLite[]) || []).forEach((m) => {
          modelMap[m.id] = m;
        });
      }
      setModels(modelMap);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load + lightweight polling (avoids the supabase-js realtime
  // websocket decoder crashing with "{} is not iterable" on malformed frames
  // that the databasepad backend occasionally emits during reconnect).
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    fetchAll();

    // Poll every 45s while the tab is visible. Cheap, reliable, and doesn't
    // touch the websocket layer.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    }, 45000);

    // Refetch immediately when the tab regains focus.
    const onFocus = () => fetchAll();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {
          /* ignore */
        }
        channelRef.current = null;
      }
    };
  }, [user, fetchAll]);


  // Mark all as read when dropdown opens
  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && user) {
      await fetchAll();
      const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
      if (unreadIds.length) {
        const nowIso = new Date().toISOString();
        // optimistic
        setItems((prev) =>
          prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso })),
        );
        try {
          await supabase
            .from('notifications')
            .update({ read_at: nowIso })
            .eq('recipient_id', user.id)
            .is('read_at', null);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const markOneRead = async (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read_at) return;
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: nowIso } : n)));
    try {
      await supabase.from('notifications').update({ read_at: nowIso }).eq('id', id);
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  const renderRow = (n: NotificationRow) => {
    const actor = profiles[n.actor_id];
    const handle = actor?.handle || null;
    const displayName = actor?.display_name || (handle ? `@${handle}` : 'Someone');
    const avatar = actor?.avatar_url || '';
    const profileHref = handle ? `/u/${handle}` : null;

    let action = '';
    let contextHref: string | null = null;
    let contextLabel: string | null = null;

    if (n.type === 'follow') {
      action = 'started following you';
      contextHref = profileHref;
    } else if (n.type === 'model_like') {
      const m = n.entity_id ? models[n.entity_id] : null;
      action = 'liked your model';
      if (m?.slug) {
        contextHref = `/m/${m.slug}`;
        contextLabel = m.name || 'View model';
      }
    } else if (n.type === 'comment_like') {
      const c = n.entity_id ? comments[n.entity_id] : null;
      action = 'liked your comment';
      if (c) {
        const m = models[c.model_id];
        if (m?.slug) {
          contextHref = `/m/${m.slug}#comment-${c.id}`;
          contextLabel = c.body ? `"${c.body.slice(0, 60)}${c.body.length > 60 ? '…' : ''}"` : 'View comment';
        }
      }
    } else if (n.type === 'comment_reply') {
      const c = n.entity_id ? comments[n.entity_id] : null;
      action = 'replied to your comment';
      if (c) {
        const m = models[c.model_id];
        if (m?.slug) {
          contextHref = `/m/${m.slug}#comment-${c.id}`;
          contextLabel = c.body ? `"${c.body.slice(0, 60)}${c.body.length > 60 ? '…' : ''}"` : 'View reply';
        }
      }
    }

    return (
      <div
        key={n.id}
        onClick={() => markOneRead(n.id)}
        className={`group relative flex gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition cursor-pointer ${
          n.read_at ? '' : 'bg-amber-500/5'
        }`}
      >
        <div className="relative shrink-0">
          {profileHref ? (
            <Link to={profileHref} onClick={(e) => e.stopPropagation()}>
              <Avatar className="h-10 w-10 ring-1 ring-white/10">
                <AvatarImage src={avatar} alt={displayName} />
                <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                  {(displayName || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Avatar className="h-10 w-10 ring-1 ring-white/10">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">
                {(displayName || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="absolute -bottom-1 -right-1">
            <TypeIcon type={n.type} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-200 leading-snug">
            {profileHref ? (
              <Link
                to={profileHref}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-white hover:text-amber-300 hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-semibold text-white">{displayName}</span>
            )}{' '}
            <span className="text-slate-300">{action}</span>
            {handle && (
              <span className="text-slate-500"> · @{handle}</span>
            )}
          </div>
          {contextHref && contextLabel && (
            <Link
              to={contextHref}
              onClick={(e) => {
                e.stopPropagation();
                markOneRead(n.id);
                setOpen(false);
              }}
              className="mt-0.5 block text-xs text-amber-300/90 hover:text-amber-200 hover:underline truncate"
            >
              {contextLabel}
            </Link>
          )}
          <div className="mt-0.5 text-[11px] text-slate-500">{relativeTime(n.created_at)} ago</div>
        </div>
        {!n.read_at && (
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400 shadow shadow-amber-400/50" />
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold ring-2 ring-slate-950">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[92vw] p-0 bg-slate-950 border border-white/10 text-slate-100 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="text-[11px] text-amber-300">{unreadCount} new</span>
          )}
        </div>
        <div className="max-h-[460px] overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <div className="text-sm font-medium text-slate-300">No notifications yet</div>
              <div className="text-xs text-slate-500 mt-1">
                You'll see follows, likes, and replies here.
              </div>
            </div>
          ) : (
            items.map(renderRow)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
