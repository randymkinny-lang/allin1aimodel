import React, { useCallback, useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface LikeButtonProps {
  modelId: string;
  /** Optional initial count (skips loading state for count). */
  initialCount?: number;
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg';
  /** If true, renders as a pill with label; else icon + count only */
  showLabel?: boolean;
  /** Prevent click propagation (e.g. inside a Link card) */
  stopPropagation?: boolean;
  /** Called after the local liked state changes (optimistic). */
  onChanged?: (liked: boolean, newCount: number) => void;
  /** Optional className override for wrapper */
  className?: string;
  /** When user is not signed in, this is invoked instead of toast. */
  onRequireAuth?: () => void;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  modelId,
  initialCount,
  size = 'md',
  showLabel = false,
  stopPropagation = false,
  onChanged,
  className,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [loadingLiked, setLoadingLiked] = useState(true);
  const [busy, setBusy] = useState(false);

  // Initial load: get total count + whether current user liked it
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingLiked(true);

      // Always refresh count from DB (initialCount is only a starting hint)
      const { count: totalCount } = await supabase
        .from('model_likes')
        .select('id', { count: 'exact', head: true })
        .eq('model_id', modelId);

      if (cancelled) return;
      if (typeof totalCount === 'number') setCount(totalCount);

      if (user) {
        const { data } = await supabase
          .from('model_likes')
          .select('id')
          .eq('model_id', modelId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        setLiked(!!data);
      } else {
        setLiked(false);
      }
      setLoadingLiked(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [modelId, user]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!user) {
        if (onRequireAuth) onRequireAuth();
        else
          toast({
            title: 'Sign in to like',
            description: 'Create a free account to like and follow creators.',
          });
        return;
      }
      if (busy) return;
      setBusy(true);

      const wasLiked = liked;
      const nextLiked = !wasLiked;
      const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));

      // Optimistic update
      setLiked(nextLiked);
      setCount(nextCount);
      onChanged?.(nextLiked, nextCount);

      if (nextLiked) {
        const { error } = await supabase
          .from('model_likes')
          .insert({ user_id: user.id, model_id: modelId });
        if (error && !/duplicate/i.test(error.message)) {
          // Revert
          setLiked(wasLiked);
          setCount(count);
          onChanged?.(wasLiked, count);
          toast({ title: 'Could not like', description: error.message, variant: 'destructive' });
        }
      } else {
        const { error } = await supabase
          .from('model_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('model_id', modelId);
        if (error) {
          setLiked(wasLiked);
          setCount(count);
          onChanged?.(wasLiked, count);
          toast({ title: 'Could not unlike', description: error.message, variant: 'destructive' });
        }
      }
      setBusy(false);
    },
    [busy, count, liked, modelId, onChanged, onRequireAuth, stopPropagation, user]
  );

  const sizeClasses =
    size === 'sm'
      ? 'h-7 px-2 text-xs gap-1'
      : size === 'lg'
      ? 'h-11 px-5 text-sm gap-2'
      : 'h-9 px-3 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={[
        'inline-flex items-center rounded-full border font-semibold transition select-none',
        sizeClasses,
        liked
          ? 'bg-rose-500/15 border-rose-400/40 text-rose-300 hover:bg-rose-500/25'
          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20',
        busy ? 'opacity-70 cursor-wait' : '',
        className || '',
      ].join(' ')}
    >
      {busy ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Heart
          className={`${iconSize} transition ${
            liked ? 'fill-rose-400 text-rose-400' : 'text-slate-300'
          }`}
        />
      )}
      {showLabel && <span>{liked ? 'Liked' : 'Like'}</span>}
      <span className={`tabular-nums ${showLabel ? 'ml-0.5' : ''}`}>
        {loadingLiked && count === 0 ? '·' : formatCount(count)}
      </span>
    </button>
  );
};

const formatCount = (n: number) => {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(n / 1000) + 'k';
};

export default LikeButton;
