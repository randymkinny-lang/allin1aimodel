import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MBTI_TYPES } from '@/data/models';
import type { ModelData } from './types';

interface Props {
  data: ModelData;
  update: (patch: Partial<ModelData>) => void;
}

const INTERESTS = [
  'Yoga', 'Travel', 'Photography', 'Cooking', 'Fitness', 'Reading',
  'Music', 'Art', 'Dancing', 'Hiking', 'Coffee', 'Wine',
  'Gaming', 'Fashion', 'Movies', 'Pets', 'Beach', 'Cars',
  'Meditation', 'Writing', 'Skiing', 'Surfing', 'Tech', 'Podcasts',
];

const TraitSlider: React.FC<{ label: string; left: string; right: string; value: number; onChange: (v: number) => void }> = ({ label, left, right, value, onChange }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <Label className="text-slate-300 text-sm">{label}</Label>
      <span className="text-xs text-amber-400 font-semibold">{value < 50 ? left : right} {Math.abs(value - 50) * 2}%</span>
    </div>
    <Slider min={0} max={100} value={[value]} onValueChange={(v) => onChange(v[0])} />
    <div className="flex justify-between text-xs text-slate-500 mt-1">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  </div>
);

const PersonalityTab: React.FC<Props> = ({ data, update }) => {
  const toggleInterest = (i: string) => {
    const has = data.interests.includes(i);
    update({ interests: has ? data.interests.filter((x) => x !== i) : [...data.interests, i] });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-white font-semibold mb-4">Myers-Briggs Personality Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MBTI_TYPES.map((t) => (
            <button
              key={t.code}
              onClick={() => update({ personality: t.code })}
              className={`text-left p-3 rounded-lg border transition ${
                data.personality === t.code
                  ? 'bg-amber-400/10 border-amber-400 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-400/40'
              }`}
            >
              <div className="font-bold text-sm">{t.code}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.name}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-amber-400 font-semibold text-sm">{data.personality} — {MBTI_TYPES.find(t => t.code === data.personality)?.name}</div>
          <div className="text-slate-400 text-sm mt-1">{MBTI_TYPES.find(t => t.code === data.personality)?.desc}</div>
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-4">Fine-Tune Personality Traits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TraitSlider label="Energy" left="Introvert" right="Extrovert" value={data.traits.ei} onChange={(v) => update({ traits: { ...data.traits, ei: v } })} />
          <TraitSlider label="Information" left="Sensing" right="Intuitive" value={data.traits.sn} onChange={(v) => update({ traits: { ...data.traits, sn: v } })} />
          <TraitSlider label="Decisions" left="Thinker" right="Feeler" value={data.traits.tf} onChange={(v) => update({ traits: { ...data.traits, tf: v } })} />
          <TraitSlider label="Lifestyle" left="Judging" right="Perceiving" value={data.traits.jp} onChange={(v) => update({ traits: { ...data.traits, jp: v } })} />
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-4">Interests & Hobbies <span className="text-slate-500 text-sm font-normal">({data.interests.length} selected)</span></h3>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = data.interests.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleInterest(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/50'
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PersonalityTab;
