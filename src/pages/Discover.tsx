import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LikeButton from '@/components/social/LikeButton';
import AuthModal from '@/components/auth/AuthModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Heart,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Trophy,
  User as UserIcon,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface PublicModelRow {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  ethnicity: string | null;
  personality: string | null;
  bio: string | null;
  cover_image_url: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ModelWithStats extends PublicModelRow {
  imageCount: number;
  latestImageAt: string | null;
  likeCount: number;
  weeklyLikeCount: number;
}

type SortKey = 'trending' | 'newest' | 'oldest' | 'name' | 'likes';

const PAGE_SIZE = 12;
const ANY = '__any__';

type CreatorProfile = { handle: string | null; display_name: string | null; avatar_url: string | null };

const Discover: React.FC = () => {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelWithStats[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, CreatorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedCreators, setFollowedCreators] = useState<Set<string>>(new Set());
  const [authOpen, setAuthOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<string>(ANY);
  const [ethnicity, setEthnicity] = useState<string>(ANY);
  const [personality, setPersonality] = useState<string>(ANY);
  const [sort, setSort] = useState<SortKey>('trending');
  const [followingOnly, setFollowingOnly] = useState(false);
  const [page, setPage] = useState(1);
  // Load all public models + stats (images, likes, weekly likes)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: modelRows, error: mErr } = await supabase
        .from('models')
        .select(
          'id, user_id, name, age, gender, ethnicity, personality, bio, cover_image_url, slug, created_at, updated_at'
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(500);

      if (cancelled) return;
      if (mErr) {
        setError(mErr.message);
        setLoading(false);
        return;
      }

      const rows = (modelRows || []) as PublicModelRow[];

      // Image counts (for trending / badges)
      const { data: imgRows } = await supabase
        .from('generated_images')
        .select('model_name, session_id, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (cancelled) return;

      const imgStatsMap = new Map<string, { count: number; latest: string | null }>();
      (imgRows || []).forEach((r: any) => {
        const key = `${r.session_id}::${r.model_name}`;
        const cur = imgStatsMap.get(key);
        if (!cur) {
          imgStatsMap.set(key, { count: 1, latest: r.created_at });
        } else {
          cur.count += 1;
          if (!cur.latest || r.created_at > cur.latest) cur.latest = r.created_at;
        }
      });

      // Likes: pull all rows and aggregate in-memory (single round trip)
      const { data: likeRows } = await supabase
        .from('model_likes')
        .select('model_id, created_at')
        .limit(10000);

      if (cancelled) return;

      const totalLikesMap = new Map<string, number>();
      const weeklyLikesMap = new Map<string, number>();
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      (likeRows || []).forEach((r: any) => {
        totalLikesMap.set(r.model_id, (totalLikesMap.get(r.model_id) || 0) + 1);
        const ts = new Date(r.created_at).getTime();
        if (ts >= oneWeekAgo) {
          weeklyLikesMap.set(r.model_id, (weeklyLikesMap.get(r.model_id) || 0) + 1);
        }
      });

      const enriched: ModelWithStats[] = rows.map((m) => {
        const imgStat = imgStatsMap.get(`${m.user_id}::${m.name}`);
        return {
          ...m,
          imageCount: imgStat?.count || 0,
          latestImageAt: imgStat?.latest || null,
          likeCount: totalLikesMap.get(m.id) || 0,
          weeklyLikeCount: weeklyLikesMap.get(m.id) || 0,
        };
      });

      setModels(enriched);
      setLoading(false);
      // Fetch real creator profiles for every user_id we're displaying
      const creatorIds = Array.from(new Set(rows.map((m) => m.user_id)));
      if (creatorIds.length > 0) {
        const { data: profRows } = await supabase
          .from('profiles')
          .select('user_id, handle, display_name, avatar_url')
          .in('user_id', creatorIds);
        if (cancelled) return;
        const map: Record<string, CreatorProfile> = {};
        for (const row of (profRows || []) as Array<{
          user_id: string;
          handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
        }>) {
          map[row.user_id] = {
            handle: row.handle,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
          };
        }
        setCreatorProfiles(map);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load who the current user follows (for the Following filter)
  useEffect(() => {
    let cancelled = false;
    const loadFollows = async () => {
      if (!user) {
        setFollowedCreators(new Set());
        return;
      }
      const { data } = await supabase
        .from('follows')
        .select('creator_id')
        .eq('follower_id', user.id);
      if (cancelled) return;
      setFollowedCreators(new Set((data || []).map((r: any) => r.creator_id)));
    };
    loadFollows();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Derive filter option lists from loaded models
  const genderOptions = useMemo(
    () => uniqueValues(models.map((m) => m.gender)),
    [models]
  );
  const ethnicityOptions = useMemo(
    () => uniqueValues(models.map((m) => m.ethnicity)),
    [models]
  );
  const personalityOptions = useMemo(
    () => uniqueValues(models.map((m) => m.personality)),
    [models]
  );

  // Apply filters + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = models.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q) && !(m.bio || '').toLowerCase().includes(q)) {
        return false;
      }
      if (gender !== ANY && (m.gender || '') !== gender) return false;
      if (ethnicity !== ANY && (m.ethnicity || '') !== ethnicity) return false;
      if (personality !== ANY && (m.personality || '') !== personality) return false;
      if (followingOnly && !followedCreators.has(m.user_id)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'trending': {
          // Score combines likes (heavier) + image count + recent activity
          const scoreA = a.likeCount * 3 + a.imageCount;
          const scoreB = b.likeCount * 3 + b.imageCount;
          const diff = scoreB - scoreA;
          if (diff !== 0) return diff;
          const la = a.latestImageAt || a.updated_at || a.created_at;
          const lb = b.latestImageAt || b.updated_at || b.created_at;
          return (lb || '').localeCompare(la || '');
        }
        case 'likes':
          return b.likeCount - a.likeCount || b.imageCount - a.imageCount;
        case 'newest':
          return b.created_at.localeCompare(a.created_at);
        case 'oldest':
          return a.created_at.localeCompare(b.created_at);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return list;
  }, [models, search, gender, ethnicity, personality, sort, followingOnly, followedCreators]);

  // Leaderboard: top 5 by weekly likes (only if they have at least 1 like this week)
  const weeklyLeaders = useMemo(() => {
    return [...models]
      .filter((m) => m.weeklyLikeCount > 0)
      .sort(
        (a, b) => b.weeklyLikeCount - a.weeklyLikeCount || b.likeCount - a.likeCount
      )
      .slice(0, 5);
  }, [models]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, gender, ethnicity, personality, sort, followingOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setGender(ANY);
    setEthnicity(ANY);
    setPersonality(ANY);
    setSort('trending');
    setFollowingOnly(false);
  };

  const hasActiveFilters =
    !!search ||
    gender !== ANY ||
    ethnicity !== ANY ||
    personality !== ANY ||
    sort !== 'trending' ||
    followingOnly;

  const toggleFollowingOnly = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setFollowingOnly((v) => !v);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold">Famous.ai</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full">
            <Compass className="h-3 w-3" /> Discover
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-blue-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 mb-4">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Trending public profiles
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Discover AI models
          </h1>
          <p className="mt-3 text-slate-400 text-base md:text-lg max-w-2xl">
            Explore published models from creators across the Famous.ai community. Like your
            favorites, follow creators, and peek at their public galleries.
          </p>
        </div>
      </section>

      {/* Weekly leaderboard */}
      <Leaderboard
        models={weeklyLeaders}
        profiles={creatorProfiles}
        loading={loading}
        onRequireAuth={() => setAuthOpen(true)}
      />

      {/* Controls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or bio..."
                className="pl-9 bg-slate-900 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any gender</SelectItem>
                  {genderOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={ethnicity} onValueChange={setEthnicity}>
                <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                  <SelectValue placeholder="Ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any ethnicity</SelectItem>
                  {ethnicityOptions.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={personality} onValueChange={setPersonality}>
                <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                  <SelectValue placeholder="Personality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any personality</SelectItem>
                  {personalityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="bg-slate-900 border-white/10 text-white">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending">
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5" /> Trending
                    </span>
                  </SelectItem>
                  <SelectItem value="likes">
                    <span className="inline-flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5" /> Most liked
                    </span>
                  </SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading public models…
                </span>
              ) : (
                <span>
                  {filtered.length} {filtered.length === 1 ? 'model' : 'models'} found
                  {models.length !== filtered.length && ` · ${models.length} total public`}
                </span>
              )}
              <button
                onClick={toggleFollowingOnly}
                aria-pressed={followingOnly}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition text-xs font-semibold',
                  followingOnly
                    ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                {followingOnly ? <UserCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {followingOnly ? 'Following only' : 'Following'}
                {user && followedCreators.size > 0 && (
                  <span className="opacity-75">· {followedCreators.size}</span>
                )}
              </button>
            </div>
            {hasActiveFilters && !loading && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 mb-6">
            Failed to load: {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
            <Compass className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-200 font-semibold text-lg">
              {followingOnly && followedCreators.size === 0
                ? "You're not following anyone yet"
                : 'No models match your filters'}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {followingOnly && followedCreators.size === 0
                ? 'Open any public profile and tap Follow to start building your feed.'
                : 'Try clearing filters or check back later as more creators publish profiles.'}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" className="mt-5">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {paged.map((m, idx) => {
                const isTrending =
                  sort === 'trending' &&
                  clampedPage === 1 &&
                  idx < 3 &&
                  (m.likeCount > 0 || m.imageCount > 0);
                return (
                  <ModelCard
                    key={m.id}
                    model={m}
                    profile={creatorProfiles[m.user_id]}
                    showTrending={isTrending}
                    onRequireAuth={() => setAuthOpen(true)}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                page={clampedPage}
                totalPages={totalPages}
                onPage={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Built with{' '}
        <Link to="/" className="text-amber-300 hover:text-amber-200 font-semibold">
          Famous.ai
        </Link>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
    </div>
  );
};

// ---------------- Leaderboard ----------------
const Leaderboard: React.FC<{
  models: ModelWithStats[];
  profiles: Record<string, CreatorProfile>;
  loading: boolean;
  onRequireAuth: () => void;
}> = ({ models, profiles, loading, onRequireAuth }) => {
  if (loading) return null;
  if (!models.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
      <div className="rounded-2xl bg-gradient-to-br from-amber-400/10 via-rose-500/10 to-purple-600/10 border border-amber-400/20 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold leading-tight">Most liked this week</h2>
              <p className="text-xs md:text-sm text-slate-400">Top 5 trending profiles from the last 7 days</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-200 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-full">
            <Flame className="h-3 w-3" /> Updated live
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {models.map((m, i) => (
            <LeaderboardCard
              key={m.id}
              model={m}
              rank={i + 1}
              profile={profiles[m.user_id]}
              onRequireAuth={onRequireAuth}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const LeaderboardCard: React.FC<{
  model: ModelWithStats;
  rank: number;
  profile?: CreatorProfile;
  onRequireAuth: () => void;
}> = ({ model, rank, profile, onRequireAuth }) => {
  const href = model.slug ? `/m/${model.slug}` : '#';
  const rankColors =
    rank === 1
      ? 'from-amber-300 to-yellow-500 text-slate-950'
      : rank === 2
      ? 'from-slate-200 to-slate-400 text-slate-950'
      : rank === 3
      ? 'from-orange-400 to-rose-500 text-slate-950'
      : 'from-slate-700 to-slate-800 text-slate-200';

  return (
    <Link
      to={href}
      className="group relative rounded-xl overflow-hidden bg-slate-900/80 border border-white/10 hover:border-amber-400/50 transition flex flex-col"
    >
      <div className="relative aspect-square bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {model.cover_image_url ? (
          <img
            src={model.cover_image_url}
            alt={model.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-xl font-bold text-slate-950">
              {(model.name[0] || 'M').toUpperCase()}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Rank medal */}
        <div
          className={`absolute top-2 left-2 h-7 min-w-7 px-2 rounded-full bg-gradient-to-br ${rankColors} inline-flex items-center justify-center gap-1 font-bold text-xs shadow`}
        >
          {rank === 1 && <Crown className="h-3.5 w-3.5" />}#{rank}
        </div>

        {/* Name overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="text-white font-semibold text-sm leading-tight line-clamp-1">
            {model.name}
          </div>
          <CreatorHandleInline userId={model.user_id} profile={profile} size="xs" />
        </div>
      </div>

      <div className="p-2.5 flex items-center justify-between gap-2 bg-slate-950/60 border-t border-white/5">
        <span className="inline-flex items-center gap-1 text-[11px] text-rose-300 font-semibold">
          <Heart className="h-3 w-3 fill-rose-400 text-rose-400" /> {model.weeklyLikeCount} this week
        </span>
        <LikeButton
          modelId={model.id}
          initialCount={model.likeCount}
          size="sm"
          stopPropagation
          onRequireAuth={onRequireAuth}
        />
      </div>
    </Link>
  );
};

// ---------------- Card ----------------
const ModelCard: React.FC<{
  model: ModelWithStats;
  profile?: CreatorProfile;
  showTrending?: boolean;
  onRequireAuth: () => void;
}> = ({ model, profile, showTrending, onRequireAuth }) => {
  const href = model.slug ? `/m/${model.slug}` : '#';

  return (
    <Link
      to={href}
      className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/50 transition shadow-lg hover:shadow-amber-500/10 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {model.cover_image_url ? (
          <img
            src={model.cover_image_url}
            alt={model.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-slate-950">
              {(model.name[0] || 'M').toUpperCase()}
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Top-right badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {showTrending && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider shadow">
              <Flame className="h-3 w-3" /> Trending
            </span>
          )}
          {model.imageCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-semibold border border-white/10">
              <ImageIcon className="h-3 w-3" /> {model.imageCount}
            </span>
          )}
        </div>

        {/* Top-left: like button (live count) */}
        <div className="absolute top-3 left-3">
          <LikeButton
            modelId={model.id}
            initialCount={model.likeCount}
            size="sm"
            stopPropagation
            onRequireAuth={onRequireAuth}
            className="bg-black/60 backdrop-blur border-white/10 text-white hover:bg-black/80"
          />
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="text-white font-bold text-lg leading-tight line-clamp-1">
            {model.name}
          </div>
          <div className="mt-0.5 text-slate-300 text-xs flex flex-wrap items-center gap-x-1.5">
            {model.age && <span>{model.age}</span>}
            {model.gender && <span>· {model.gender}</span>}
            {model.ethnicity && <span className="line-clamp-1">· {model.ethnicity}</span>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between gap-2 border-t border-white/5 bg-slate-950/50">
        <div className="flex items-center gap-2 min-w-0">
          {profile?.avatar_url ? (
            <div className="h-7 w-7 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 leading-tight">Created by</div>
            <CreatorHandleInline userId={model.user_id} profile={profile} size="sm" />
          </div>
        </div>
        {model.personality && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-[10px] font-semibold flex-shrink-0">
            <Sparkles className="h-2.5 w-2.5" /> {model.personality}
          </span>
        )}
      </div>
    </Link>
  );
};

// Inline clickable creator handle — navigates to /u/:handle without triggering the
// parent <Link>. Falls back to plain text when no profile is available yet.
const CreatorHandleInline: React.FC<{
  userId: string;
  profile?: CreatorProfile;
  size?: 'xs' | 'sm';
}> = ({ userId, profile, size = 'sm' }) => {
  const navigate = useNavigate();
  const realHandle = profile?.handle || null;
  const label = realHandle
    ? (profile?.display_name ? profile.display_name : `@${realHandle}`)
    : creatorHandle(userId);
  const cls =
    size === 'xs'
      ? 'text-[11px] text-slate-300 truncate hover:text-amber-300 transition'
      : 'text-xs text-slate-200 font-medium truncate hover:text-amber-300 transition';

  if (!realHandle) {
    return <div className={cls}>{label}</div>;
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/u/${realHandle}`);
      }}
      className={`${cls} text-left underline-offset-2 hover:underline`}
      aria-label={`View profile of ${label}`}
      title={`@${realHandle}`}
    >
      {label}
    </button>
  );
};

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}> = ({ page, totalPages, onPage }) => {
  const pages = pageRange(page, totalPages);
  return (
    <div className="mt-10 flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="bg-slate-900 border-white/10 text-slate-200 hover:bg-white/10"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Prev</span>
      </Button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e-${i}`} className="px-2 text-slate-500 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition ${
              p === page
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {p}
          </button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="bg-slate-900 border-white/10 text-slate-200 hover:bg-white/10"
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ---------- helpers ----------
const uniqueValues = (arr: (string | null | undefined)[]): string[] => {
  const set = new Set<string>();
  arr.forEach((v) => {
    if (v && v.trim()) set.add(v.trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

const creatorHandle = (userId: string) => {
  const clean = (userId || '').replace(/-/g, '');
  return `@creator_${clean.slice(0, 6) || 'unknown'}`;
};

const pageRange = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
};

export default Discover;
