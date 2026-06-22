import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import type { ModelData } from './types';
import { toast } from '@/components/ui/use-toast';

interface Props {
  data: ModelData;
  update: (patch: Partial<ModelData>) => void;
}

const BioTab: React.FC<Props> = ({ data, update }) => {
  const generateBio = () => {
    const interestsText = data.interests.length > 0 ? data.interests.slice(0, 4).join(', ') : 'exploring the world';
    const generated = `Hey, I'm ${data.name || 'your new favorite'} ✨ ${data.age}-year-old ${data.occupation || 'creative soul'}${data.location ? ` based in ${data.location}` : ''}. Obsessed with ${interestsText}. ${data.personality === 'ENFP' ? 'Always down for spontaneous adventures' : 'Deep conversations are my love language'}. Slide into my DMs — I bite only if you ask nicely 😉`;
    update({ bio: generated });
    toast({ title: 'Bio generated!', description: 'Tweak it to make it yours.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Location</Label>
          <Input value={data.location} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Los Angeles, CA" className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">Occupation</Label>
          <Input value={data.occupation} onChange={(e) => update({ occupation: e.target.value })} placeholder="e.g. Yoga Instructor" className="bg-white/5 border-white/10 text-white" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-slate-300 text-sm">Bio <span className="text-slate-500">({data.bio.length}/500)</span></Label>
          <Button type="button" size="sm" onClick={generateBio} variant="outline" className="bg-white/5 border-white/10 text-amber-400 hover:bg-amber-400/10">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Auto-generate
          </Button>
        </div>
        <Textarea
          value={data.bio}
          onChange={(e) => update({ bio: e.target.value.slice(0, 500) })}
          placeholder="Tell the world who your AI model is. Voice, hobbies, dreams, quirks…"
          className="bg-white/5 border-white/10 text-white min-h-[200px]"
        />
      </div>

      <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Preview</div>
        <div className="text-white font-bold">{data.name || 'Your Model'}{data.age ? `, ${data.age}` : ''}</div>
        <div className="text-slate-400 text-sm">{data.occupation}{data.location ? ` • ${data.location}` : ''}</div>
        <div className="text-slate-300 text-sm mt-3 whitespace-pre-wrap">{data.bio || 'Bio will appear here…'}</div>
        {data.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.interests.map((i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-xs">{i}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BioTab;
