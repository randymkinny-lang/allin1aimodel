import React, { useRef, useState } from 'react';
import { Upload, Loader2, Sparkles, AlertCircle, CheckCircle2, Video as VideoIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface CloneUploaderProps {
  onCreated?: () => void;
}

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
const MIN_DURATION = 30; // seconds
const MAX_DURATION = 240; // 4 minutes

const captureThumbnail = (file: File): Promise<{ dataUrl: string; duration: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      // Seek to ~25% of the way in for a representative frame.
      video.currentTime = Math.min(Math.max(duration * 0.25, 1), duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = Math.min(video.videoWidth || 720, 720);
        const ratio = (video.videoHeight || 1280) / (video.videoWidth || 720);
        canvas.width = w;
        canvas.height = Math.round(w * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unsupported');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        cleanup();
        resolve({ dataUrl, duration: video.duration || 0 });
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video file'));
    };
  });

const CloneUploader: React.FC<CloneUploaderProps> = ({ onCreated }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStage('idle');
    setProgress(0);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setError('Please choose a video file (mp4, mov, webm).');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('Video is too large. Max size is 200 MB.');
      return;
    }
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Sign in to train an AI clone.', variant: 'destructive' });
      return;
    }
    if (!file || !name.trim()) {
      setError('Add a clone name and a reference video.');
      return;
    }

    try {
      setStage('uploading');
      setProgress(10);
      setError(null);

      // 1) Capture a thumbnail + measure duration locally.
      const { dataUrl, duration } = await captureThumbnail(file);
      if (duration && (duration < MIN_DURATION || duration > MAX_DURATION)) {
        setError(`Reference video should be ${MIN_DURATION}–${MAX_DURATION} seconds. Yours is ${Math.round(duration)}s.`);
        setStage('error');
        return;
      }
      setProgress(25);

      // 2) Upload the video to the public "clones" bucket.
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('clones').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'video/mp4',
        upsert: false
      });
      if (upErr) throw upErr;
      setProgress(55);

      const { data: pub } = supabase.storage.from('clones').getPublicUrl(path);
      const videoUrl = pub.publicUrl;

      // 3) Upload the thumbnail too so we can render it in the clone list.
      const thumbBlob = await (await fetch(dataUrl)).blob();
      const thumbPath = `${user.id}/${Date.now()}-thumb.jpg`;
      await supabase.storage.from('clones').upload(thumbPath, thumbBlob, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false
      });
      const { data: thumbPub } = supabase.storage.from('clones').getPublicUrl(thumbPath);
      const thumbnailUrl = thumbPub.publicUrl;
      setProgress(70);

      // 4) Insert the clone row in "training" state.
      const { data: cloneRow, error: insErr } = await supabase
        .from('ai_clones')
        .insert({
          user_id: user.id,
          name: name.trim(),
          reference_video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status: 'training'
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // 5) Run analysis.
      setStage('analyzing');
      setProgress(80);
      const { data: analyzeData, error: fnErr } = await supabase.functions.invoke('analyze-clone-video', {
        body: { name: name.trim(), videoUrl, thumbnailDataUrl: dataUrl }
      });
      if (fnErr) throw fnErr;
      const analysis = analyzeData?.analysis ?? null;

      // 6) Persist the analysis + flip status to "ready".
      await supabase
        .from('ai_clones')
        .update({
          status: 'ready',
          analysis,
          appearance_profile: analysis?.appearance ?? null,
          voice_profile: analysis?.voice ?? null,
          mannerisms: analysis?.mannerisms ?? null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cloneRow.id);

      setProgress(100);
      setStage('done');
      toast({
        title: 'Clone trained',
        description: `${name.trim()} is ready to generate videos.`
      });
      onCreated?.();
      // Soft reset after a beat so the user sees the success state.
      setTimeout(reset, 1200);
    } catch (e: any) {
      console.error('Clone upload error:', e);
      setError(e?.message || 'Something went wrong while training the clone.');
      setStage('error');
    }
  };

  const stageLabel =
    stage === 'uploading'
      ? 'Uploading reference video…'
      : stage === 'analyzing'
      ? 'Analyzing voice, face & mannerisms…'
      : stage === 'done'
      ? 'Clone ready'
      : '';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 p-2.5">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Train a new clone</h3>
          <p className="text-slate-400 text-sm">
            Upload a 30s–4min reference video. We'll learn your face, voice, and mannerisms.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">
            Clone name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Studio Me"
            className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50"
            disabled={stage === 'uploading' || stage === 'analyzing'}
          />

          <label className="block text-xs uppercase tracking-wide text-slate-400 mt-4 mb-1.5">
            Reference video
          </label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={stage === 'uploading' || stage === 'analyzing'}
            className="w-full rounded-lg border-2 border-dashed border-white/15 bg-slate-950/40 hover:border-fuchsia-500/50 hover:bg-slate-950/70 transition px-4 py-6 flex flex-col items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="h-6 w-6 text-fuchsia-400" />
            <span className="text-white text-sm font-medium">
              {file ? file.name : 'Choose a video'}
            </span>
            <span className="text-slate-500 text-xs">MP4, MOV or WebM · 30s–4min · up to 200 MB</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="rounded-lg bg-slate-950/60 border border-white/10 overflow-hidden flex items-center justify-center min-h-[200px]">
          {previewUrl ? (
            <video src={previewUrl} controls className="w-full h-full max-h-72 object-contain" />
          ) : (
            <div className="text-center px-4 py-8 text-slate-500">
              <VideoIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Your reference video preview will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {(stage === 'uploading' || stage === 'analyzing') && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stageLabel}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Clone trained successfully.
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={stage === 'uploading' || stage === 'analyzing'}
          className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!file || !name.trim() || stage === 'uploading' || stage === 'analyzing'}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-md shadow-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {stage === 'uploading' || stage === 'analyzing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Training…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Train Clone
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CloneUploader;
