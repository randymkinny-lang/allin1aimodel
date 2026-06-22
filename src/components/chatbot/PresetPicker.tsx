import React from 'react';
import { CHATBOT_PRESETS, type ChatbotPreset } from '@/data/chatbotPresets';
import { Check, Sparkles, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  activePresetId?: string;
  onApply: (preset: ChatbotPreset) => void;
  locked?: boolean;
}

const PresetPicker: React.FC<Props> = ({ activePresetId, onApply, locked }) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-900/30 via-slate-900 to-slate-900 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-white font-semibold">Prebuilt Chatbot Presets</h3>
            {locked && <Badge className="bg-white/10 text-amber-300 border border-amber-400/30">Pro</Badge>}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {CHATBOT_PRESETS.length} fully-designed personas. One click applies every behavior, tone, and rule.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {CHATBOT_PRESETS.map((p) => {
          const active = activePresetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => !locked && onApply(p)}
              disabled={locked}
              className={`relative text-left rounded-xl overflow-hidden border transition group ${
                active
                  ? 'border-amber-400 ring-2 ring-amber-400/50'
                  : 'border-white/10 hover:border-amber-400/50'
              } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${p.gradient}`} />
              <div className="p-4 bg-slate-900/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold mt-0.5">{p.vibe}</div>
                  </div>
                  {active ? (
                    <div className="h-6 w-6 rounded-full bg-amber-400 grid place-items-center flex-shrink-0">
                      <Check className="h-4 w-4 text-slate-950" />
                    </div>
                  ) : locked ? (
                    <Lock className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  ) : null}
                </div>
                <p className="text-slate-300 text-xs mt-2 line-clamp-2">{p.tagline}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{p.snippetIds.length} rules</span>
                  <span>Flirt {p.flirtLevel}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetPicker;
