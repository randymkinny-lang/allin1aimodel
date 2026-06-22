import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useModels, type SavedModel } from '@/contexts/ModelsContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ShareModelDialog from '@/components/ShareModelDialog';
import {
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Star,
  Trash2,
  Download,
  X,
  FolderOpen,
  Share2,
  Globe,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';


interface GeneratedImage {
  id: string;
  image_url: string;
  prompt: string;
  media_type: string;
  created_at: string;
  model_name: string;
}

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { models, loading: modelsLoading, loadModel, setCoverImage } = useModels();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedModelId = searchParams.get('model');
  const selected: SavedModel | undefined = useMemo(
    () => models.find((m) => m.id === selectedModelId),
    [models, selectedModelId]
  );

  // Navigation helper for header (jumps back to home sections via hash)
  const handleHeaderNav = useCallback(
    (id: string) => {
      if (id === 'top') {
        navigate('/');
        return;
      }
      navigate(`/#${id}`);
    },
    [navigate]
  );

  const openStudio = useCallback(() => {
    navigate('/#studio');
  }, [navigate]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header onNavigate={handleHeaderNav} onStart={openStudio} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-amber-400 mb-4" />
          <h1 className="text-3xl font-bold mb-2">My Gallery</h1>
          <p className="text-slate-400 mb-6">
            Sign in to view the models you've saved and every AI image tied to your account.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
          >
            Go to Home & Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header onNavigate={handleHeaderNav} onStart={openStudio} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {!selected ? (
          <ModelsList
            models={models}
            loading={modelsLoading}
            onSelect={(id) => setSearchParams({ model: id })}
            onEditInStudio={(id) => {
              loadModel(id);
              navigate('/#studio');
            }}
          />
        ) : (
          <ModelGallery
            model={selected}
            onBack={() => setSearchParams({})}
            onEditInStudio={() => {
              loadModel(selected.id);
              navigate('/#studio');
            }}
            setCoverImage={setCoverImage}
            userId={user?.id ?? ''}
          />
        )}
      </main>
    </div>
  );
};

