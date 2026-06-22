import React, { useState } from 'react';
import { Video, Download, Play, Loader2, X } from 'lucide-react';

export interface MediaItem {
  id?: string;
  image_url: string;        // poster for video OR the image itself
  video_url?: string | null;
  prompt: string;
  media_type: 'image' | 'video';
  aspect_ratio?: string | null;
  duration_seconds?: number | null;
  created_at?: string;
}

interface Props {
  items: MediaItem[];
  loading: boolean;
  loadingGallery: boolean;
  modelKey: string;
  generatingLabel?: string;
}

const MediaGallery: React.FC<Props> = ({ items, loading, loadingGallery, modelKey, generatingLabel }) => {
  const [preview, setPreview] = useState<MediaItem | null>(null);

  const download = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">
          {modelKey}'s Gallery
          <span className="text-slate-500 text-sm font-normal ml-2">
            ({loadingGallery ? '…' : items.length})
          </span>
        </h3>
        {loadingGallery && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
      </div>

      {loading && (
        <div className="mb-3 p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          <div className="text-sm text-amber-200">
            {generatingLabel || `Generating… this usually takes 10–40 seconds.`}
          </div>
        </div>
      )}

      {items.length === 0 && !loading && !loadingGallery && (
        <div className="text-center py-12 rounded-xl bg-white/5 border border-dashed border-white/10 text-slate-500 text-sm">
          No media yet. Enter a prompt above and generate your first AI shot of {modelKey}.
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <button
              key={item.id || i}
              type="button"
              onClick={() => setPreview(item)}
              className="relative aspect-[4/5] rounded-lg overflow-hidden group bg-slate-900 text-left"
            >
              <img src={item.image_url} className="w-full h-full object-cover" alt={item.prompt} />
              {item.media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="h-11 w-11 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-slate-950 ml-0.5" fill="currentColor" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2">
                <div className="text-white text-xs line-clamp-2">{item.prompt}</div>
              </div>
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                {item.media_type === 'image' ? 'IMG' : `VID${item.duration_seconds ? ` · ${item.duration_seconds}s` : ''}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4"
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
            {preview.media_type === 'video' && preview.video_url ? (
              <video
                src={preview.video_url}
                poster={preview.image_url}
                controls
                autoPlay
                className="w-full rounded-xl max-h-[75vh] bg-black"
              />
            ) : (
              <img src={preview.image_url} className="w-full rounded-xl max-h-[75vh] object-contain bg-black" alt="preview" />
            )}
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-slate-300 text-sm flex-1 min-w-0 truncate">{preview.prompt}</div>
              <button
                onClick={() => {
                  const url = preview.media_type === 'video' && preview.video_url ? preview.video_url : preview.image_url;
                  const ext = preview.media_type === 'video' ? 'mp4' : 'png';
                  download(url, `${modelKey}-${preview.id || Date.now()}.${ext}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
