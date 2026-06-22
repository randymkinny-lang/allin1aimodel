import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'Twitter/X' },
  { id: 'onlyfans', name: 'OnlyFans' },
  { id: 'fansly', name: 'Fansly' },
  { id: 'facebook', name: 'Facebook' },
];

type Mode = 'bio' | 'first_message' | 'when_asked' | 'custom';

const MODE_LABELS: Record<Mode, { title: string; desc: string; risk: 'low' | 'med' | 'high' }> = {
  bio: { title: 'In Bio (upfront)', desc: 'Bio states "AI companion" on every platform.', risk: 'low' },
  first_message: { title: 'First Message', desc: 'Auto-sent on first DM from a new fan.', risk: 'low' },
  when_asked: { title: 'Only When Asked', desc: 'Only discloses if the fan directly asks.', risk: 'high' },
  custom: { title: 'Custom Message', desc: 'Your own wording, sent based on rules you set.', risk: 'med' },
};

const EXAMPLE_MESSAGES = [
  'Hey! Just so you know, I\'m an AI companion created by the team — real convos, real vibes, AI behind the scenes 💛',
  'Quick heads up: I\'m an AI. The photos and videos are AI-generated too. Happy to keep chatting though!',
  'Transparency first — you\'re talking to an AI character. The creator reviews conversations. Enjoy!',
];

const DisclosureSettings: React.FC = () => {
  const [perPlatform, setPerPlatform] = useState<Record<string, Mode>>({
    instagram: 'bio', tiktok: 'bio', twitter: 'first_message',
    onlyfans: 'when_asked', fansly: 'when_asked', facebook: 'bio',
  });
  const [customMessage, setCustomMessage] = useState('Hey there! I\'m an AI companion — chat, photos, and videos are AI-generated. Enjoy responsibly 💛');
  const [globalOn, setGlobalOn] = useState(true);

  const setMode = (platform: string, mode: Mode) => {
    setPerPlatform((p) => ({ ...p, [platform]: mode }));
  };

  const save = () => {
    toast({
      title: 'Disclosure settings saved',
      description: `Applied to ${Object.keys(perPlatform).length} platforms. Chatbot will honor these rules on every conversation.`,
    });
  };

  const minimalCount = Object.values(perPlatform).filter((m) => m === 'when_asked').length;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" /> Proactive AI Disclosure
          </h3>
          <p className="text-slate-400 text-sm mt-1">Control exactly how and when your chatbot reveals it's an AI — per platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-slate-300 text-xs">Enabled</Label>
          <Switch checked={globalOn} onCheckedChange={setGlobalOn} />
        </div>
      </div>

      {minimalCount > 0 && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/40 p-3 mb-4 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-200">
            <b>Policy warning:</b> {minimalCount} platform{minimalCount === 1 ? '' : 's'} set to "Only when asked." Many platforms (Instagram, TikTok, Meta, FTC guidelines) now require <u>proactive</u> disclosure for AI personas. Minimal disclosure can result in account bans or legal exposure.
          </div>
        </div>
      )}

      <div className="space-y-2">
        {PLATFORMS.map((p) => {
          const mode = perPlatform[p.id];
          const info = MODE_LABELS[mode];
          return (
            <div key={p.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-white font-medium text-sm">{p.name}</div>
                <Badge variant="secondary" className={`text-[10px] ${info.risk === 'high' ? 'bg-red-500/20 text-red-300' : info.risk === 'med' ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {info.risk === 'high' ? 'HIGH RISK' : info.risk === 'med' ? 'MEDIUM' : 'SAFE'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(p.id, m)}
                    className={`text-left p-2 rounded text-xs border transition ${
                      mode === m ? 'bg-amber-400/15 border-amber-400 text-amber-300' : 'border-white/10 text-slate-400 hover:border-white/20'
                    }`}>
                    <div className="font-semibold">{MODE_LABELS[m].title}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{MODE_LABELS[m].desc}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <Label className="text-slate-300 text-sm">Custom disclosure message</Label>
        <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
          className="bg-white/5 border-white/10 text-white mt-2 min-h-[80px]" />
        <div className="mt-2">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Info className="h-3 w-3" /> Examples of good disclosures:</div>
          <div className="space-y-1">
            {EXAMPLE_MESSAGES.map((ex, i) => (
              <button key={i} onClick={() => setCustomMessage(ex)}
                className="block text-left text-xs text-slate-400 hover:text-amber-300 p-2 rounded bg-white/5 border border-white/10 w-full">
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={save} className="w-full mt-5 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
        Save Disclosure Rules
      </Button>
    </div>
  );
};

export default DisclosureSettings;
