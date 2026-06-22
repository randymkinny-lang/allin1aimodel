import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import LikeButton from '@/components/social/LikeButton';
import FollowButton from '@/components/social/FollowButton';
import CommentsSection from '@/components/social/CommentsSection';
import AuthModal from '@/components/auth/AuthModal';
import TipDialog from '@/components/tips/TipDialog';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  X,
  Globe,
} from 'lucide-react';


interface PublicModelRow {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  ethnicity: string | null;
  hair: string | null;
  eyes: string | null;
  skin: string | null;
  body: string | null;
  style: string | null;
  bio: string | null;
  personality: string | null;
  interests: string[] | null;
  cover_image_url: string | null;
  created_at: string;
  data: any;
}

interface PublicImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

const PublicModel: React.FC = () => {

  const { slug } = useParams<{ slug: string }>();
  const [model, setModel] = useState<PublicModelRow | null>(null);
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [preview, setPreview] = useState<PublicImage | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);

      const { data: modelRow, error: modelErr } = await supabase
        .from('models')
        .select(
          'id, user_id, name, age, gender, ethnicity, hair, eyes, skin, body, style, bio, personality, interests, cover_image_url, created_at, data'
        )
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle();

      if (cancelled) return;

      if (modelErr || !modelRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setModel(modelRow as PublicModelRow);

      const { data: imgs } = await supabase
        .from('generated_images')
        .select('id, image_url, prompt, created_at')
        .eq('session_id', (modelRow as any).user_id)
        .eq('model_name', (modelRow as any).name)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      setImages((imgs || []) as PublicImage[]);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (notFound || !model) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Lock404 />
          <h1 className="text-3xl font-bold mt-4 mb-2">Profile not available</h1>
          <p className="text-slate-400 mb-6">
            This model isn't public — the owner may have unpublished it or the link is wrong.
          </p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
              Go to homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Interests may come from DB column (array) or from data jsonb
  const interests: string[] =
    (Array.isArray(model.interests) && model.interests.length
      ? model.interests
      : Array.isArray(model?.data?.interests)
      ? model.data.interests
      : []) || [];

  const heroImage = model.cover_image_url || images[0]?.image_url;

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
          <div className="flex items-center gap-3">
            <Link
              to="/discover"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-white/10 hover:border-white/30 transition"
            >
              <Sparkles className="h-3 w-3" /> Discover more
            </Link>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-1 rounded-full">
              <Globe className="h-3 w-3" /> Public profile
            </div>
          </div>
        </div>
      </header>


      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="w-full h-full object-cover opacity-30 blur-2xl scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-purple-600/10 to-blue-600/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex-shrink-0 shadow-2xl">
              {heroImage ? (
                <img src={heroImage} alt={model.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-slate-950">
                    {(model.name[0] || 'M').toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{model.name}</h1>
              <div className="mt-2 text-slate-300 text-sm md:text-base flex flex-wrap items-center gap-x-3 gap-y-1">
                {model.age && <span>{model.age} years old</span>}
                {model.gender && <span>· {model.gender}</span>}
                {model.ethnicity && <span>· {model.ethnicity}</span>}
                {model.personality && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-semibold ml-1">
                    <Sparkles className="h-3 w-3" /> {model.personality}
                  </span>
                )}
              </div>

              {(model?.data?.location || model?.data?.occupation) && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                  {model?.data?.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {model.data.location}
                    </span>
                  )}
                  {model?.data?.occupation && (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> {model.data.occupation}
                    </span>
                  )}
                </div>
              )}

              {model.bio && (
                <p className="mt-5 text-slate-200 text-base md:text-lg leading-relaxed max-w-2xl">
                  {model.bio}
                </p>
              )}

              {interests.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium border border-white/10"
                    >
                      <Heart className="h-3 w-3 text-rose-400" /> {i}
                    </span>
                  ))}
                </div>
              )}

              {/* Social actions: Like + Follow + Tip + Comment badge */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <LikeButton modelId={model.id} size="lg" showLabel onRequireAuth={() => setAuthOpen(true)} />
                <FollowButton creatorId={model.user_id} size="lg" onRequireAuth={() => setAuthOpen(true)} />
                <button
                  type="button"
                  onClick={() => setTipOpen(true)}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/30 transition"
                  aria-label={`Send a tip to ${model.name}`}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Send tip</span>
                </button>
                <a
                  href="#comments"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById('comments');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-200 text-sm font-semibold transition"
                  aria-label={`View comments (${commentCount})`}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Comments</span>
                  <span className="tabular-nums text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 text-xs">
                    {commentCount}
                  </span>
                </a>
              </div>


              <div className="mt-5 text-xs text-slate-500 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Profile created{' '}
                {new Date(model.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance + personality traits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="Appearance"
          rows={[
            ['Hair', model.hair],
            ['Eyes', model.eyes],
            ['Skin', model.skin],
            ['Body', model.body],
            ['Style', model.style],
          ]}
        />
        <InfoCard
          title="Details"
          rows={[
            ['Age', model.age ? `${model.age}` : null],
            ['Gender', model.gender],
            ['Ethnicity', model.ethnicity],
            ['Personality', model.personality],
          ]}
        />
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3">
            Interests
          </div>
          {interests.length === 0 ? (
            <div className="text-sm text-slate-500">No interests listed.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {interests.map((i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-xs text-slate-200"
                >
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-bold">Gallery</h2>
          <div className="text-sm text-slate-400">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </div>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-white/5">
            <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-300 font-semibold">No public images yet</div>
            <p className="text-slate-500 text-sm mt-1">Check back soon for new photoshoots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setPreview(img)}
                className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-900 border border-white/5 group"
              >
                <img
                  src={img.image_url}
                  alt={img.prompt}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                  <div className="text-white text-[11px] line-clamp-2">{img.prompt}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Comments */}
      <CommentsSection
        modelId={model.id}
        onCountChange={setCommentCount}
        onRequireAuth={() => setAuthOpen(true)}
      />

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.image_url}
              alt={preview.prompt}
              className="rounded-xl object-contain max-h-[85vh] flex-1"
            />
            <div className="md:w-80 p-5 rounded-xl bg-slate-900 border border-white/10 text-slate-200">
              <div className="text-xs text-slate-500 mb-1">Prompt</div>
              <div className="text-sm mb-4">{preview.prompt}</div>
              <div className="text-xs text-slate-500 mb-1">Generated</div>
              <div className="text-sm">{new Date(preview.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

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
        creatorUserId={model.user_id}
        creatorName={model.name}
      />
    </div>
  );
};


const InfoCard: React.FC<{ title: string; rows: Array<[string, string | null | undefined]> }> = ({
  title,
  rows,
}) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
    <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3">
      {title}
    </div>
    <dl className="space-y-2">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <dt className="text-slate-400">{k}</dt>
            <dd className="text-white font-medium">{v}</dd>
          </div>
        ))}
    </dl>
  </div>
);

const Lock404: React.FC = () => (
  <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
    <Globe className="h-8 w-8 text-red-400" />
  </div>
);

export default PublicModel;
