import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Video as VideoIcon, Loader2, Download, RefreshCw, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VideoRow {
  id: string;
  image_url: string;        // poster frame
  video_url: string | null;
  prompt: string;
  media_type: 'image' | 'video';
  aspect_ratio?: string | null;
  duration_seconds?: number | null;
  model_name?: string | null;
  created_at?: string;
}

interface Props {
  /** Optional: only show videos for one model. Omit to show every video for the session. */
  modelName?: string;
}

const VideoGallery: React.FC<Props> = ({ modelName }) => {
  const { getIdentityId, user } = useAuth();
  const sessionId = getIdentityId();

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<VideoRow | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setVideos([]);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('generated_images')
      .select('id, image_url, video_url, prompt, media_type, aspect_ratio, duration_seconds, model_name, created_at')
      .eq('session_id', sessionId)
      .eq('media_type', 'video')
      .order('created_at', { ascending: false })
      .limit(100);

    if (modelName) query = query.eq('model_name', modelName);

    const { data, error } = await query;
    if (!error && data) {
      // Only keep rows that actually have a playable video URL
      setVideos((data as VideoRow[]).filter((r) => !!r.video_url));
    }
    setLoading(false);
  }, [sessionId, modelName]);

  useEffect(() => { load(); }, [load, user?.id]);

  const download = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <VideoIcon className="h-5 w-5 text-purple-400" />
            Your Videos
            <span className="text-slate-500 text-sm font-normal">
              ({loading ? '…' : videos.length})
            </span>
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {modelName
              ? `Every clip you've rendered for ${modelName}.`
              : `Every video you've generated in this session, newest first.`}
          </p>
        </div>
        <Button
          onClick={load}
          variant="outline"
          size="sm"
          disabled={loading}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {loading && videos.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-dashed border-white/10">
          <VideoIcon className="h-10 w-10 mx-auto text-slate-600 mb-3" />
          <div className="text-slate-300 font-medium">No videos yet</div>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Head to the Media tab, switch to Video Generator, and render your first clip. It'll show up here with full playback controls.
          </p>
        </div>
      )}

      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-purple-400/40 transition"
            >
              <div className="relative aspect-video bg-black">
                <video
                  src={v.video_url || undefined}
                  poster={v.image_url || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
                <button
                  type="button"
                  onClick={() => setPreview(v)}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
                  aria-label="Open theater view"
                  title="Theater view"
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </button>
              </div>
              <div className="p-3">
                <div className="text-sm text-white line-clamp-2 min-h-[2.5rem]">
                  {v.prompt || 'Untitled clip'}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {v.aspect_ratio && <span className="px-1.5 py-0.5 rounded bg-white/5">{v.aspect_ratio}</span>}
                    {v.duration_seconds ? <span className="px-1.5 py-0.5 rounded bg-white/5">{v.duration_seconds}s</span> : null}
                    {v.created_at && <span>{new Date(v.created_at).toLocaleDateString()}</span>}
                  </div>
                  <button
                    onClick={() => v.video_url && download(v.video_url, `${(v.model_name || 'video')}-${v.id}.mp4`)}
                    className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
                  >
                    <Download className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && preview.video_url && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <video
              src={preview.video_url}
              poster={preview.image_url || undefined}
              controls
              autoPlay
              playsInline
              className="w-full rounded-xl max-h-[78vh] bg-black"
            />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-slate-300 text-sm flex-1 min-w-0">{preview.prompt}</div>
              <Button
                onClick={() => download(preview.video_url!, `${(preview.model_name || 'video')}-${preview.id}.mp4`)}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Download className="h-4 w-4 mr-1.5" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
