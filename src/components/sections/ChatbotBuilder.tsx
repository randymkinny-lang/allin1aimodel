import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bot, MessageCircleHeart, Lock, Loader2, Library, Sparkles, ShieldCheck, MessagesSquare } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { upsertSafe } from '@/lib/upsertSafe';
import UpgradePrompt from '@/components/UpgradePrompt';
import DisclosureSettings from './DisclosureSettings';
import TemplateLibrary from '@/components/chatbot/TemplateLibrary';
import TemplateStack from '@/components/chatbot/TemplateStack';
import PresetPicker from '@/components/chatbot/PresetPicker';
import ChatSimulator from '@/components/chatbot/ChatSimulator';
import { assembleSystemPrompt } from '@/data/chatTemplates';
import { CHATBOT_PRESETS, type ChatbotPreset } from '@/data/chatbotPresets';

const DEFAULT_STACK = [
  'tone-warm','tone-human','tone-mirror',
  'flow-open-questions','flow-followups','flow-match-energy',
  'flirt-tease-light','flirt-slow-burn',
  'emo-build-connection','emo-validate',
  'mem-remember-details','mem-reference-later','mem-inside-jokes',
  'pace-short-messages','pace-natural-delays',
  'mon-never-transactional','mon-no-pressure','mon-platform-only','mon-no-sob-stories',
  'safe-disclose-ai','bnd-consent',
  'dont-long-paragraphs','dont-sound-like-ai','dont-push-premium',
];

