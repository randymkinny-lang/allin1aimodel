import React, { useCallback, useEffect, useState } from 'react';
import { UserCog, Video, Mic2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CloneUploader from '../clone/CloneUploader';
import CloneList, { type CloneRow } from '../clone/CloneList';
import CloneGenerator from '../clone/CloneGenerator';

const features = [
  {
    icon: Video,
    title: 'Learns your face',
    desc: 'Captures appearance, lighting, and on-camera presence from a single short reference video.'
  },
  {
    icon: Mic2,
    title: 'Mirrors your voice',
    desc: 'Profiles tone, pace, and accent so generated audio sounds unmistakably like you.'
  },
  {
    icon: Sparkles,
    title: 'Studies your mannerisms',
    desc: 'Notes gestures, expressions, and energy so future videos feel authentically you.'
  }
];

const AICloneStudio: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [clones, setClones] = useState<CloneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setClones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_clones')
      .select('id, name, reference_video_url, thumbnail_url, status, analysis, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setClones(data as CloneRow[]);
      if (!selectedId && data.length) {
        const firstReady = data.find((c: any) => c.status === 'ready') || data[0];
        setSelectedId(firstReady.id);
      }
    }
    setLoading(false);
  }, [user, selectedId]);

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const selectedClone = clones.find((c) => c.id === selectedId) || null;

  const handleDeleted = (id: string) => {
    setClones((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <section id="clone" className="py-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold px-3 py-1 mb-4">
            <UserCog className="h-3.5 w-3.5" /> NEW · AI Clone Studio
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Create your <span className="text-amber-400">AI Clone</span>
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Upload a 2–3 minute reference video. We'll learn your face, voice, and mannerisms so you can generate
            videos that look, sound, and act like you — on demand.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
                <div className="rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/30 p-2 w-fit mb-3">
                  <Icon className="h-5 w-5 text-fuchsia-300" />
                </div>
                <p className="text-white font-semibold">{f.title}</p>
                <p className="text-slate-400 text-sm mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {!user && !authLoading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
            <p className="text-white font-medium">Sign in to train an AI clone of yourself.</p>
            <p className="text-slate-400 text-sm mt-1">
              Your reference videos and clones are private to your account.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <CloneUploader onCreated={load} />

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-white font-semibold text-lg">Your clones</h3>
                <span className="text-slate-500 text-xs">
                  {clones.length} clone{clones.length === 1 ? '' : 's'}
                </span>
              </div>
              <CloneList
                clones={clones}
                loading={loading}
                selectedId={selectedId}
                onSelect={(c) => setSelectedId(c.id)}
                onDeleted={handleDeleted}
              />
            </div>

            <CloneGenerator clone={selectedClone} />
          </div>
        )}
      </div>
    </section>
  );
};

export default AICloneStudio;
