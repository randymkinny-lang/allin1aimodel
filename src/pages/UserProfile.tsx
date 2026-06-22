import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import FollowButton from '@/components/social/FollowButton';
import AuthModal from '@/components/auth/AuthModal';
import TipDialog from '@/components/tips/TipDialog';
import {
  ArrowLeft,
  Calendar,
  Compass,
  DollarSign,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Sparkles,
  User as UserIcon,
  UserX,
} from 'lucide-react';


interface ProfileRow {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at?: string | null;
}

interface PublicModelRow {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  personality: string | null;
  bio: string | null;
  cover_image_url: string | null;
  slug: string | null;
  created_at: string;
}

interface RecentComment {
  id: string;
  body: string;
  created_at: string;
  model_id: string;
  model_name?: string | null;
  model_slug?: string | null;
}

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

const UserProfile: React.FC = () => {
  const { handle: rawHandle } = useParams<{ handle: string }>();
  const handleParam = (rawHandle || '').replace(/^@/, '');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [models, setModels] = useState<PublicModelRow[]>([]);
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setProfile(null);
      setModels([]);
      setComments([]);
      setFollowerCount(0);

      if (!handleParam) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Case-insensitive lookup by handle
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('user_id, handle, display_name, avatar_url, bio, created_at')
        .ilike('handle', handleParam)
        .maybeSingle();

      if (cancelled) return;

      if (profileErr || !profileRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = profileRow as ProfileRow;
      setProfile(p);

      // Parallel: follower count, public models, recent comments
      const [followersRes, modelsRes, commentsRes] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', p.user_id),
        supabase
          .from('models')
          .select(
            'id, user_id, name, age, gender, personality, bio, cover_image_url, slug, created_at'
          )
          .eq('user_id', p.user_id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(24),
        supabase
          .from('model_comments')
          .select('id, body, created_at, model_id')
          .eq('user_id', p.user_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      if (typeof followersRes.count === 'number') setFollowerCount(followersRes.count);
      const loadedModels = (modelsRes.data || []) as PublicModelRow[];
      setModels(loadedModels);

      // Enrich recent comments with model name/slug when available (public models only)
      const rawComments = (commentsRes.data || []) as Array<{
        id: string;
        body: string;
        created_at: string;
        model_id: string;
      }>;

      if (rawComments.length > 0) {
        const modelIds = Array.from(new Set(rawComments.map((c) => c.model_id)));
        const { data: modelMeta } = await supabase
          .from('models')
          .select('id, name, slug, is_public')
          .in('id', modelIds);
        if (cancelled) return;
        const metaMap = new Map<string, { name: string; slug: string | null; is_public: boolean }>();
        for (const row of (modelMeta || []) as Array<{
          id: string;
          name: string;
          slug: string | null;
          is_public: boolean;
        }>) {
          metaMap.set(row.id, { name: row.name, slug: row.slug, is_public: row.is_public });
        }
        const enriched: RecentComment[] = rawComments.map((c) => {
          const meta = metaMap.get(c.model_id);
          return {
            ...c,
            model_name: meta?.name || null,
            model_slug: meta?.is_public ? meta?.slug || null : null,
          };
        });
        setComments(enriched);
      } else {
        setComments([]);
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [handleParam]);

  const displayName = useMemo(
    () => profile?.display_name || profile?.handle || 'Creator',
    [profile]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <UserX className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold mt-4 mb-2">Creator not found</h1>
          <p className="text-slate-400 mb-6">
            No creator with the handle{' '}
            <span className="text-amber-300 font-mono">@{handleParam}</span> exists.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/discover">
              <Button className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
                <Compass className="h-4 w-4 mr-1.5" /> Browse Discover
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initial = (displayName || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold">Famous.ai</span>
          </Link>
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-white/10 hover:border-white/30 transition"
          >
            <Compass className="h-3 w-3" /> Discover
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-blue-600/10" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex-shrink-0 shadow-2xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-slate-950">
                    {initial}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{displayName}</h1>
              <div className="mt-1 text-slate-400 text-sm md:text-base font-mono">
                @{profile.handle || 'anon'}
              </div>

              {profile.bio && (
                <p className="mt-4 text-slate-200 text-sm md:text-base leading-relaxed max-w-2xl whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <FollowButton
                  creatorId={profile.user_id}
                  size="md"
                  onRequireAuth={() => setAuthOpen(true)}
                  onChanged={(_f, newCount) => setFollowerCount(newCount)}
                />
                <button
                  type="button"
                  onClick={() => setTipOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition"
                  aria-label={`Send a tip to ${displayName}`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Send tip</span>
                </button>
                <div className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                  <ImageIcon className="h-4 w-4 text-amber-300" />
                  <span className="font-semibold">{models.length}</span>
                  <span className="text-slate-400">
                    public {models.length === 1 ? 'model' : 'models'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                  <UserIcon className="h-4 w-4 text-blue-300" />
                  <span className="font-semibold">{followerCount}</span>
                  <span className="text-slate-400">
                    {followerCount === 1 ? 'follower' : 'followers'}
                  </span>
                </div>
              </div>


              {profile.created_at && (
                <div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Joined{' '}
                  {new Date(profile.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Public models grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold">Public models</h2>
          <div className="text-sm text-slate-400">
            {models.length} {models.length === 1 ? 'model' : 'models'}
          </div>
        </div>

        {models.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-white/5">
            <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-300 font-semibold">No public models yet</div>
            <p className="text-slate-500 text-sm mt-1">
              This creator hasn't published anything publicly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {models.map((m) => {
              const href = m.slug ? `/m/${m.slug}` : '#';
              return (
                <Link
                  key={m.id}
                  to={href}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/50 transition shadow-lg hover:shadow-amber-500/10 flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    {m.cover_image_url ? (
                      <img
                        src={m.cover_image_url}
                        alt={m.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-slate-950">
                          {(m.name[0] || 'M').toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="text-white font-bold text-lg leading-tight line-clamp-1">
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-slate-300 text-xs flex flex-wrap items-center gap-x-1.5">
                        {m.age && <span>{m.age}</span>}
                        {m.gender && <span>· {m.gender}</span>}
                        {m.personality && (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            · <Sparkles className="h-3 w-3" /> {m.personality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent comments */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold">Recent comments</h2>
          <div className="text-sm text-slate-400">
            {comments.length} recent
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-white/5">
            <MessageCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-300 font-semibold">No comments yet</div>
            <p className="text-slate-500 text-sm mt-1">
              This creator hasn't left any public comments.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => {
              const linkable = !!c.model_slug;
              const inner = (
                <div className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-sm font-bold text-slate-950 flex-shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                        <span className="text-slate-200 font-semibold">{displayName}</span>
                        <span>commented</span>
                        {c.model_name && (
                          <>
                            <span>on</span>
                            <span
                              className={`font-semibold ${
                                linkable ? 'text-amber-300' : 'text-slate-300'
                              }`}
                            >
                              {c.model_name}
                            </span>
                          </>
                        )}
                        <span>· {timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-200 whitespace-pre-wrap break-words line-clamp-4">
                        {c.body}
                      </p>
                      {linkable && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                          <Heart className="h-3 w-3" /> View thread
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              return (
                <li key={c.id}>
                  {linkable ? (
                    <Link to={`/m/${c.model_slug}#comments`}>{inner}</Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        Built with{' '}
        <Link to="/" className="text-amber-300 hover:text-amber-200 font-semibold">
          Famous.ai
        </Link>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />

      <TipDialog
        open={tipOpen}
        onOpenChange={setTipOpen}
        creatorUserId={profile.user_id}
        creatorName={displayName}
      />
    </div>

  );
};

export default UserProfile;
