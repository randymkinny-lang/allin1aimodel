import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, RotateCcw, Loader2, Flame, HeartCrack, Sparkles, Frown, Crown, User, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface SimMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface FanScenario {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hint: string;
  opener: string;
}

const SCENARIOS: FanScenario[] = [
  {
    id: 'horny',
    label: 'Horny Fan',
    icon: Flame,
    color: 'from-rose-500 to-red-500',
    hint: 'a very turned-on fan trying to push the conversation sexual immediately, low patience, wants nudes / explicit content fast',
    opener: "damn you're so hot 🥵 send me something to get me going babe",
  },
  {
    id: 'sad',
    label: 'Sad Fan',
    icon: HeartCrack,
    color: 'from-sky-500 to-indigo-500',
    hint: "a lonely, emotionally vulnerable fan who just went through a breakup and is venting. They want to feel heard, not sold to.",
    opener: "hey... rough night. my gf just left me and I don't really have anyone to talk to.",
  },
  {
    id: 'new',
    label: 'New Fan',
    icon: Sparkles,
    color: 'from-amber-400 to-yellow-500',
    hint: 'a brand-new fan who just subscribed/followed, polite, curious, doesn\'t know you yet, wants to get to know you',
    opener: "hey! just found your page, you seem really cool. how's your day going?",
  },
  {
    id: 'rude',
    label: 'Rude Fan',
    icon: Frown,
    color: 'from-slate-500 to-zinc-700',
    hint: 'a rude, entitled fan who is testing limits, throwing insults, calling you a bot, demanding things, possibly trying to get a refund or argue',
    opener: "lol you're probably just a bot. prove me wrong or I'm refunding.",
  },
  {
    id: 'whale',
    label: 'Big-Spender Fan',
    icon: Crown,
    color: 'from-fuchsia-500 to-purple-600',
    hint: 'a high-spending VIP fan (a whale). Already tipped a lot, treats you like a girlfriend, expects priority attention and exclusive vibes',
    opener: "missed you today gorgeous. just sent another tip — what are you up to tonight?",
  },
];

interface ChatSimulatorProps {
  systemPrompt: string;
  modelName: string;
  responseDelaySec: number;
}

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ systemPrompt, modelName, responseDelaySec }) => {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeScenario = SCENARIOS.find((s) => s.id === scenarioId) ?? null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newUserMsg: SimMessage = { role: 'user', content: trimmed, ts: Date.now() };
    const nextHistory = [...messages, newUserMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    // Realistic typing delay (capped so testing doesn't feel painful)
    const delayMs = Math.min(Math.max(responseDelaySec * 1000, 600), 4000);
    setTimeout(() => setTyping(true), 350);

    try {
      const startedAt = Date.now();
      let reply = "hmm one sec, got distracted. say that again?";
      try {
        const { data, error } = await supabase.functions.invoke('chat-simulator', {
          body: {
            system_prompt: systemPrompt,
            history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
            scenario_hint: activeScenario?.hint ?? '',
          },
        });
        if (!error && (data as any)?.reply) {
          reply = (data as any).reply;
        }
      } catch (_e) {
        // swallow — we'll use the soft fallback reply
      }

      // Pad to feel natural
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(delayMs - elapsed, 0);
      await new Promise((r) => setTimeout(r, remaining));

      setTyping(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };


  const handleScenario = (s: FanScenario) => {
    setScenarioId(s.id);
    setMessages([]);
    // Fire the scenario opener as the first user message
    setTimeout(() => sendMessage(s.opener), 50);
  };

  const reset = () => {
    setMessages([]);
    setScenarioId(null);
    setInput('');
    setTyping(false);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Scenario picker */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-br from-purple-600/10 to-amber-400/5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-white text-sm font-semibold">Stress-test fan scenarios</div>
            <div className="text-slate-400 text-xs">Pick a persona — you'll roleplay as them and see how your bot reacts.</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            const isActive = scenarioId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleScenario(s)}
                disabled={loading}
                className={cn(
                  'group relative rounded-xl p-3 text-left transition-all border',
                  isActive
                    ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className={cn('inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br mb-2', s.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-white text-xs font-semibold">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat thread */}
      <div
        ref={scrollRef}
        className="h-[420px] overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.08),_transparent_60%)]"
      >
        {messages.length === 0 && !typing && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center mb-3">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <div className="text-white font-semibold">Test {modelName}'s replies</div>
            <div className="text-slate-400 text-xs mt-1 max-w-xs">
              Pick a fan scenario above, or just type a message below to start chatting as a fan.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} message={m} modelName={modelName} />
        ))}

        {typing && <TypingBubble modelName={modelName} />}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-white/10 p-3 bg-slate-950/60"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">{activeScenario ? activeScenario.label : 'You (as fan)'}</span>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeScenario ? `Reply as ${activeScenario.label}…` : 'Type as a fan…'}
            disabled={loading}
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-[10px] text-slate-500 mt-2 px-1">
          Simulator uses your assembled stack live. Messages aren't saved.
        </div>
      </form>
    </div>
  );
};

const Bubble: React.FC<{ message: SimMessage; modelName: string }> = ({ message, modelName }) => {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-md'
            : 'bg-white/10 text-white border border-white/10 rounded-bl-md',
        )}
      >
        {!isUser && <div className="text-[10px] text-amber-300 font-semibold mb-0.5">{modelName}</div>}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
          <User className="h-3.5 w-3.5 text-slate-300" />
        </div>
      )}
    </div>
  );
};

const TypingBubble: React.FC<{ modelName: string }> = ({ modelName }) => (
  <div className="flex items-end gap-2 justify-start">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center flex-shrink-0">
      <Bot className="h-3.5 w-3.5 text-white" />
    </div>
    <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
      <div className="text-[10px] text-amber-300 font-semibold mb-1">{modelName}</div>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

export default ChatSimulator;
