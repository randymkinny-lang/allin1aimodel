import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Mic, Square, Play, Pause, Download, Wand2, Loader2, RefreshCw, Volume2, AudioLines, Keyboard, Type, Save, BookmarkCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';


interface VoicePreset {
  id: string;
  name: string;
  description: string;
  vibe: string;
  accent: string;
}

// Curated set of premium female voices available on the ElevenLabs gateway.
const FEMALE_VOICES: VoicePreset[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',   description: 'Warm, conversational, girl-next-door',          vibe: 'Sweet & natural',  accent: 'American' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',    description: 'Soft, breathy, intimate whisper-tone',          vibe: 'Flirty & soft',    accent: 'American' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',     description: 'Confident, sultry, late-night radio energy',   vibe: 'Confident & sultry', accent: 'American' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',     description: 'Young, bubbly, playful and upbeat',            vibe: 'Bubbly & playful', accent: 'American' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya',    description: 'Mature, smoky, magnetic boss-energy',           vibe: 'Smoky & mature',   accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte',description: 'Elegant, smooth, slow-burn seductive',          vibe: 'Elegant & smooth', accent: 'British'  },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily',     description: 'Soft British accent, gentle and feminine',     vibe: 'Gentle & posh',    accent: 'British'  },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda',  description: 'Friendly, bright, energetic everyday voice',    vibe: 'Bright & friendly',accent: 'American' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace',    description: 'Southern charm, warm honeyed drawl',           vibe: 'Warm & southern',  accent: 'Southern' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily',    description: 'Calm, meditative, ASMR-soft',                  vibe: 'Calm & soothing',  accent: 'American' },
];

const MAX_TEXT_LEN = 500;