const ChatbotBuilder: React.FC = () => {
  const { tier } = useSubscription();
  const { user } = useAuth();
  const chatbotLevel = tier.entitlements.chatbot;
  const canUseChatbot = chatbotLevel !== 'none';
  const canUseAdvanced = chatbotLevel === 'full' || chatbotLevel === 'advanced';
  const canUseAdvancedControls = chatbotLevel === 'advanced';
  const canUsePresets = canUseAdvanced;

  const [stack, setStack] = useState<string[]>(DEFAULT_STACK);
  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [customPrompt, setCustomPrompt] = useState('');
  const [autoReply, setAutoReply] = useState(true);
  const [flirtLevel, setFlirtLevel] = useState(60);
  const [upsellAggressiveness, setUpsellAggressiveness] = useState(25);
  const [delay, setDelay] = useState(30);
  const [modelName, setModelName] = useState('Ava');
  const [modelAge, setModelAge] = useState(24);
  const [modelPersonality, setModelPersonality] = useState('ENFP');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setModelName(data.model_name ?? 'Ava');
        setModelAge(data.model_age ?? 24);
        setModelPersonality(data.model_personality ?? 'ENFP');
        if (Array.isArray(data.selected_styles) && data.selected_styles.length > 0) {
          setStack(data.selected_styles);
        }
        setActivePresetId(data.preset_id ?? undefined);
        setCustomPrompt(data.custom_prompt ?? '');
        setAutoReply(!!data.auto_reply);
        setFlirtLevel(data.flirt_level ?? 60);
        setUpsellAggressiveness(data.upsell_aggressiveness ?? 25);
        setDelay(data.response_delay ?? 30);
      }
    })();
  }, [user]);

  const addSnippet = (id: string) => {
    setStack((s) => (s.includes(id) ? s : [...s, id]));
    setActivePresetId(undefined);
  };

  const applyPreset = (preset: ChatbotPreset) => {
    setStack(preset.snippetIds);
    setFlirtLevel(preset.flirtLevel);
    if (canUseAdvancedControls) {
      setUpsellAggressiveness(preset.upsellAggressiveness);
      setDelay(preset.responseDelay);
    }
    setActivePresetId(preset.id);
    toast({ title: `${preset.name} applied`, description: `${preset.snippetIds.length} rules loaded into your stack.` });
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Sign in to save your chatbot configuration.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await upsertSafe(
      'chatbot_settings',
      {
        user_id: user.id,
        model_name: modelName,
        model_age: modelAge,
        model_personality: modelPersonality,
        selected_styles: stack,
        preset_id: activePresetId ?? null,
        custom_prompt: customPrompt,
        auto_reply: autoReply,
        flirt_level: flirtLevel,
        upsell_aggressiveness: upsellAggressiveness,
        response_delay: delay,
        updated_at: new Date().toISOString(),
      },
      ['user_id'],
    );
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Chatbot configured!', description: `${stack.length} rules active. Auto-reply: ${autoReply ? 'on' : 'off'}.` });
  };

  const previewPrompt = assembleSystemPrompt(
    { name: modelName, age: modelAge, personality: modelPersonality },
    stack,
    canUseAdvanced ? customPrompt : '',
  );

  return (
    <section id="chatbot" className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">AI Chatbot Studio</div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Train Your 24/7 Conversation AI</h2>
          <p className="mt-3 text-slate-400">
            Hundreds of drag-and-drop templates. Mix your own stack, or pick from {CHATBOT_PRESETS.length} fully-designed presets.
          </p>
        </div>

        {!canUseChatbot ? (
          <UpgradePrompt
            title="AI Chatbot is a Creator-tier feature"
            description="The 24/7 AI chatbot that auto-replies to your fans, builds rapport, and softly upsells is unlocked starting on the Creator plan."
            requiredTierId="creator"
          />
        ) : (
          <>
            {chatbotLevel === 'basic' && (
              <div className="mb-6">
                <UpgradePrompt
                  variant="inline"
                  title="Basic chatbot active"
                  description={`You're on ${tier.name}. Upgrade to Pro to unlock prebuilt presets, the full template library, and custom system prompts.`}
                  requiredTierId="pro"
                />
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-sky-500/10 border border-emerald-400/20 p-4 mb-6 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white text-sm font-semibold">Safe-by-default templates</div>
                <div className="text-slate-300 text-xs mt-0.5">
                  Every template enforces platform-only monetization and forbids fake hardship / off-platform payment requests. We don't provide scam-style scripts.
                </div>
              </div>
            </div>

            <div className="mb-6">
              <PresetPicker activePresetId={activePresetId} onApply={applyPreset} locked={!canUsePresets} />
              {!canUsePresets && (
                <div className="mt-3">
                  <UpgradePrompt
                    variant="inline"
                    description="Prebuilt presets unlock on Pro."
                    requiredTierId="pro"
                  />
                </div>
              )}
            </div>

            <Tabs defaultValue="build" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
                <TabsTrigger value="build" className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950">
                  <Library className="h-4 w-4 mr-1.5" /> Build Stack
                </TabsTrigger>
                <TabsTrigger value="persona" className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950">
                  <Bot className="h-4 w-4 mr-1.5" /> Persona & Controls
                </TabsTrigger>
                <TabsTrigger value="simulate" className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950">
                  <MessagesSquare className="h-4 w-4 mr-1.5" /> Live Simulator
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950">
                  <Sparkles className="h-4 w-4 mr-1.5" /> Preview Prompt
                </TabsTrigger>
              </TabsList>

              <TabsContent value="build" className="mt-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TemplateLibrary
                    selectedIds={stack}
                    onAdd={addSnippet}
                    onDragStart={() => { /* noop */ }}
                  />
                  <TemplateStack
                    selectedIds={stack}
                    onChange={(ids) => { setStack(ids); setActivePresetId(undefined); }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="persona" className="mt-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Bot className="h-5 w-5 text-amber-400" /> Model Persona
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-slate-400 text-xs mb-1 block">Name</Label>
                          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs mb-1 block">Age</Label>
                          <Input type="number" value={modelAge} onChange={(e) => setModelAge(Number(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs mb-1 block">Personality</Label>
                          <Input value={modelPersonality} onChange={(e) => setModelPersonality(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 relative">
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        Custom System Prompt Add-on
                        {!canUseAdvanced && <Lock className="h-4 w-4 text-amber-400" />}
                      </h3>
                      <Label className="text-slate-400 text-xs mb-2 block">Extend your stack with extra instructions (added after all templates).</Label>
                      <Textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={canUseAdvanced ? "e.g. Always sign off with '— xo'. Never discuss politics. If they mention loneliness, lead with empathy…" : 'Pro tier required to customize the system prompt.'}
                        className="bg-white/5 border-white/10 text-white min-h-[140px]"
                        disabled={!canUseAdvanced}
                      />
                      {!canUseAdvanced && (
                        <div className="mt-4">
                          <UpgradePrompt
                            variant="inline"
                            description="Custom system prompts unlock on Pro."
                            requiredTierId="pro"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                      <h3 className="text-white font-semibold mb-4">Behavior Controls</h3>
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white text-sm font-medium">Auto-reply enabled</div>
                            <div className="text-slate-500 text-xs">Bot replies to new DMs automatically</div>
                          </div>
                          <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-slate-300 text-sm">Flirt Level</Label>
                            <span className="text-amber-400 text-sm font-semibold">{flirtLevel}%</span>
                          </div>
                          <Slider value={[flirtLevel]} onValueChange={(v) => setFlirtLevel(v[0])} max={100} />
                        </div>
                        <div className={!canUseAdvancedControls ? 'opacity-50' : ''}>
                          <div className="flex justify-between mb-2">
                            <Label className="text-slate-300 text-sm flex items-center gap-1">
                              Upsell Aggressiveness
                              {!canUseAdvancedControls && <Lock className="h-3 w-3 text-amber-400" />}
                            </Label>
                            <span className="text-amber-400 text-sm font-semibold">{upsellAggressiveness}%</span>
                          </div>
                          <Slider
                            value={[upsellAggressiveness]}
                            onValueChange={(v) => canUseAdvancedControls && setUpsellAggressiveness(v[0])}
                            max={100}
                            disabled={!canUseAdvancedControls}
                          />
                          {!canUseAdvancedControls && (
                            <div className="text-xs text-slate-500 mt-1">Business tier required.</div>
                          )}
                        </div>
                        <div className={!canUseAdvancedControls ? 'opacity-50' : ''}>
                          <div className="flex justify-between mb-2">
                            <Label className="text-slate-300 text-sm flex items-center gap-1">
                              Response Delay
                              {!canUseAdvancedControls && <Lock className="h-3 w-3 text-amber-400" />}
                            </Label>
                            <span className="text-amber-400 text-sm font-semibold">{delay}s avg</span>
                          </div>
                          <Slider
                            value={[delay]}
                            onValueChange={(v) => canUseAdvancedControls && setDelay(v[0])}
                            min={5}
                            max={300}
                            disabled={!canUseAdvancedControls}
                          />
                          <div className="text-xs text-slate-500 mt-1">Natural-feeling delays make conversations feel human.</div>
                        </div>
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full mt-6 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Configuration
                      </Button>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 to-amber-400/10 border border-amber-400/30 p-6">
                      <MessageCircleHeart className="h-7 w-7 text-amber-400 mb-2" />
                      <div className="text-white font-semibold">Legitimate & Legal</div>
                      <div className="text-slate-300 text-sm mt-1">
                        Your AI must disclose it is an AI when asked. We enforce consent, 18+ verification, platform-only monetization, and truthful interaction — no fabricated hardship or off-platform payment requests.
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="simulate" className="mt-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ChatSimulator
                      systemPrompt={previewPrompt}
                      modelName={modelName}
                      responseDelaySec={canUseAdvancedControls ? delay : 2}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-br from-amber-400/10 to-rose-500/10 border border-amber-400/30 p-5">
                      <div className="text-white font-semibold flex items-center gap-2 mb-2">
                        <MessagesSquare className="h-5 w-5 text-amber-400" /> Live Test
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        This simulator uses your <span className="text-amber-300 font-semibold">currently assembled stack</span> —
                        the {stack.length} active rules + your persona + custom prompt. Edit any tab and come back; replies update instantly.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                      <div className="text-white text-sm font-semibold mb-2">How to use it</div>
                      <ul className="text-slate-400 text-xs space-y-1.5 list-disc pl-4">
                        <li>Pick a fan scenario to auto-start a stress test</li>
                        <li>Or just type as a fan would in the input</li>
                        <li>Watch typing indicator + delay match your settings</li>
                        <li>Hit Reset to clear and try a different angle</li>
                        <li>Tweak the stack on the Build tab — replies adapt live</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <div className="text-white text-sm font-semibold">Safe sandbox</div>
                      </div>
                      <p className="text-slate-300 text-xs">
                        Simulator messages aren't stored in your inbox or shown to fans. It's purely for QA.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-5">

                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-400" /> Assembled System Prompt
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(previewPrompt);
                        toast({ title: 'Copied!', description: 'System prompt copied to clipboard.' });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-lg border border-white/5 max-h-[500px] overflow-y-auto">
{previewPrompt}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8">
              <DisclosureSettings />
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Chatbot Configuration
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ChatbotBuilder;
