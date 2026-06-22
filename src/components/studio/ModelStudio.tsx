import React, { useState } from 'react';
import AppearanceTab from './AppearanceTab';
import PersonalityTab from './PersonalityTab';
import BioTab from './BioTab';
import MediaTab from './MediaTab';
import VideoGallery from './VideoGallery';
import { User, Brain, FileText, Image as ImageIcon, Film, Check, Save, FolderOpen, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useModels } from '@/contexts/ModelsContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ModelData } from './types';
import { randomModelData } from '@/lib/randomModel';


const STEPS = [
  { id: 'appearance', label: 'Appearance', icon: User },
  { id: 'personality', label: 'Personality', icon: Brain },
  { id: 'bio', label: 'Bio', icon: FileText },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: Film },
];

const ModelStudio: React.FC = () => {
  const [step, setStep] = useState('appearance');
  const [mediaMode, setMediaMode] = useState<'image' | 'video' | 'photo2video'>('image');
  const { user } = useAuth();
  const { models, currentId, currentModel, setCurrentModel, saveCurrent, loadModel, deleteModel, newModel } = useModels();
  const [saving, setSaving] = useState(false);

  // Quick Model Launch — randomizes every trait and drops the user straight
  // into the appearance tab with a fresh, fully-populated model.
  const handleQuickLaunch = React.useCallback(() => {
    const rand = randomModelData();
    // Start from a fresh unsaved model so we don't overwrite the current one
    newModel();
    setCurrentModel(rand);
    setStep('appearance');
    toast({
      title: `⚡ Meet ${rand.name}`,
      description: `${rand.age} · ${rand.personality} · ${rand.occupation} — fully randomized and ready. Hit Media to start generating!`,
    });
    setTimeout(() => {
      const el = document.getElementById('studio');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [newModel, setCurrentModel]);

  // Listen for hash changes so the "Generate Photo" / "Generate Video" / "Quick Launch"
  // buttons anywhere in the app can jump straight into the right Studio state.
  React.useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'generate-photo') {
        setStep('media');
        setMediaMode('image');
      } else if (hash === 'generate-video') {
        setStep('media');
        setMediaMode('video');
      } else if (hash === 'animate-photo') {
        setStep('media');
        setMediaMode('photo2video');
      } else if (hash === 'quick-launch') {
        handleQuickLaunch();
        // Clear the hash so the same click can trigger it again later
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [handleQuickLaunch]);

  const update = (patch: Partial<ModelData>) => setCurrentModel((d) => ({ ...d, ...patch }));

  const idx = STEPS.findIndex((s) => s.id === step);
  const next = () => { if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id); };
  const prev = () => { if (idx > 0) setStep(STEPS[idx - 1].id); };


  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Create an account to save models to your library.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await saveCurrent();
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Model saved!', description: `${currentModel.name} is now in your library.` });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await deleteModel(id);
    if (error) {
      toast({ title: 'Delete failed', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: `${name} was removed from your library.` });
    }
  };

  const currentLabel = currentId
    ? models.find((m) => m.id === currentId)?.name || 'Untitled'
    : 'New Model';


  return (
    <section id="studio" className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Creator Studio</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Design Your AI Model</h2>
            <p className="mt-3 text-slate-400">Craft every detail — looks, personality, life story, and gallery. Save multiple models and switch between them anytime.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {currentLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 bg-slate-900 border-white/10 text-white" align="end">
                <DropdownMenuLabel className="text-slate-400">Your Models</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {!user && (
                  <div className="px-2 py-3 text-sm text-slate-400">Sign in to save and load models.</div>
                )}
                {user && models.length === 0 && (
                  <div className="px-2 py-3 text-sm text-slate-400">No saved models yet. Hit Save to add one.</div>
                )}
                {models.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    className="flex items-center justify-between gap-2 focus:bg-white/10 cursor-pointer"
                    onSelect={(e) => { e.preventDefault(); loadModel(m.id); toast({ title: 'Loaded', description: `${m.name} is now active.` }); }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.name); }}
                      className="text-slate-500 hover:text-red-400 p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onSelect={() => newModel()}>
                  <Plus className="h-4 w-4 mr-2" /> Start new model
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleQuickLaunch}
              title="Generate a fully randomized model in one click"
              className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:via-fuchsia-400 hover:to-pink-400 text-white font-semibold shadow-lg shadow-fuchsia-500/30"
            >
              <Zap className="h-4 w-4 mr-2" />
              Quick Model Launch
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : currentId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>


        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8 overflow-x-auto">
            {STEPS.map((s, i) => {
              const active = step === s.id;
              const done = i < idx;
              return (
                <React.Fragment key={s.id}>
                  <button onClick={() => setStep(s.id)} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition ${
                      active ? 'bg-amber-400 border-amber-400 text-slate-950' : done ? 'bg-amber-400/20 border-amber-400 text-amber-400' : 'bg-transparent border-white/20 text-slate-500'
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-sm font-medium hidden sm:inline ${active ? 'text-white' : done ? 'text-amber-400' : 'text-slate-500'}`}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-amber-400' : 'bg-white/10'}`} />}
                </React.Fragment>
              );
            })}
          </div>

          <div>
            {step === 'appearance' && <AppearanceTab data={currentModel} update={update} />}
            {step === 'personality' && <PersonalityTab data={currentModel} update={update} />}
            {step === 'bio' && <BioTab data={currentModel} update={update} />}
            {step === 'media' && <MediaTab data={currentModel} initialMode={mediaMode} />}
            {step === 'videos' && <VideoGallery modelName={currentModel.name?.trim() || undefined} />}


          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            <Button onClick={prev} disabled={idx === 0} variant="outline" className="bg-white/5 border-white/10 text-white disabled:opacity-30">
              Back
            </Button>
            {idx < STEPS.length - 1 ? (
              <Button onClick={next} className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
                Continue →
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-semibold">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save & Launch ✨'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModelStudio;
