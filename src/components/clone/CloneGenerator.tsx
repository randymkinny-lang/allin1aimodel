import React, { useState } from 'react';
import { Loader2, Wand2, Download, Volume2, Image as ImageIcon, Film, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import type { CloneRow } from './CloneList';

interface CloneGeneratorProps {
  clone: CloneRow | null;
}

const CloneGenerator: React.FC<CloneGeneratorProps> = ({ clone }) => {
  const { user } = useAuth();
  const [script, setScript] = useState(
    "Hey everyone, this is my AI clone speaking. I can record videos for you 24/7 — just write the script and I'll deliver it."
  );
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const disabled = !clone || clone.status !== 'ready';

  const handleGenerate = async () => {
    if (!clone) return;
    if (!script.trim() || script.trim().length < 10) {
      setError('Write at least a short sentence for your clone to say.');
      return;
    }
    setError(null);
    setVideoError(null);
    setGenerating(true);
    setAudioUrl(null);
    setImageUrl(null);
    setVideoUrl(null);
    setStage('Synthesizing voice and rendering lip-sync — this can take 1–2 minutes.');

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-clone-content', {
        body: {
          script: script.trim(),
          cloneName: clone.name,
          analysis: clone.analysis,
          referenceVideoUrl: clone.reference_video_url,
          cloneId: clone.id,
          userId: user?.id ?? null,
          mode: 'both' // generates audio + preview image + lip-synced video
        }
      });
      if (fnErr) throw fnErr;

      if (data?.audioDataUrl) setAudioUrl(data.audioDataUrl);
      if (data?.previewImageUrl) setImageUrl(data.previewImageUrl);
      if (data?.videoUrl) setVideoUrl(data.videoUrl);
      if (data?.videoError) setVideoError(data.videoError);

      const allFailed = data?.audioError && data?.imageError && !data?.videoUrl;
      if (allFailed) {
        setError('Generation failed. Please try again.');
      } else {
        if (user) {
          await supabase.from('ai_clone_generations').insert({
            clone_id: clone.id,
            user_id: user.id,
            script: script.trim(),
            audio_url: null,
            preview_image_url: data?.previewImageUrl ?? null,
            video_url: data?.videoUrl ?? null,
            status: data?.videoUrl ? 'complete' : data?.videoError ? 'partial' : 'complete',
            error: data?.videoError || data?.audioError || null
          });
        }
        toast({
          title: data?.videoUrl ? 'Lip-synced video ready' : 'Clone audio ready',
          description: data?.videoUrl
            ? 'Your AI clone delivered the script on camera.'
            : 'Audio is ready — lip-sync may have skipped (see error below).'
        });
      }
    } catch (e: any) {
      console.error('Clone generation error:', e);
      setError(e?.message || 'Generation failed.');
    } finally {
      setGenerating(false);
      setStage('');
    }
  };

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 p-2.5">
          <Wand2 className="h-5 w-5 text-slate-950" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Generate a lip-synced video</h3>
          <p className="text-slate-400 text-sm">
            {clone
              ? `Selected clone: ${clone.name}. We'll synthesize your script in the cloned voice and lip-sync it onto your reference video.`
              : 'Select a trained clone above, then write a script for it to perform.'}
          </p>
        </div>
      </div>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        rows={5}
        placeholder="What should your clone say?"
        className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
      />

      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{script.trim().length} characters</span>
        <span>Tip: Keep it under 60 seconds of speech for best lip-sync results.</span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {generating && stage && (
          <span className="text-xs text-slate-400 inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stage}
          </span>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || generating}
          className="ml-auto px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Generate with {clone?.name || 'clone'}
            </>
          )}
        </button>
      </div>

      {videoUrl && (
        <div className="mt-6 rounded-xl border border-fuchsia-500/30 bg-slate-950/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-fuchsia-300 inline-flex items-center gap-1.5 font-semibold">
              <Film className="h-3.5 w-3.5" /> Lip-synced clone video
            </span>
            <button
              onClick={() => downloadFile(videoUrl, `${clone?.name || 'clone'}-talking.mp4`)}
              className="text-xs text-fuchsia-300 hover:text-fuchsia-200 inline-flex items-center gap-1 font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Download MP4
            </button>
          </div>
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full max-h-[520px] bg-black"
          />
        </div>
      )}

      {videoError && !videoUrl && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Lip-sync skipped</p>
            <p className="text-amber-200/80 text-xs mt-0.5">{videoError}</p>
            <p className="text-amber-200/60 text-xs mt-1">
              Audio is still available below — re-upload a clear face-on reference video on this clone for best results.
            </p>
          </div>
        </div>
      )}

      {(audioUrl || imageUrl) && (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {imageUrl && (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400 inline-flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Preview frame
                </span>
                <button
                  onClick={() => downloadFile(imageUrl, `${clone?.name || 'clone'}-frame.png`)}
                  className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
              <img src={imageUrl} alt="Generated clone frame" className="w-full max-h-96 object-contain bg-black" />
            </div>
          )}
          {audioUrl && (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-400 inline-flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> Cloned voice
                </span>
                <button
                  onClick={() => downloadFile(audioUrl, `${clone?.name || 'clone'}-voice.mp3`)}
                  className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
              <div className="p-4">
                <audio src={audioUrl} controls className="w-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CloneGenerator;
