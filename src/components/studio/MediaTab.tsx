import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Video, Sparkles, Loader2, Upload, Film, User2, X, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { ModelData } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import MediaGallery, { type MediaItem } from './MediaGallery';
import UpgradePrompt from '@/components/UpgradePrompt';

const STYLE_PRESETS = [
  { key: 'realistic', label: 'Photorealistic' },
  { key: 'cinematic', label: 'Cinematic' },
  { key: 'editorial', label: 'Editorial' },
  { key: 'golden_hour', label: 'Golden Hour' },
  { key: 'studio', label: 'Studio' },
  { key: 'moody', label: 'Moody' },
  { key: 'natural', label: 'Natural light' },
  { key: 'boudoir', label: 'Boudoir' },
  { key: 'anime', label: 'Anime' },
  { key: 'comic', label: 'Comic' },
];

const SCENES = ['coffee shop', 'beach', 'city street', 'bedroom', 'gym', 'studio', 'forest', 'rooftop'];
const CAMERAS = ['Close-up portrait', 'Half-body', 'Full-body', 'Over-the-shoulder', 'Wide establishing', 'POV selfie'];
const LIGHTING = ['Soft window light', 'Golden hour', 'Neon night', 'Studio strobe', 'Candlelight', 'Overcast daylight'];
const WARDROBE_QUICK = ['Jeans & tee', 'Sundress', 'Athleisure', 'Cozy sweater', 'Little black dress', 'Leather jacket', 'Blazer', 'Bikini'];
const ASPECT_IMAGE = ['1:1', '4:5', '3:4', '16:9', '9:16'];
const ASPECT_VIDEO = ['16:9', '9:16', '1:1'];
const MOTIONS = [
  'Slow dolly-in on the subject',
  'Subject turns head and smiles softly',
  'Gentle hair flow in the breeze',
  'Subject walks forward toward camera',
  'Handheld cinematic sway',
  'Slow 360 orbit around subject',
];

// Videos cost more "generations" than images
const IMAGE_COST = 1;
const VIDEO_COST = 3;

// Fire-and-forget AI moderation pass on every uploaded/generated image.
// We don't await this — generation should feel snappy. The Replicate classifier
// runs server-side and writes a media_flags row for the admin queue.
const queueModeration = (
  media_url: string,
  media_type: 'image' | 'video',
  model_id?: string | null,
  owner_id?: string | null,
) => {
  if (!media_url) return;
  void supabase.functions
    .invoke('moderate-media', {
      body: { action: 'classify', media_url, media_type, model_id, owner_id },
    })
    .catch(() => {
      /* swallow — moderation is best-effort and must not block UX */
    });
};

type Mode = 'image' | 'video' | 'photo2video';

interface MediaTabProps {
  data: ModelData;
  initialMode?: Mode;
}

