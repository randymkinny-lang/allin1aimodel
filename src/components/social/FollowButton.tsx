import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface FollowButtonProps {
  creatorId: string;
  size?: 'sm' | 'md' | 'lg';
  onChanged?: (following: boolean, newCount: number) => void;
  onRequireAuth?: () => void;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  creatorId,
  size = 'md',
  onChanged,
  onRequireAuth,
  className,
}) => {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isSelf = !!user && user.id === creatorId;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', creatorId);
      if (cancelled) return;
      if (typeof count === 'number') setFollowerCount(count);

      if (user && !isSelf) {
        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('creator_id', creatorId)
          .eq('follower_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        setFollowing(!!data);
      } else {
        setFollowing(false);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [creatorId, user, isSelf]);

  const handleToggle = useCallback(async () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      else toast({ title: 'Sign in to follow', description: 'Create a free account to follow creators.' });
      return;
    }
    if (isSelf) return;
    if (busy) return;
    setBusy(true);

    const wasFollowing = following;
    const nextFollowing = !wasFollowing;
    const nextCount = Math.max(0, followerCount + (nextFollowing ? 1 : -1));

    setFollowing(nextFollowing);
    setFollowerCount(nextCount);
    onChanged?.(nextFollowing, nextCount);

    if (nextFollowing) {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, creator_id: creatorId });
      if (error && !/duplicate/i.test(error.message)) {
        setFollowing(wasFollowing);
        setFollowerCount(followerCount);
        onChanged?.(wasFollowing, followerCount);
        toast({ title: 'Could not follow', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Following', description: 'This creator has been added to your following feed.' });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('creator_id', creatorId);
      if (error) {
        setFollowing(wasFollowing);
        setFollowerCount(followerCount);
        onChanged?.(wasFollowing, followerCount);
        toast({ title: 'Could not unfollow', description: error.message, variant: 'destructive' });
      }
    }
    setBusy(false);
  }, [busy, creatorId, followerCount, following, isSelf, onChanged, onRequireAuth, user]);

  if (isSelf) {
    return (
      <div
        className={[
          'inline-flex items-center gap-2 rounded-full px-4 h-10 text-sm border border-white/10 bg-white/5 text-slate-400',
          className || '',
        ].join(' ')}
      >
        <UserCheck className="h-4 w-4" /> You · {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </div>
    );
  }

  const sizeClasses =
    size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : size === 'lg' ? 'h-11 px-6 text-sm gap-2' : 'h-10 px-4 text-sm gap-2';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy || loading}
      className={[
        'inline-flex items-center rounded-full font-semibold transition border',
        sizeClasses,
        following
          ? 'bg-white/10 border-white/20 text-white hover:bg-rose-500/15 hover:border-rose-400/40 hover:text-rose-300'
          : 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 border-transparent hover:from-amber-500 hover:to-amber-700',
        busy ? 'opacity-70 cursor-wait' : '',
        className || '',
      ].join(' ')}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      <span>{following ? 'Following' : 'Follow'}</span>
      <span className="tabular-nums opacity-80">· {followerCount}</span>
    </button>
  );
};

export default FollowButton;
