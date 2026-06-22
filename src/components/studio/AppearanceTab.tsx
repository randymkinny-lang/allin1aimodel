import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Trash2, User2, Sparkles, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePrompt from '@/components/UpgradePrompt';
import type { ModelData } from './types';

const pickerOptions = {
  hair: ['Brunette', 'Blonde', 'Black', 'Red', 'Auburn', 'Dark Brown', 'Platinum', 'Strawberry Blonde', 'Honey', 'Chestnut', 'Jet Black', 'Silver'],
  eyes: ['Brown', 'Hazel', 'Green', 'Blue', 'Gray', 'Amber', 'Violet', 'Deep Brown'],
  skin: ['Porcelain', 'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Bronze', 'Deep', 'Ebony'],
  body: ['Petite', 'Slim', 'Slender', 'Athletic', 'Toned', 'Curvy', 'Average', 'Hourglass', 'Muscular', 'Plus'],
  face: ['Heart-shaped', 'Oval', 'Round', 'Square', 'Diamond', 'Long', 'Triangle'],
  style: ['Casual', 'Elegant', 'Sporty', 'Bohemian', 'Classic', 'Edgy', 'Preppy', 'Streetwear', 'Vintage', 'Minimalist', 'Gothic', 'Cottagecore'],
  ethnicity: ['Caucasian', 'Latina', 'Asian', 'East Asian', 'South Asian', 'African', 'African-American', 'Middle Eastern', 'Pacific Islander', 'Native American', 'Mixed'],
  hairLength: ['Pixie', 'Short', 'Bob', 'Shoulder-length', 'Long', 'Very Long', 'Waist-length'],
  wardrobe: ['Jeans & tee', 'Sundress', 'Athleisure', 'Business casual', 'Cozy sweater', 'Little black dress', 'Boho maxi', 'Leather jacket', 'Oversized hoodie', 'Blazer & jeans', 'Crop top & skirt', 'Lingerie', 'Bikini', 'Evening gown'],
  vibe: ['Warm & approachable', 'Mysterious & sultry', 'Bubbly & playful', 'Confident & powerful', 'Soft & dreamy', 'Edgy & rebellious', 'Sophisticated & poised', 'Natural & earthy'],
  makeup: ['None', 'Natural', 'No-makeup makeup', 'Soft glam', 'Full glam', 'Smokey eye', 'Bold red lip', 'Dewy', 'Matte'],
};

interface Props {
  data: ModelData;
  update: (patch: Partial<ModelData>) => void;
}

const Picker: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div>
    <Label className="text-slate-300 text-sm mb-2 block">{label}</Label>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            value === o
              ? 'bg-amber-400 text-slate-950 border-amber-400'
              : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/50'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