const MediaTab: React.FC<MediaTabProps> = ({ data, initialMode = 'image' }) => {
  const { user, getIdentityId } = useAuth();
  const { subscription, tier, generationsRemaining, hasQuota, incrementGenerations, isActive } = useSubscription();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [generated, setGenerated] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Keep mode synced if the parent requests a different initial mode (e.g. via hash navigation)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Shared prompt
  const [prompt, setPrompt] = useState('');

  // Image-specific
  const [stylePreset, setStylePreset] = useState('realistic');
  const [sceneKey, setSceneKey] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [lighting, setLighting] = useState('');
  const [wardrobe, setWardrobe] = useState('');
  const [aspectImage, setAspectImage] = useState('4:5');
  const [quality, setQuality] = useState<'hd' | '4k'>('hd');
  const [negative, setNegative] = useState('');
  const [batchCount, setBatchCount] = useState(1);

  // Video-specific
  const [aspectVideo, setAspectVideo] = useState('16:9');
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5);
  const [motionHint, setMotionHint] = useState('');
  // Render engine: 'auto' tries Runway then Kling fallback, otherwise force one provider
  const [preferredProvider, setPreferredProvider] = useState<'auto' | 'runway' | 'kling'>('auto');

  // Photo→Video upload
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const sessionId = getIdentityId();
  const modelKey = data.name?.trim() || 'untitled-model';
  const personaActive = data.usePersonaPlate && !!data.referenceImageUrl;

  // Video generation requires an active paid subscription (any paid tier)
  const videoUnlocked = isActive;
  // 4K quality requires Pro tier or above (advanced customization)
  const hd4kUnlocked = tier.entitlements.customization === 'advanced';

  const loadGallery = useCallback(async () => {
    if (!sessionId) return;
    setLoadingGallery(true);
    const { data: rows, error } = await supabase
      .from('generated_images')
      .select('id, image_url, video_url, prompt, media_type, created_at, aspect_ratio, duration_seconds')
      .eq('session_id', sessionId)
      .eq('model_name', modelKey)
      .order('created_at', { ascending: false })
      .limit(80);
    if (!error && rows) setGenerated(rows as MediaItem[]);
    setLoadingGallery(false);
  }, [sessionId, modelKey]);

  useEffect(() => { loadGallery(); }, [loadGallery, user?.id]);

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Please upload an image under 10 MB.', variant: 'destructive' });
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const identity = sessionId || 'anon';
      const path = `${identity}/p2v-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('personas').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('personas').getPublicUrl(path);
      setUploadedPhoto(pub.publicUrl);
      // Auto-classify uploaded photo for the admin moderation queue
      queueModeration(pub.publicUrl, 'image', null, user?.id ?? null);
      toast({ title: 'Photo uploaded', description: 'Now describe the motion and hit Animate.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Try another image.', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };


  const generateImage = async () => {
    const runs = Math.max(1, Math.min(4, batchCount));
    const cost = runs * IMAGE_COST;

    if (!isActive) {
      toast({
        title: 'Subscription required',
        description: 'Pick a plan below to start generating.',
        variant: 'destructive',
      });
      return;
    }
    if (!hasQuota(cost)) {
      toast({
        title: 'Out of generations',
        description: `You have ${generationsRemaining} left. Upgrade your plan for more.`,
        variant: 'destructive',
      });
      return;
    }
    if (!prompt.trim() && !sceneKey) {
      toast({ title: 'Describe your shot', description: 'Add a prompt or pick a quick scene.' });
      return;
    }

    setLoading(true);
    try {
      const newItems: MediaItem[] = [];
      let successCount = 0;
      for (let i = 0; i < runs; i++) {
        const { data: resp, error } = await supabase.functions.invoke('generate-model-image', {
          body: {
            userPrompt: prompt,
            modelName: modelKey,
            gender: data.gender,
            age: data.age,
            sessionId,
            referenceImageUrl: data.referenceImageUrl || '',
            usePersonaPlate: !!data.usePersonaPlate,
            aspectRatio: aspectImage,
            stylePreset,
            quality,
            negativePrompt: negative,
            sceneKey,
            cameraAngle,
            lighting,
            wardrobeOverride: wardrobe,
            appearance: {
              hair: data.hair, hairLength: data.hairLength, eyes: data.eyes, skin: data.skin,
              body: data.body, style: data.style, ethnicity: data.ethnicity, face: data.face,
              height: data.height, wardrobe: data.wardrobe, vibe: data.vibe,
              freckles: data.freckles, tattoos: data.tattoos, makeup: data.makeup,
            },
          },
        });
        if (error) throw new Error(error.message || 'Generation failed');
        if (!resp?.success || !resp?.imageUrl) throw new Error(resp?.error || 'No image returned');

        // Auto-classify generated image (NSFW/violence) for the admin moderation queue
        queueModeration(resp.imageUrl, 'image', null, user?.id ?? null);
        newItems.push({
          id: resp.row?.id, image_url: resp.imageUrl, prompt, media_type: 'image',
          created_at: resp.row?.created_at, aspect_ratio: aspectImage,
        });
        successCount++;
      }


      if (successCount > 0) {
        await incrementGenerations(successCount * IMAGE_COST);
      }

      setGenerated((g) => [...newItems, ...g]);
      toast({
        title: `${successCount} image${successCount > 1 ? 's' : ''} generated!`,
        description: `${Math.max(0, generationsRemaining - successCount)} generations left this month.`,
      });
      setPrompt('');
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async (useUploadedPhoto = false) => {
    if (!videoUnlocked) {
      toast({
        title: 'Video requires a paid plan',
        description: 'Video generation is included in every paid tier.',
        variant: 'destructive',
      });
      return;
    }
    if (!hasQuota(VIDEO_COST)) {
      toast({
        title: 'Not enough generations',
        description: `Videos cost ${VIDEO_COST} generations. You have ${generationsRemaining}.`,
        variant: 'destructive',
      });
      return;
    }
    const promptImage = useUploadedPhoto
      ? uploadedPhoto
      : personaActive ? data.referenceImageUrl : '';
    if (useUploadedPhoto && !uploadedPhoto) {
      toast({ title: 'Upload a photo first', description: 'Drop in a portrait to animate.', variant: 'destructive' });
      return;
    }
    if (!prompt.trim() && !motionHint) {
      toast({ title: 'Describe the motion', description: 'Tell the AI what should happen in the shot.' });
      return;
    }

    setLoading(true);
    try {
      // STEP 1 — kick off the render job (returns instantly with a jobId).
      // Block-polling to completion inside the edge function would exceed the
      // gateway timeout for Kling (4–6 min renders), so we poll from the client.
      const { data: createResp, error: createErr } = await supabase.functions.invoke('generate-model-video', {
        body: {
          action: 'create',
          promptText: prompt,
          promptImage,
          modelName: modelKey,
          sessionId,
          aspectRatio: aspectVideo,
          duration: videoDuration,
          motionHint,
          preferredProvider,
          appearance: {
            age: data.age, gender: data.gender, ethnicity: data.ethnicity,
            hair: data.hair, hairLength: data.hairLength, eyes: data.eyes,
            body: data.body, style: data.style,
          },
        },
      });

      if (createErr) {
        let msg = createErr.message || 'Video generation failed';
        try {
          // @ts-ignore — context.json() exists on FunctionsHttpError
          const ctx = await (createErr as any)?.context?.json?.();
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!createResp?.success || !createResp?.jobId) {
        throw new Error(createResp?.error || 'Could not start the video render.');
      }

      const provider: string = createResp.provider;
      const jobId: string = createResp.jobId;
      const seedImageUrl: string = createResp.seedImageUrl || promptImage;

      // STEP 2 — poll for completion (client-side, ~3s cadence, up to ~7 min).
      const POLL_INTERVAL_MS = 4000;
      const MAX_POLLS = 105; // 105 * 4s = 420s = 7 minutes
      let videoUrl = '';
      let savedRow: any = null;

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const { data: pollResp, error: pollErr } = await supabase.functions.invoke('generate-model-video', {
          body: {
            action: 'poll',
            provider,
            jobId,
            sessionId,
            modelName: modelKey,
            promptText: prompt,
            promptImage: seedImageUrl,
            aspectRatio: aspectVideo,
            duration: videoDuration,
          },
        });
        if (pollErr) continue; // transient — keep polling
        if (!pollResp?.success) {
          if (pollResp?.status === 'failed') {
            throw new Error(pollResp?.error || 'Video render failed.');
          }
          continue;
        }
        if (pollResp.status === 'succeeded' && pollResp.videoUrl) {
          videoUrl = pollResp.videoUrl;
          savedRow = pollResp.row;
          break;
        }
        // status === 'processing' → keep polling
      }

      if (!videoUrl) {
        throw new Error('Render is taking longer than expected. Check your gallery in a minute — it may still finish.');
      }

      await incrementGenerations(VIDEO_COST);
      queueModeration(videoUrl, 'video', null, user?.id ?? null);

      const newItem: MediaItem = {
        id: savedRow?.id,
        image_url: seedImageUrl || videoUrl,
        video_url: videoUrl,
        prompt: prompt || motionHint,
        media_type: 'video',
        aspect_ratio: aspectVideo,
        duration_seconds: videoDuration,
        created_at: savedRow?.created_at,
      };
      setGenerated((g) => [newItem, ...g]);
      toast({
        title: 'Video ready!',
        description: `${provider === 'replicate' ? 'Rendered via Kling. ' : 'Rendered via Runway. '}${Math.max(0, generationsRemaining - VIDEO_COST)} generations left this month.`,
      });
      setPrompt(''); setMotionHint('');
    } catch (err: any) {
      toast({
        title: 'Video failed',
        description: err.message || 'Both providers are busy. Try a shorter duration or simpler prompt.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };



  const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ active, onClick, children, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        disabled ? 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed opacity-60' :
        active ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/50'
      }`}
    >
      {children}
    </button>
  );

  const quotaPct = subscription
    ? Math.min(100, (subscription.generations_used / Math.max(1, subscription.monthly_generation_limit)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* QUOTA / PLAN BANNER */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMode('image')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${mode === 'image' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10'}`}>
            <ImageIcon className="h-4 w-4" /> Image Generator
          </button>
          <button
            onClick={() => setMode('video')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 relative ${mode === 'video' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10'}`}
          >
            <Video className="h-4 w-4" /> Video Generator
            {!videoUnlocked && <Lock className="h-3 w-3 ml-1" />}
          </button>
          <button
            onClick={() => setMode('photo2video')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 relative ${mode === 'photo2video' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300 border border-white/10'}`}
          >
            <Film className="h-4 w-4" /> Photo → Video
            {!videoUnlocked && <Lock className="h-3 w-3 ml-1" />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider">{tier.name} Plan</div>
            <div className="text-amber-300 text-sm font-semibold">
              {subscription?.is_lifetime ? 'Unlimited' : `${generationsRemaining.toLocaleString()} / ${subscription?.monthly_generation_limit?.toLocaleString() ?? tier.generations.toLocaleString()} left`}
            </div>
          </div>
          {subscription && !subscription.is_lifetime && (
            <div className="w-28 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${quotaPct}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* NO SUBSCRIPTION → Show upgrade prompt */}
      {!isActive && (
        <UpgradePrompt
          title="Subscribe to start generating"
          description="Pick sa plan below to unlock the image & video generator. Starter gets you 100 generations a month for $20."
          requiredTierId="starter"
        />
      )}

      {/* QUOTA EXHAUSTED → Upgrade inline */}
      {isActive && !subscription?.is_lifetime && generationsRemaining === 0 && (
        <UpgradePrompt
          variant="inline"
          title="Out of generations"
          description="You've used all your monthly generations. Upgrade to a higher tier for more."
          requiredTierId={tier.id === 'starter' ? 'creator' : 'agency'}
        />
      )}

      {/* PERSONA STATUS BANNER */}
      {personaActive && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/30">
          <img src={data.referenceImageUrl} alt="persona" className="h-10 w-10 rounded-full object-cover" />
          <div className="flex-1 text-sm">
            <div className="text-emerald-300 font-semibold flex items-center gap-1.5"><User2 className="h-3.5 w-3.5" /> Persona lock: ON</div>
            <div className="text-slate-400 text-xs">Every shot will match the uploaded reference face.</div>
          </div>
        </div>
      )}

      {/* IMAGE MODE */}
      {mode === 'image' && isActive && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Describe your shot</Label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && generateImage()}
                  placeholder="e.g. sipping coffee on a rainy café terrace, laughing softly, warm ambient light"
                  className="bg-white/5 border-white/10 text-white"
                  disabled={loading}
                />
                <Button onClick={generateImage} disabled={loading || generationsRemaining < 1} className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold min-w-[140px]">
                  {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Generate</>}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Style</Label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => (
                  <Chip key={p.key} active={stylePreset === p.key} onClick={() => setStylePreset(p.key)}>{p.label}</Chip>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Quick Scene</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!sceneKey} onClick={() => setSceneKey('')}>Custom</Chip>
                  {SCENES.map((s) => <Chip key={s} active={sceneKey === s} onClick={() => setSceneKey(s)}>{s}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Camera</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!cameraAngle} onClick={() => setCameraAngle('')}>Auto</Chip>
                  {CAMERAS.map((c) => <Chip key={c} active={cameraAngle === c} onClick={() => setCameraAngle(c)}>{c}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Lighting</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!lighting} onClick={() => setLighting('')}>Auto</Chip>
                  {LIGHTING.map((l) => <Chip key={l} active={lighting === l} onClick={() => setLighting(l)}>{l}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Wardrobe override</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={!wardrobe} onClick={() => setWardrobe('')}>Use default</Chip>
                  {WARDROBE_QUICK.map((w) => <Chip key={w} active={wardrobe === w} onClick={() => setWardrobe(w)}>{w}</Chip>)}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Aspect</Label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_IMAGE.map((r) => <Chip key={r} active={aspectImage === r} onClick={() => setAspectImage(r)}>{r}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">
                  Quality {!hd4kUnlocked && <Lock className="h-3 w-3 inline text-amber-400 ml-1" />}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={quality === 'hd'} onClick={() => setQuality('hd')}>HD</Chip>
                  <Chip
                    active={quality === '4k'}
                    onClick={() => hd4kUnlocked ? setQuality('4k') : toast({ title: 'Pro feature', description: 'Upgrade to Pro or higher for 4K Ultra quality.' })}
                    disabled={!hd4kUnlocked}
                  >
                    4K Ultra {!hd4kUnlocked && '🔒'}
                  </Chip>
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Variations</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((n) => <Chip key={n} active={batchCount === n} onClick={() => setBatchCount(n)}>×{n}</Chip>)}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Negative prompt (optional)</Label>
              <Input
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                placeholder="e.g. sunglasses, blurry, extra fingers"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIDEO MODE */}
      {mode === 'video' && (
        !videoUnlocked ? (
          <UpgradePrompt
            title="Video Generator is a paid feature"
            description="Upgrade to the Starter plan to unlock text-to-video generation (Runway Gen-4 Turbo). Videos cost 3 generations each."
            requiredTierId="starter"
          />
        ) : (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Video className="h-3.5 w-3.5" />
              {preferredProvider === 'kling'
                ? 'Powered by Kling v1.6 · 3 generations per video'
                : preferredProvider === 'runway'
                ? 'Powered by Runway Gen-4 Turbo · 3 generations per video'
                : 'Auto: Runway Gen-4 Turbo with Kling fallback · 3 generations per video'}
            </div>

            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Render engine</Label>
              <div className="flex flex-wrap gap-2">
                <Chip active={preferredProvider === 'auto'} onClick={() => setPreferredProvider('auto')}>
                  Auto (smart fallback)
                </Chip>
                <Chip active={preferredProvider === 'runway'} onClick={() => setPreferredProvider('runway')}>
                  Runway Gen-4 Turbo
                </Chip>
                <Chip active={preferredProvider === 'kling'} onClick={() => setPreferredProvider('kling')}>
                  Kling v1.6
                </Chip>
              </div>
              <p className="text-slate-500 text-[11px] mt-1.5">
                {preferredProvider === 'auto'
                  ? 'Tries Runway first, falls back to Kling if Runway is unavailable or out of credits.'
                  : preferredProvider === 'runway'
                  ? 'Runway is best for photoreal cinematic motion. Will fail if out of credits.'
                  : 'Kling is best for stylized motion, anime, and complex movement. Skips Runway entirely.'}
              </p>
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Describe the video</Label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. close-up, she laughs and brushes hair behind her ear, golden-hour café"
                className="bg-white/5 border-white/10 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Motion preset</Label>
              <div className="flex flex-wrap gap-2">
                <Chip active={!motionHint} onClick={() => setMotionHint('')}>Custom / none</Chip>
                {MOTIONS.map((m) => <Chip key={m} active={motionHint === m} onClick={() => setMotionHint(m)}>{m}</Chip>)}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Aspect</Label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_VIDEO.map((r) => <Chip key={r} active={aspectVideo === r} onClick={() => setAspectVideo(r)}>{r}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Duration</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={videoDuration === 5} onClick={() => setVideoDuration(5)}>5 sec</Chip>
                  <Chip active={videoDuration === 10} onClick={() => setVideoDuration(10)}>10 sec</Chip>
                </div>
              </div>
            </div>
            <Button onClick={() => generateVideo(false)} disabled={loading || generationsRemaining < VIDEO_COST} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-semibold">
              {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Rendering (30–90s)…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Generate Video</>}
            </Button>
          </div>
        )
      )}

      {/* PHOTO → VIDEO MODE */}
      {mode === 'photo2video' && (
        !videoUnlocked ? (
          <UpgradePrompt
            title="Photo → Video is a paid feature"
            description="Animate any uploaded photo into a cinematic clip. Available on every paid tier."
            requiredTierId="starter"
          />
        ) : (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider">
              <Film className="h-3.5 w-3.5" />
              {preferredProvider === 'kling'
                ? 'Upload ANY photo → animate it with Kling v1.6 · 3 generations per video'
                : preferredProvider === 'runway'
                ? 'Upload ANY photo → animate it with Runway Gen-4 Turbo · 3 generations per video'
                : 'Upload ANY photo → animate it · auto Runway → Kling fallback · 3 generations per video'}
            </div>

            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Render engine</Label>
              <div className="flex flex-wrap gap-2">
                <Chip active={preferredProvider === 'auto'} onClick={() => setPreferredProvider('auto')}>
                  Auto (smart fallback)
                </Chip>
                <Chip active={preferredProvider === 'runway'} onClick={() => setPreferredProvider('runway')}>
                  Runway Gen-4 Turbo
                </Chip>
                <Chip active={preferredProvider === 'kling'} onClick={() => setPreferredProvider('kling')}>
                  Kling v1.6
                </Chip>
              </div>
              <p className="text-slate-500 text-[11px] mt-1.5">
                {preferredProvider === 'auto'
                  ? 'Tries Runway first, falls back to Kling if Runway is unavailable or out of credits.'
                  : preferredProvider === 'runway'
                  ? 'Runway is best for photoreal cinematic motion. Will fail if out of credits.'
                  : 'Kling is best for stylized motion, anime, and complex movement. Skips Runway entirely.'}
              </p>
            </div>


            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
            />

            {!uploadedPhoto ? (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-white/15 hover:border-amber-400/50 bg-slate-950/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-amber-300 transition"
              >
                {uploadingPhoto ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                <div className="text-sm font-medium">{uploadingPhoto ? 'Uploading…' : 'Click to upload a photo to animate'}</div>
                <div className="text-xs">JPG / PNG / WEBP · up to 10 MB · front-facing portraits work best</div>
              </button>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950">
                <img src={uploadedPhoto} alt="uploaded" className="w-full h-full object-contain" />
                <button
                  onClick={() => setUploadedPhoto('')}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div>
              <Label className="text-slate-300 text-sm mb-2 block">Describe the motion / scene</Label>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. subject smiles warmly and tilts head, gentle wind in hair, cinematic lighting"
                className="bg-white/5 border-white/10 text-white"
                disabled={loading}
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Motion preset</Label>
              <div className="flex flex-wrap gap-2">
                <Chip active={!motionHint} onClick={() => setMotionHint('')}>Custom / none</Chip>
                {MOTIONS.map((m) => <Chip key={m} active={motionHint === m} onClick={() => setMotionHint(m)}>{m}</Chip>)}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Aspect</Label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_VIDEO.map((r) => <Chip key={r} active={aspectVideo === r} onClick={() => setAspectVideo(r)}>{r}</Chip>)}
                </div>
              </div>
              <div>
                <Label className="text-slate-300 text-xs mb-2 block uppercase tracking-wider">Duration</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip active={videoDuration === 5} onClick={() => setVideoDuration(5)}>5 sec</Chip>
                  <Chip active={videoDuration === 10} onClick={() => setVideoDuration(10)}>10 sec</Chip>
                </div>
              </div>
            </div>
            <Button onClick={() => generateVideo(true)} disabled={loading || !uploadedPhoto || generationsRemaining < VIDEO_COST} className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-semibold">
              {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Animating (30–90s)…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Animate Photo</>}
            </Button>
          </div>
        )
      )}

      <MediaGallery
        items={generated}
        loading={loading}
        loadingGallery={loadingGallery}
        modelKey={modelKey}
        generatingLabel={
          mode === 'image'
            ? `Generating ${batchCount > 1 ? batchCount + ' photorealistic shots' : 'a photorealistic shot'} of ${modelKey}…`
            : `Rendering video of ${modelKey} (${preferredProvider === 'kling' ? 'Kling v1.6' : preferredProvider === 'runway' ? 'Runway Gen-4 Turbo' : 'Runway → Kling fallback'})… 30–90 seconds.`
        }

      />
    </div>
  );
};

export default MediaTab;
