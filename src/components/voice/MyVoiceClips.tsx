import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Library, Play, Pause, Pencil, Trash2, Check, X,
  Loader2, Mic, Type, Download, Music2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface VoiceClipRow {
  id: string;
  user_id: string;
  voice_name: string;
  voice_id: string | null;
  source: 'record' | 'type';
  text: string | null;
  audio_url: string;
  storage_path: string | null;
  duration_ms: number | null;
  created_at: string;
}

const formatMs = (ms: number | null) => {
  if (!ms || ms <= 0) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
};

const isTransientFetchError = (err: unknown) => {
  const msg = (err as Error)?.message ?? '';
  return /failed to fetch|networkerror|load failed|fetch failed/i.test(msg);
};

const MyVoiceClips: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [clips, setClips] = useState<VoiceClipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchClips = useCallback(async () => {
    if (!user) {
      setClips([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('voice_clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClips((data || []) as VoiceClipRow[]);
    } catch (err) {
      // Log every failure for debugging
      console.error('Failed to load voice clips', err);
      const msg = (err as Error).message || 'Unknown error';
      setLoadError(msg);
      // Don't disrupt the user with a destructive toast for transient
      // network failures — they'll see the inline retry card and can
      // try again. Only toast for "real" backend errors.
      if (!isTransientFetchError(err)) {
        toast({
          title: 'Could not load clips',
          description: msg,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchClips();
  }, [authLoading, fetchClips]);

  // Listen for "voice-clip-saved" custom events from VoiceChanger
  useEffect(() => {
    const handler = () => fetchClips();
    window.addEventListener('voice-clip-saved', handler);
    return () => window.removeEventListener('voice-clip-saved', handler);
  }, [fetchClips]);


  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = (clip: VoiceClipRow) => {
    if (playingId === clip.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(clip.audio_url);
    audioRef.current = a;
    a.onended = () => setPlayingId(null);
    a.onerror = () => {
      setPlayingId(null);
      toast({
        title: 'Playback failed',
        description: 'This clip could not be played. The file may have been removed.',
        variant: 'destructive',
      });
    };
    a.play()
      .then(() => setPlayingId(clip.id))
      .catch(() => setPlayingId(null));
  };

  const startRename = (clip: VoiceClipRow) => {
    setEditingId(clip.id);
    setEditingName(clip.voice_name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async (clip: VoiceClipRow) => {
    const next = editingName.trim();
    if (!next) {
      toast({ title: 'Name required', description: 'Please enter a non-empty name.' });
      return;
    }
    if (next === clip.voice_name) {
      cancelRename();
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('voice_clips')
        .update({ voice_name: next })
        .eq('id', clip.id);
      if (error) throw error;
      setClips((prev) => prev.map((c) => (c.id === clip.id ? { ...c, voice_name: next } : c)));
      toast({ title: 'Renamed', description: `Clip is now called "${next}".` });
      cancelRename();
    } catch (err) {
      toast({
        title: 'Could not rename',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteClip = async (clip: VoiceClipRow) => {
    if (!window.confirm(`Delete "${clip.voice_name}"? This cannot be undone.`)) return;
    setDeletingId(clip.id);
    try {
      // Best-effort remove the file from storage. RLS on storage may block
      // depending on config; we don't fail the row delete if it does.
      if (clip.storage_path) {
        try {
          await supabase.storage.from('voice-clips').remove([clip.storage_path]);
        } catch (e) {
          console.warn('Storage remove failed (continuing)', e);
        }
      }

      const { error } = await supabase
        .from('voice_clips')
        .delete()
        .eq('id', clip.id);
      if (error) throw error;

      // Stop playback if we just deleted the playing clip
      if (playingId === clip.id && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingId(null);
      }
      setClips((prev) => prev.filter((c) => c.id !== clip.id));
      toast({ title: 'Deleted', description: 'Voice clip removed from your library.' });
    } catch (err) {
      toast({
        title: 'Could not delete',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const downloadClip = (clip: VoiceClipRow) => {
    const a = document.createElement('a');
    a.href = clip.audio_url;
    a.download = `${clip.voice_name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-${clip.id.slice(0, 6)}.mp3`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section id="my-voice-clips" className="py-16 bg-slate-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-semibold tracking-wider uppercase mb-2">
              <Library className="h-4 w-4" /> My voice clips
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">Your saved voice library</h2>
            <p className="mt-2 text-slate-400 max-w-2xl">
              Every clip you save from the Voice Changer lives here. Play, rename, or delete them anytime — only you can see them.
            </p>
          </div>
          <Badge className="bg-white/5 text-slate-300 border-white/10">
            {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
          </Badge>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <Library className="h-10 w-10 mx-auto mb-3 text-slate-500" />
            <h3 className="text-white font-semibold mb-1">Sign in to save voice clips</h3>
            <p className="text-sm text-slate-400">
              Create a free account to save generated voices to your private library.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin text-pink-400" />
            <p className="text-sm text-slate-400">Loading your clips…</p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-amber-200 font-semibold">Couldn&apos;t load your clips</h3>
              <p className="text-sm text-amber-300/80 mt-1 break-words">
                {/failed to fetch|networkerror/i.test(loadError)
                  ? 'Network connection issue. Check your internet and try again.'
                  : loadError}
              </p>
              <Button
                onClick={fetchClips}
                disabled={loading}
                className="mt-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Try again
              </Button>
            </div>
          </div>
        ) : clips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <Music2 className="h-10 w-10 mx-auto mb-3 text-slate-500" />
            <h3 className="text-white font-semibold mb-1">No saved clips yet</h3>
            <p className="text-sm text-slate-400">
              Generate a voice above, then tap <span className="text-pink-300 font-medium">Save to library</span> to keep it here.
            </p>
          </div>

        ) : (
          <div className="grid gap-3">
            {clips.map((clip) => {
              const isPlaying = playingId === clip.id;
              const isEditing = editingId === clip.id;
              const isDeleting = deletingId === clip.id;
              return (
                <div
                  key={clip.id}
                  className="rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 transition p-4 flex flex-wrap md:flex-nowrap items-center gap-4"
                >
                  <button
                    onClick={() => togglePlay(clip)}
                    className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(clip);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          autoFocus
                          maxLength={80}
                          className="h-8 bg-slate-950/60 border-white/10 text-white text-sm"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveRename(clip)}
                          disabled={savingEdit}
                          className="h-8 w-8 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
                        >
                          {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={cancelRename}
                          disabled={savingEdit}
                          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold truncate">{clip.voice_name}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-white/15 text-slate-300 gap-1 py-0 px-1.5"
                        >
                          {clip.source === 'record' ? (
                            <><Mic className="h-2.5 w-2.5" /> Recorded</>
                          ) : (
                            <><Type className="h-2.5 w-2.5" /> Typed</>
                          )}
                        </Badge>
                      </div>
                    )}
                    {!isEditing && clip.text && (
                      <div className="mt-0.5 text-xs text-slate-400 truncate" title={clip.text}>
                        "{clip.text}"
                      </div>
                    )}
                    <div className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{formatDate(clip.created_at)}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono">{formatMs(clip.duration_ms)}</span>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => downloadClip(clip)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startRename(clip)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteClip(clip)}
                        disabled={isDeleting}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyVoiceClips;