const AppearanceTab: React.FC<Props> = ({ data, update }) => {
  const { getIdentityId } = useAuth();
  const { tier } = useSubscription();
  const custom = tier.entitlements.customization; // 'basic' | 'full' | 'advanced'
  const hasFull = custom === 'full' || custom === 'advanced';
  const hasAdvanced = custom === 'advanced';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);


  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Please upload an image under 8 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const identity = getIdentityId() || 'anon';
      const path = `${identity}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('personas').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('personas').getPublicUrl(path);
      update({ referenceImageUrl: pub.publicUrl, usePersonaPlate: true });
      toast({ title: 'Reference photo uploaded', description: 'Your AI model will now be generated using this face.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Try a different image.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const clearReference = () => {
    update({ referenceImageUrl: '', usePersonaPlate: false });
  };

  return (
    <div className="space-y-6">
      {/* PERSONA PLATE SECTION */}
      <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-purple-500/10 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <User2 className="h-3.5 w-3.5" /> Persona Source
            </div>
            <h3 className="text-white text-lg font-bold mt-1">Build from scratch — or use a real photo</h3>
            <p className="text-slate-300 text-sm mt-1">
              Generate a fully original AI persona using the traits below, <span className="text-amber-300 font-semibold">or upload a reference photo</span> of a real person to anchor every photo & video to their likeness.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${!data.usePersonaPlate ? 'text-amber-300' : 'text-slate-500'}`}>From Traits</span>
            <Switch
              checked={!!data.usePersonaPlate}
              onCheckedChange={(v) => update({ usePersonaPlate: v })}
              disabled={!data.referenceImageUrl}
            />
            <span className={`text-xs font-medium ${data.usePersonaPlate ? 'text-amber-300' : 'text-slate-500'}`}>From Photo</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 mt-5">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
            {data.referenceImageUrl ? (
              <img src={data.referenceImageUrl} alt="Reference" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-3">
                <User2 className="h-10 w-10 text-slate-600 mx-auto" />
                <div className="text-xs text-slate-500 mt-1">No photo</div>
              </div>
            )}
            {data.usePersonaPlate && data.referenceImageUrl && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold">ACTIVE</div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="bg-amber-400 text-slate-950 hover:bg-amber-500 font-semibold"
              >
                {uploading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1.5" /> Upload reference photo</>}
              </Button>
              {data.referenceImageUrl && (
                <Button onClick={clearReference} variant="outline" className="bg-white/5 border-white/10 text-white">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                </Button>
              )}
            </div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li className="flex gap-1.5"><Sparkles className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" /> Best results: clear, front-facing, well-lit portrait</li>
              <li className="flex gap-1.5"><Sparkles className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" /> Used as identity lock for every image & video you generate</li>
              <li className="flex gap-1.5"><Sparkles className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" /> You must have rights / consent to use the uploaded photo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* BASIC INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Name</Label>
          <Input value={data.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Ava Morgan" className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Age</Label>
          <Input type="number" min={18} max={70} value={data.age} onChange={(e) => update({ age: parseInt(e.target.value) || 18 })} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Gender</Label>
          <div className="flex gap-2">
            {['Female', 'Male', 'Non-binary'].map((g) => (
              <button key={g} onClick={() => update({ gender: g })} className={`flex-1 py-2 rounded-lg text-xs font-medium border ${data.gender === g ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-white/5 text-slate-300 border-white/10'}`}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tier entitlement banner */}
      {!hasFull && (
        <UpgradePrompt
          variant="inline"
          title="Basic customization only"
          description="Your Starter plan unlocks Hair, Eyes, Body Type and Style. Upgrade to Creator for full appearance customization (ethnicity, skin, face, wardrobe, makeup)."
          requiredTierId="creator"
        />
      )}

      <div className={data.usePersonaPlate ? 'opacity-50 pointer-events-none' : ''}>
        {data.usePersonaPlate && (
          <div className="text-xs text-amber-300/80 mb-3">Photo-based persona is ON — these traits are locked to the uploaded face. Turn off the toggle to edit.</div>
        )}

        {/* BASIC-tier customization (always available) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Picker label="Hair Color" value={data.hair} options={pickerOptions.hair} onChange={(v) => update({ hair: v })} />
          <Picker label="Eye Color" value={data.eyes} options={pickerOptions.eyes} onChange={(v) => update({ eyes: v })} />
          <Picker label="Body Type" value={data.body} options={pickerOptions.body} onChange={(v) => update({ body: v })} />
          <Picker label="Style Aesthetic" value={data.style} options={pickerOptions.style} onChange={(v) => update({ style: v })} />
        </div>

        {/* FULL-tier customization (Creator+) */}
        <div className={`relative mt-6 ${!hasFull ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {!hasFull && (
            <div className="absolute -top-3 left-3 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1 z-10">
              <Lock className="h-3 w-3" /> Creator+
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Picker label="Ethnicity" value={data.ethnicity} options={pickerOptions.ethnicity} onChange={(v) => update({ ethnicity: v })} />
            <Picker label="Skin Tone" value={data.skin} options={pickerOptions.skin} onChange={(v) => update({ skin: v })} />
            <Picker label="Hair Length" value={data.hairLength} options={pickerOptions.hairLength} onChange={(v) => update({ hairLength: v })} />
            <Picker label="Face Shape" value={data.face} options={pickerOptions.face} onChange={(v) => update({ face: v })} />
            <Picker label="Default Wardrobe" value={data.wardrobe || ''} options={pickerOptions.wardrobe} onChange={(v) => update({ wardrobe: v })} />
            <Picker label="Makeup" value={data.makeup || ''} options={pickerOptions.makeup} onChange={(v) => update({ makeup: v })} />
          </div>
        </div>

        {/* ADVANCED-tier customization (Pro+) */}
        <div className={`relative mt-6 ${!hasAdvanced ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {!hasAdvanced && (
            <div className="absolute -top-3 left-3 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1 z-10">
              <Lock className="h-3 w-3" /> Pro+
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Picker label="Vibe" value={data.vibe || ''} options={pickerOptions.vibe} onChange={(v) => update({ vibe: v })} />
            <div className="flex flex-col gap-3 justify-center">
              <label className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-slate-300">Freckles</span>
                <Switch checked={!!data.freckles} onCheckedChange={(v) => update({ freckles: v })} />
              </label>
              <label className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-slate-300">Subtle tattoos</span>
                <Switch checked={!!data.tattoos} onCheckedChange={(v) => update({ tattoos: v })} />
              </label>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-slate-300 text-sm">Height</Label>
                <span className="text-amber-400 text-sm font-semibold">{data.height} cm</span>
              </div>
              <Slider min={140} max={210} step={1} value={[data.height]} onValueChange={(v) => update({ height: v[0] })} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-slate-300 text-sm">Build Intensity</Label>
                <span className="text-amber-400 text-sm font-semibold">{data.buildLevel}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[data.buildLevel]} onValueChange={(v) => update({ buildLevel: v[0] })} />
            </div>
          </div>
        </div>

        {!hasAdvanced && hasFull && (
          <div className="mt-4">
            <UpgradePrompt
              variant="inline"
              description="Unlock Vibe, Freckles/Tattoos, Height & Build sliders on Pro."
              requiredTierId="pro"
            />
          </div>
        )}
      </div>


      <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-amber-200/80 text-sm">
        <strong className="text-amber-400">Tip:</strong> Whether generated from scratch or anchored to a real photo, every image & video you produce in the Media tab will carry this exact persona.
      </div>
    </div>
  );
};

export default AppearanceTab;