// Pick the best MediaRecorder mimeType the current browser actually supports.
const pickRecorderFormat = (): { mimeType: string; ext: string } => {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' };
  const candidates: Array<{ mimeType: string; ext: string }> = [
    { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
    { mimeType: 'audio/webm', ext: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', ext: 'm4a' },
    { mimeType: 'audio/mp4', ext: 'm4a' },
    { mimeType: 'audio/mpeg', ext: 'mp3' },
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
    } catch {/* ignore */}
  }
  return { mimeType: '', ext: 'webm' };
};

const extFromMime = (mime: string): string => {
  const t = (mime || '').toLowerCase().split(';')[0].trim();
  if (t.includes('webm')) return 'webm';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('mp4') || t.includes('m4a') || t.includes('aac')) return 'm4a';
  if (t.includes('mpeg') || t.includes('mp3')) return 'mp3';
  if (t.includes('wav')) return 'wav';
  return 'webm';
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const SAMPLE_LINES = [
  'Hey you — thinking about you tonight. Wish you were here with me.',
  "I just got out of the shower and I can't stop smiling about our last chat.",
  'Good morning, handsome. Hope your day is as gorgeous as you are.',
  "Tell me what you're wearing… I want to picture it perfectly.",
];

const VoiceChanger: React.FC = () => {
  const { user } = useAuth();
  const [selectedVoice, setSelectedVoice] = useState<VoicePreset>(FEMALE_VOICES[0]);
  const [mode, setMode] = useState<'record' | 'type'>('record');

  // ---------- Recording state ----------
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderMimeRef = useRef<string>('');
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  // ---------- Typing state ----------
  const [typedText, setTypedText] = useState('');
  // Snapshot of the text that produced the *current* output (so renames in the
  // textarea don't change what we save).
  const [outputText, setOutputText] = useState<string | null>(null);

  // ---------- Shared output state ----------
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [outputSource, setOutputSource] = useState<'record' | 'type' | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedThisOutput, setSavedThisOutput] = useState(false);

  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingConverted, setPlayingConverted] = useState(false);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const convertedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (recIntervalRef.current) window.clearInterval(recIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearOutput = () => {
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    setConvertedUrl(null);
    setConvertedBlob(null);
    setOutputSource(null);
    setOutputText(null);
    setPlayingConverted(false);
    setSavedThisOutput(false);
  };

  const resetRecording = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    setOriginalBlob(null);
    setOriginalUrl(null);
    setRecTime(0);
    setPlayingOriginal(false);
    if (outputSource === 'record') clearOutput();
  };

  const startRecording = async () => {
    try {
      resetRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const { mimeType } = pickRecorderFormat();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderMimeRef.current = mr.mimeType || mimeType || '';
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blobType = recorderMimeRef.current || mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setOriginalBlob(blob);
        setOriginalUrl(url);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };
      mr.start();
      setRecording(true);
      setRecTime(0);
      recIntervalRef.current = window.setInterval(() => setRecTime((t) => t + 1), 1000);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access in your browser to record.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recIntervalRef.current) {
      window.clearInterval(recIntervalRef.current);
      recIntervalRef.current = null;
    }
  };

  const togglePlayOriginal = () => {
    if (!originalUrl) return;
    if (!originalAudioRef.current) {
      originalAudioRef.current = new Audio(originalUrl);
      originalAudioRef.current.onended = () => setPlayingOriginal(false);
    } else if (originalAudioRef.current.src !== originalUrl) {
      originalAudioRef.current.src = originalUrl;
    }
    if (playingOriginal) {
      originalAudioRef.current.pause();
      setPlayingOriginal(false);
    } else {
      originalAudioRef.current.play();
      setPlayingOriginal(true);
    }
  };

  const togglePlayConverted = () => {
    if (!convertedUrl) return;
    if (!convertedAudioRef.current) {
      convertedAudioRef.current = new Audio(convertedUrl);
      convertedAudioRef.current.onended = () => setPlayingConverted(false);
    } else if (convertedAudioRef.current.src !== convertedUrl) {
      convertedAudioRef.current.src = convertedUrl;
    }
    if (playingConverted) {
      convertedAudioRef.current.pause();
      setPlayingConverted(false);
    } else {
      convertedAudioRef.current.play();
      setPlayingConverted(true);
    }
  };

  const handleConvertRecording = async () => {
    if (!originalBlob) {
      toast({ title: 'Record something first', description: 'Tap the mic, speak a few seconds, then convert.' });
      return;
    }
    if (originalBlob.size < 2000) {
      toast({
        title: 'Recording too short',
        description: 'Please record at least 1–2 seconds of speech before converting.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    clearOutput();
    try {
      const cleanMime = (originalBlob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';
      const ext = extFromMime(cleanMime);
      const cleanFile = new File([originalBlob], `recording.${ext}`, { type: cleanMime });

      const fd = new FormData();
      fd.append('audio', cleanFile, cleanFile.name);
      fd.append('voice_id', selectedVoice.id);

      const fnUrl = `${(supabase as unknown as { supabaseUrl: string }).supabaseUrl}/functions/v1/voice-changer`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (supabase as unknown as { supabaseKey: string }).supabaseKey;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        let msg = 'Conversion failed';
        try {
          const j = await res.json();
          msg = j.error || msg;
          if (j.detail) console.error('voice-changer detail:', j.detail);
        } catch {/* ignore */}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setConvertedUrl(url);
      setConvertedBlob(blob);
      setOutputSource('record');
      setOutputText(null);
      setSavedThisOutput(false);
      toast({
        title: 'Voice converted',
        description: `Now sounds like ${selectedVoice.name}. Hit play to hear it.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not convert voice',
        description: (err as Error).message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };


  const handleSynthesizeText = async () => {
    const text = typedText.trim();
    if (!text) {
      toast({
        title: 'Type a message first',
        description: 'Write something you want her to say, then tap synthesize.',
      });
      return;
    }
    if (text.length > MAX_TEXT_LEN) {
      toast({
        title: 'Message too long',
        description: `Please keep it under ${MAX_TEXT_LEN} characters.`,
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    clearOutput();
    try {
      const fnUrl = `${(supabase as unknown as { supabaseUrl: string }).supabaseUrl}/functions/v1/text-to-voice`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (supabase as unknown as { supabaseKey: string }).supabaseKey;

      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, voice_id: selectedVoice.id }),
      });

      if (!res.ok) {
        let msg = 'Synthesis failed';
        try {
          const j = await res.json();
          msg = j.error || msg;
          if (j.detail) console.error('text-to-voice detail:', j.detail);
        } catch {/* ignore */}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setConvertedUrl(url);
      setConvertedBlob(blob);
      setOutputSource('type');
      setOutputText(text);
      setSavedThisOutput(false);
      toast({
        title: 'Voice ready',
        description: `${selectedVoice.name} just spoke your message. Hit play to hear it.`,
      });

    } catch (err) {
      console.error(err);
      toast({
        title: 'Could not synthesize voice',
        description: (err as Error).message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const downloadConverted = () => {
    if (!convertedUrl) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    a.download = `voice-message-${selectedVoice.name.toLowerCase()}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Measure duration of an audio blob by loading it via an <audio> element.
  const measureDurationMs = (url: string): Promise<number | null> =>
    new Promise((resolve) => {
      try {
        const a = new Audio();
        a.preload = 'metadata';
        let done = false;
        const finish = (ms: number | null) => {
          if (done) return;
          done = true;
          resolve(ms);
        };
        a.onloadedmetadata = () => {
          const d = a.duration;
          if (Number.isFinite(d) && d > 0) finish(Math.round(d * 1000));
          else finish(null);
        };
        a.onerror = () => finish(null);
        // Safety net — never hang the save flow on a flaky decoder.
        setTimeout(() => finish(null), 4000);
        a.src = url;
      } catch {
        resolve(null);
      }
    });

  const handleSaveToLibrary = async () => {
    if (!convertedBlob || !convertedUrl || !outputSource) {
      toast({ title: 'Nothing to save', description: 'Generate a voice first, then save it.' });
      return;
    }
    if (!user) {
      toast({
        title: 'Sign in to save',
        description: 'Create a free account to save clips to your library.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const durationMs = await measureDurationMs(convertedUrl);

      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `${user.id}/${ts}-${rand}.mp3`;

      // Force the storage MIME to audio/mpeg since the function returns mp3.
      const mp3Blob = convertedBlob.type === 'audio/mpeg'
        ? convertedBlob
        : new Blob([convertedBlob], { type: 'audio/mpeg' });

      const { error: upErr } = await supabase
        .storage
        .from('voice-clips')
        .upload(path, mp3Blob, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('voice-clips').getPublicUrl(path);
      const audioUrl = pub.publicUrl;
      if (!audioUrl) throw new Error('Could not get a public URL for the uploaded clip.');

      const defaultName = outputSource === 'type'
        ? `${selectedVoice.name} · ${(outputText || 'Typed message').slice(0, 40)}`
        : `${selectedVoice.name} · Recorded ${new Date().toLocaleDateString()}`;

      const { error: insErr } = await supabase
        .from('voice_clips')
        .insert({
          user_id: user.id,
          voice_name: defaultName,
          voice_id: selectedVoice.id,
          source: outputSource,
          text: outputSource === 'type' ? outputText : null,
          audio_url: audioUrl,
          storage_path: path,
          duration_ms: durationMs,
        });
      if (insErr) {
        // Roll back the storage upload if the row insert fails.
        try { await supabase.storage.from('voice-clips').remove([path]); } catch {/* ignore */}
        throw insErr;
      }

      setSavedThisOutput(true);
      window.dispatchEvent(new CustomEvent('voice-clip-saved'));
      toast({
        title: 'Saved to your library',
        description: 'Find it in "My voice clips" below.',
      });
    } catch (err) {
      console.error('Save to library failed', err);
      toast({
        title: 'Could not save clip',
        description: (err as Error).message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };


  const charCount = typedText.length;
  const charPercent = Math.min(100, (charCount / MAX_TEXT_LEN) * 100);
  const charColor = charCount > MAX_TEXT_LEN ? 'text-red-400' : charCount > MAX_TEXT_LEN * 0.9 ? 'text-amber-400' : 'text-slate-400';

  return (
    <section id="voice-changer" className="py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-pink-400 text-sm font-semibold tracking-wider uppercase mb-3">
            <AudioLines className="h-4 w-4" /> Voice Changer
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Speak in Her Voice</h2>
          <p className="mt-3 text-slate-400">
            Record yourself or type a message, pick a female persona, and instantly generate
            an attractive AI voice — perfect for voice notes that match your model's character.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Voice presets */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-pink-400" /> Choose a voice
                </h3>
                <Badge className="bg-pink-500/15 text-pink-300 border-pink-500/30">
                  {FEMALE_VOICES.length} options
                </Badge>
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {FEMALE_VOICES.map((v) => {
                  const active = v.id === selectedVoice.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        active
                          ? 'border-pink-400/60 bg-pink-500/10'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-white">{v.name}</div>
                        <Badge variant="outline" className={`text-[10px] ${active ? 'border-pink-400/50 text-pink-200' : 'border-white/15 text-slate-400'}`}>
                          {v.accent}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{v.description}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-pink-300/80 font-medium">
                        {v.vibe}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Input + output */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'record' | 'type')}>
              <TabsList className="grid grid-cols-2 w-full bg-slate-900/60 border border-white/10 p-1">
                <TabsTrigger
                  value="record"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white text-slate-300 gap-2"
                >
                  <Mic className="h-4 w-4" /> Record voice
                </TabsTrigger>
                <TabsTrigger
                  value="type"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white text-slate-300 gap-2"
                >
                  <Keyboard className="h-4 w-4" /> Type instead of record
                </TabsTrigger>
              </TabsList>

              {/* RECORD TAB */}
              <TabsContent value="record" className="mt-6 space-y-6">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Mic className="h-4 w-4 text-pink-400" /> Step 1 · Record yourself
                    </h3>
                    {(originalUrl || recording) && (
                      <button
                        onClick={resetRecording}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3" /> Reset
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center py-6">
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      className={`relative h-28 w-28 rounded-full flex items-center justify-center transition shadow-2xl ${
                        recording
                          ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
                          : 'bg-gradient-to-br from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 shadow-pink-500/40'
                      }`}
                    >
                      {recording ? <Square className="h-10 w-10 text-white" /> : <Mic className="h-10 w-10 text-white" />}
                      {recording && (
                        <span className="absolute inset-0 rounded-full border-4 border-red-400/40 animate-ping" />
                      )}
                    </button>
                    <div className="mt-4 text-center">
                      {recording ? (
                        <>
                          <div className="text-2xl font-mono font-bold text-red-400">{formatTime(recTime)}</div>
                          <div className="text-xs text-slate-400 mt-1">Recording… tap to stop</div>
                        </>
                      ) : originalUrl ? (
                        <>
                          <div className="text-sm text-emerald-300 font-medium">Recorded · {formatTime(recTime)}</div>
                          <div className="text-xs text-slate-400 mt-1">Looks good. Convert it below.</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-slate-300 font-medium">Tap to start recording</div>
                          <div className="text-xs text-slate-500 mt-1">Speak naturally — 5–30 seconds works best</div>
                        </>
                      )}
                    </div>
                  </div>

                  {originalUrl && !recording && (
                    <div className="mt-2 flex items-center justify-center gap-3 pt-4 border-t border-white/5">
                      <Button onClick={togglePlayOriginal} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        {playingOriginal ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        {playingOriginal ? 'Pause original' : 'Play original'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <Button
                    onClick={handleConvertRecording}
                    disabled={!originalBlob || busy}
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 hover:from-pink-400 hover:via-fuchsia-400 hover:to-purple-400 text-white font-semibold px-8 shadow-xl shadow-fuchsia-500/30 disabled:opacity-50"
                  >
                    {busy ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Converting to {selectedVoice.name}…</>
                    ) : (
                      <><Wand2 className="h-5 w-5 mr-2" /> Convert to {selectedVoice.name}'s voice</>
                    )}
                  </Button>
                  {!originalBlob && (
                    <p className="mt-2 text-xs text-slate-500">Record audio first to enable conversion</p>
                  )}
                </div>
              </TabsContent>

              {/* TYPE TAB */}
              <TabsContent value="type" className="mt-6 space-y-6">
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Type className="h-4 w-4 text-pink-400" /> Step 1 · Type her message
                    </h3>
                    <span className={`text-xs font-mono ${charColor}`}>
                      {charCount}/{MAX_TEXT_LEN}
                    </span>
                  </div>

                  <Textarea
                    value={typedText}
                    onChange={(e) => {
                      const next = e.target.value;
                      // Soft cap: trim anything past the limit
                      setTypedText(next.length > MAX_TEXT_LEN ? next.slice(0, MAX_TEXT_LEN) : next);
                    }}
                    placeholder={`Type what you want ${selectedVoice.name} to say…`}
                    className="min-h-[160px] bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-pink-500/40 focus-visible:border-pink-400/50 resize-none"
                    maxLength={MAX_TEXT_LEN}
                  />

                  <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        charCount > MAX_TEXT_LEN * 0.9
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-pink-500 to-fuchsia-500'
                      }`}
                      style={{ width: `${charPercent}%` }}
                    />
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                      Need inspiration? Try one of these
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_LINES.map((line, i) => (
                        <button
                          key={i}
                          onClick={() => setTypedText(line)}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-pink-500/10 hover:border-pink-400/40 hover:text-pink-200 transition truncate max-w-full"
                          title={line}
                        >
                          {line.length > 50 ? line.slice(0, 50) + '…' : line}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Tip: shorter, conversational lines sound the most natural.</span>
                    {typedText && (
                      <button
                        onClick={() => setTypedText('')}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <Button
                    onClick={handleSynthesizeText}
                    disabled={!typedText.trim() || busy}
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 hover:from-pink-400 hover:via-fuchsia-400 hover:to-purple-400 text-white font-semibold px-8 shadow-xl shadow-fuchsia-500/30 disabled:opacity-50"
                  >
                    {busy ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Synthesizing in {selectedVoice.name}…</>
                    ) : (
                      <><Wand2 className="h-5 w-5 mr-2" /> Synthesize in {selectedVoice.name}'s voice</>
                    )}
                  </Button>
                  {!typedText.trim() && (
                    <p className="mt-2 text-xs text-slate-500">Type a message to enable synthesis</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Output */}
            <div className={`rounded-2xl border p-6 transition ${
              convertedUrl
                ? 'border-pink-400/40 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/5 to-transparent'
                : 'border-white/10 bg-white/[0.02]'
            }`}>
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <Volume2 className="h-4 w-4 text-pink-400" />
                Step 2 · Your {outputSource === 'type' ? 'synthesized' : 'converted'} voice message
              </h3>

              {convertedUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-950/60 border border-white/10 p-4">
                    <button
                      onClick={togglePlayConverted}
                      className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 flex items-center justify-center shrink-0"
                    >
                      {playingConverted ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold truncate">{selectedVoice.name}'s voice</div>
                      <div className="text-xs text-slate-400 truncate">
                        {selectedVoice.vibe} · {selectedVoice.accent}
                        {outputSource === 'type' && ' · From typed text'}
                        {outputSource === 'record' && ' · From your recording'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Button
                        onClick={handleSaveToLibrary}
                        disabled={saving || savedThisOutput}
                        className={
                          savedThisOutput
                            ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white border-0'
                        }
                      >
                        {saving ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                        ) : savedThisOutput ? (
                          <><BookmarkCheck className="h-4 w-4 mr-2" /> Saved</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" /> Save to library</>
                        )}
                      </Button>
                      <Button onClick={downloadConverted} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>

                  <audio controls src={convertedUrl} className="w-full" />
                  <p className="text-xs text-slate-500 text-center">
                    {user
                      ? 'Save the MP3 to your library, download it, or send it as a voice message anywhere.'
                      : 'Sign in to save this clip to your private library.'}
                  </p>

                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">
                  <AudioLines className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <div className="text-sm">
                    Your {mode === 'type' ? 'synthesized' : 'converted'} voice message will appear here
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VoiceChanger;