// ---------- Model list view ----------
const ModelsList: React.FC<{
  models: SavedModel[];
  loading: boolean;
  onSelect: (id: string) => void;
  onEditInStudio: (id: string) => void;
}> = ({ models, loading, onSelect, onEditInStudio }) => {
  const [shareModel, setShareModel] = useState<SavedModel | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Keep shareModel in sync with latest models list (so dialog reflects publish state changes)
  const liveShareModel = useMemo(
    () => (shareModel ? models.find((m) => m.id === shareModel.id) || shareModel : null),
    [shareModel, models]
  );

  const openShare = (m: SavedModel) => {
    setShareModel(m);
    setShareOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3">
            <FolderOpen className="h-3.5 w-3.5" /> Your Private Gallery
          </div>
          <h1 className="text-4xl font-bold tracking-tight">My Gallery</h1>
          <p className="text-slate-400 mt-1">
            Every AI model you've saved — click one to browse its photoshoot history.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${models.length} ${models.length === 1 ? 'model' : 'models'} saved`}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && models.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
          <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold">No saved models yet</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Head to the Studio, design your first AI persona, and click Save to see it appear here.
          </p>
        </div>
      )}

      {!loading && models.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {models.map((m) => (
            <div
              key={m.id}
              className="group relative text-left rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-400/50 hover:bg-white/10 transition flex flex-col"
            >
              <button
                onClick={() => onSelect(m.id)}
                className="text-left aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 relative w-full"
              >
                {m.cover_image_url ? (
                  <img
                    src={m.cover_image_url}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-slate-950">
                      {(m.name[0] || 'M').toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                  {m.is_public && (
                    <div className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1">
                      <Globe className="h-3 w-3" /> PUBLIC
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[11px] text-white/90 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(m.created_at).toLocaleDateString()}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-semibold text-lg truncate">{m.name}</div>
                  <div className="text-slate-300 text-xs mt-0.5 truncate">
                    {m.data.age}y/o · {m.data.gender} · {m.data.ethnicity}
                  </div>
                </div>
              </button>

              <div className="p-3 flex items-center justify-between gap-2 bg-slate-900/60">
                <button
                  onClick={() => onSelect(m.id)}
                  className="text-xs text-amber-300 font-medium hover:text-amber-200"
                >
                  View gallery →
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openShare(m);
                    }}
                    title={m.is_public ? 'Manage share link' : 'Share publicly'}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition ${
                      m.is_public
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditInStudio(m.id);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer px-1"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShareModelDialog model={liveShareModel} open={shareOpen} onOpenChange={setShareOpen} />
    </>
  );
};


// ---------- Per-model image gallery ----------
const ModelGallery: React.FC<{
  model: SavedModel;
  onBack: () => void;
  onEditInStudio: () => void;
  setCoverImage: (modelId: string, url: string | null) => Promise<{ error: string | null }>;
  userId: string;
}> = ({ model, onBack, onEditInStudio, setCoverImage, userId }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const loadImages = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('generated_images')
      .select('id, image_url, prompt, media_type, created_at, model_name')
      .eq('session_id', userId)
      .eq('model_name', model.name)
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setImages(data as GeneratedImage[]);
    setLoading(false);
  }, [userId, model.name]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const filtered = useMemo(() => {
    return images.filter((img) => {
      const t = new Date(img.created_at).getTime();
      if (startDate) {
        const s = new Date(startDate).getTime();
        if (t < s) return false;
      }
      if (endDate) {
        // include the whole end day
        const e = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (t > e) return false;
      }
      return true;
    });
  }, [images, startDate, endDate]);

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = async (img: GeneratedImage) => {
    if (!confirm('Delete this image permanently? This cannot be undone.')) return;
    setBusyId(img.id);
    const { error } = await supabase.from('generated_images').delete().eq('id', img.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      setImages((prev) => prev.filter((x) => x.id !== img.id));
      // If this was the current cover, clear it
      if (model.cover_image_url === img.image_url) {
        await setCoverImage(model.id, null);
      }
      toast({ title: 'Image deleted', description: 'Removed from your gallery.' });
    }
    setBusyId(null);
    setPreview(null);
  };

  const handleSetCover = async (img: GeneratedImage) => {
    setBusyId(img.id);
    const res = await setCoverImage(model.id, img.image_url);
    if (res.error) {
      toast({ title: 'Could not set cover', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Cover updated', description: `Set as ${model.name}'s cover image.` });
    }
    setBusyId(null);
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.image_url;
    a.download = `${model.name}-${img.id}.png`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  return (
    <>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 text-sm mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all models
      </button>

      <div className="flex flex-col md:flex-row md:items-center gap-5 mb-8 p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="h-24 w-24 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 flex items-center justify-center">
          {model.cover_image_url ? (
            <img src={model.cover_image_url} className="w-full h-full object-cover" alt={model.name} />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-slate-950">
              {(model.name[0] || 'M').toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate">{model.name}</h1>
          <div className="text-slate-400 text-sm mt-1">
            {model.data.age}y/o · {model.data.gender} · {model.data.ethnicity} ·{' '}
            {model.data.hair?.toLowerCase()} hair · {model.data.eyes?.toLowerCase()} eyes
          </div>
          <div className="text-slate-500 text-xs mt-1">
            Created {new Date(model.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShareDialogOpen(true)}
            className={
              model.is_public
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold'
            }
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            {model.is_public ? 'Public · Manage' : 'Share'}
          </Button>
          <Button
            onClick={onEditInStudio}
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Edit in Studio
          </Button>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1">
          <Label className="text-xs text-slate-400 mb-1 block">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-900 border-white/10 text-white"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-slate-400 mb-1 block">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-900 border-white/10 text-white"
          />
        </div>
        <Button
          onClick={clearFilter}
          variant="ghost"
          className="text-slate-300 hover:text-white hover:bg-white/10"
          disabled={!startDate && !endDate}
        >
          Clear
        </Button>
        <div className="text-sm text-slate-400 sm:ml-auto">
          {loading ? 'Loading…' : `${filtered.length} of ${images.length} images`}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
          <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold">
            {images.length === 0 ? 'No images generated yet' : 'No images in that date range'}
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            {images.length === 0
              ? `Generate ${model.name}'s first photo in the Studio.`
              : 'Try widening your filter.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((img) => {
            const isCover = model.cover_image_url === img.image_url;
            const busy = busyId === img.id;
            return (
              <div
                key={img.id}
                className="relative aspect-[4/5] rounded-xl overflow-hidden group bg-slate-900 border border-white/5"
              >
                <img
                  src={img.image_url}
                  alt={img.prompt}
                  onClick={() => setPreview(img)}
                  className="w-full h-full object-cover cursor-pointer"
                />
                {isCover && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> COVER
                  </div>
                )}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                  {new Date(img.created_at).toLocaleDateString()}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
                  <div className="text-white text-[11px] line-clamp-2 mb-2">{img.prompt}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCover(img);
                      }}
                      disabled={busy || isCover}
                      title={isCover ? 'Already cover' : 'Set as cover'}
                      className="flex-1 px-1.5 py-1 rounded bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 text-[10px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Star className="h-3 w-3" /> Cover
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img);
                      }}
                      className="px-1.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img);
                      }}
                      disabled={busy}
                      className="px-1.5 py-1 rounded bg-red-500/80 hover:bg-red-500 text-white disabled:opacity-50"
                      title="Delete"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
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
              className="rounded-xl object-contain max-h-[80vh] flex-1"
            />
            <div className="md:w-80 p-5 rounded-xl bg-slate-900 border border-white/10 text-slate-200 flex flex-col">
              <div className="text-xs text-slate-500 mb-1">Prompt</div>
              <div className="text-sm mb-4 flex-1 overflow-auto">{preview.prompt}</div>
              <div className="text-xs text-slate-500 mb-1">Generated</div>
              <div className="text-sm mb-4">
                {new Date(preview.created_at).toLocaleString()}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSetCover(preview)}
                  disabled={model.cover_image_url === preview.image_url}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold disabled:opacity-50"
                >
                  <Star className="h-4 w-4 mr-1.5" />
                  {model.cover_image_url === preview.image_url ? 'Current cover' : 'Set as cover'}
                </Button>
                <Button
                  onClick={() => handleDownload(preview)}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
                <Button
                  onClick={() => handleDelete(preview)}
                  variant="outline"
                  className="bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete image
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModelDialog
        model={shareDialogOpen ? model : null}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </>
  );
};


export default Gallery;
