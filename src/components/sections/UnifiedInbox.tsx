import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Inbox,
  Send,
  Search,
  Bot,
  Star,
  Lock,
  Loader2,
  Sparkles,
  Plus,
  Plug,
  Zap,
  PlayCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import UpgradePrompt from '@/components/UpgradePrompt';
import ConnectAccountsDialog, { ConnectedAccount } from '@/components/inbox/ConnectAccountsDialog';
import SimulateDmDialog from '@/components/inbox/SimulateDmDialog';

interface Conversation {
  id: string;
  user_id: string;
  fan_name: string;
  platform: string;
  tier: string;
  ltv: number;
  unread: boolean;
  last_message: string | null;
  last_message_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'fan' | 'creator' | 'ai';
  body: string;
  created_at: string;
}

// Demo seed messages used when a platform is freshly connected so the inbox
// isn't empty. Each platform gets one realistic-feeling fan DM.
const PLATFORM_SEEDS: Record<string, { fan_name: string; tier: string; ltv: number; last_message: string }[]> = {
  Instagram: [{ fan_name: 'Michael R.', tier: 'VIP', ltv: 340, last_message: 'Hey, just found your page — your vibe is amazing!' }],
  TikTok: [{ fan_name: 'Avery J.', tier: 'Subscriber', ltv: 60, last_message: 'Your last video had me dying 😂 do you have a Telegram?' }],
  OnlyFans: [{ fan_name: 'Daniel K.', tier: 'Subscriber', ltv: 120, last_message: 'Can you send me that custom video we talked about?' }],
  Telegram: [{ fan_name: 'James B.', tier: 'Free', ltv: 12, last_message: 'Good morning beautiful — how was your weekend?' }],
  Fanvue: [{ fan_name: 'Aiden T.', tier: 'VIP', ltv: 520, last_message: 'Just tipped you $50! Hope your day is going great.' }],
  'Twitter/X': [{ fan_name: 'Ryan P.', tier: 'Subscriber', ltv: 80, last_message: 'Your new photoshoot is unreal. Where was it shot?' }],
  Fansly: [{ fan_name: 'Chris L.', tier: 'Subscriber', ltv: 210, last_message: "Let's plan our next chat — when are you free?" }],
  Threads: [{ fan_name: 'Jamal W.', tier: 'Free', ltv: 5, last_message: 'New here — what kind of content do you usually share?' }],
  Reddit: [{ fan_name: 'u/quietfan42', tier: 'Free', ltv: 0, last_message: 'Hey, big fan from r/yoursub. Do you take customs?' }],
  Patreon: [{ fan_name: 'Maya S.', tier: 'VIP', ltv: 280, last_message: 'Just upgraded to your top tier — what do I get next?' }],
  YouTube: [{ fan_name: 'BlakeFromBoston', tier: 'Free', ltv: 0, last_message: 'Loved the new video. When is the next one dropping?' }],
  Facebook: [{ fan_name: 'Patricia G.', tier: 'Subscriber', ltv: 45, last_message: 'Hi sweetie! Saw your post — you look stunning.' }],
};

// One-shot inbox simulator: realistic messages we drop across whichever
// platforms the user has connected, staggered slightly so the bot can pick
// them up in order and the inbox feels alive.
const SIM_BURST: Record<string, string[]> = {
  Instagram: ["just stumbled on your story — you're glowing 😍", 'are you doing meet & greets this year?'],
  TikTok: ["your dance edit is everywhere on my fyp lol", 'what filter did you use in that latest one??'],
  OnlyFans: ["renewing today, you're worth every cent 🔥", 'any chance of a custom this week? I tip well'],
  Telegram: ['hey gorgeous, can we chat tonight?', 'just sent you a tip 💸'],
  Fanvue: ['re-subbed for the 6th month, love the new content', 'thinking of upgrading — what does VIP get me?'],
  'Twitter/X': ['that new pic broke my brain 😭', 'reply to my dm pls 🥹'],
  Fansly: ['I keep coming back, your content is unreal'],
  Threads: ['saw your thread blow up — congrats!'],
  Reddit: ['hey, am I able to dm here? big fan'],
  Patreon: ['just bumped my pledge to the top tier 🥳'],
  YouTube: ['your last video had me crying laughing'],
  Facebook: ['hi sweetheart! how have you been?'],
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const UnifiedInbox: React.FC = () => {
  const { tier, canUseFeature } = useSubscription();
  const { user } = useAuth();
  const platformLimit = tier.entitlements.platforms;
  const hasInbox = canUseFeature('inbox');

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [botEnabled, setBotEnabled] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [showSimulateDm, setShowSimulateDm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs that mirror state — used inside the realtime subscription callback
  // so we always read the latest values without re-subscribing on every render.
  const activeIdRef = useRef<string | null>(null);
  const botEnabledRef = useRef(botEnabled);
  const accountsRef = useRef<ConnectedAccount[]>([]);
  const handlingFanIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    botEnabledRef.current = botEnabled;
  }, [botEnabled]);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // Allowed = both within plan limit AND user has connected the account.
  const connectedPlatforms = useMemo(() => accounts.map((a) => a.platform), [accounts]);
  const allowedPlatforms = useMemo(() => {
    if (platformLimit === -1) return connectedPlatforms;
    return connectedPlatforms.slice(0, Math.max(0, platformLimit));
  }, [connectedPlatforms, platformLimit]);

  const autoReplyPlatforms = useMemo(
    () => accounts.filter((a) => a.auto_reply && allowedPlatforms.includes(a.platform)).map((a) => a.platform),
    [accounts, allowedPlatforms],
  );

  const visibleConversations = useMemo(
    () =>
      conversations.filter(
        (c) =>
          allowedPlatforms.includes(c.platform) &&
          (search.trim() === '' ||
            c.fan_name.toLowerCase().includes(search.toLowerCase()) ||
            (c.last_message ?? '').toLowerCase().includes(search.toLowerCase())),
      ),
    [conversations, allowedPlatforms, search],
  );
  const lockedConversations = useMemo(
    () => conversations.filter((c) => !allowedPlatforms.includes(c.platform)),
    [conversations, allowedPlatforms],
  );

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const unreadCount = useMemo(
    () => visibleConversations.filter((c) => c.unread).length,
    [visibleConversations],
  );

  const loadAccounts = useCallback(async () => {
    if (!user) return [] as ConnectedAccount[];
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: true });
    if (error) {
      toast({ title: 'Could not load connected accounts', description: error.message, variant: 'destructive' });
      return [] as ConnectedAccount[];
    }
    const list = (data ?? []) as ConnectedAccount[];
    setAccounts(list);
    return list;
  }, [user]);

  // Seed demo conversations for any newly connected platform that has none yet.
  const seedNewlyConnected = useCallback(
    async (userId: string, accs: ConnectedAccount[]) => {
      if (accs.length === 0) return;
      const platforms = accs.map((a) => a.platform);
      const { data: existing } = await supabase
        .from('conversations')
        .select('platform')
        .eq('user_id', userId)
        .in('platform', platforms);
      const existingSet = new Set((existing ?? []).map((r: { platform: string }) => r.platform));
      const missing = platforms.filter((p) => !existingSet.has(p));
      if (missing.length === 0) return;
      const now = Date.now();
      const rows = missing.flatMap((platform, idx) => {
        const seeds = PLATFORM_SEEDS[platform] ?? [
          { fan_name: 'New Fan', tier: 'Free', ltv: 0, last_message: `Hey! Just found you on ${platform}.` },
        ];
        return seeds.map((s, j) => ({
          user_id: userId,
          fan_name: s.fan_name,
          platform,
          tier: s.tier,
          ltv: s.ltv,
          unread: true,
          last_message: s.last_message,
          last_message_at: new Date(now - (idx * 60 + j) * 1000 * 60).toISOString(),
        }));
      });
      const { data: inserted } = await supabase.from('conversations').insert(rows).select('id, last_message');
      if (!inserted) return;
      const msgRows = inserted
        .filter((c: { last_message: string | null }) => c.last_message)
        .map((c: { id: string; last_message: string | null }) => ({
          conversation_id: c.id,
          user_id: userId,
          sender: 'fan' as const,
          body: c.last_message!,
        }));
      if (msgRows.length) await supabase.from('messages').insert(msgRows);
    },
    [],
  );

  const loadConversations = useCallback(
    async (accs: ConnectedAccount[]) => {
      if (!user) return;
      setLoadingList(true);
      try {
        await seedNewlyConnected(user.id, accs);
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false });
        if (error) {
          toast({ title: 'Could not load inbox', description: error.message, variant: 'destructive' });
          return;
        }
        const list = (data ?? []) as Conversation[];
        setConversations(list);
        setActiveId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          const allowed = list.find((c) => accs.some((a) => a.platform === c.platform));
          return (allowed ?? list[0])?.id ?? null;
        });
      } finally {
        setLoadingList(false);
      }
    },
    [user, seedNewlyConnected],
  );

  const refreshAll = useCallback(async () => {
    const accs = await loadAccounts();
    await loadConversations(accs);
  }, [loadAccounts, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      if (error) {
        toast({ title: 'Could not load messages', description: error.message, variant: 'destructive' });
        return;
      }
      setMessages((data ?? []) as Message[]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (user && hasInbox) refreshAll();
  }, [user, hasInbox, refreshAll]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiThinking]);

  const updateConversationPreview = useCallback(
    async (convId: string, body: string, opts?: { unread?: boolean }) => {
      const nowIso = new Date().toISOString();
      const unread = opts?.unread ?? false;
      setConversations((prev) =>
        prev
          .map((c) => (c.id === convId ? { ...c, last_message: body, last_message_at: nowIso, unread } : c))
          .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()),
      );
      await supabase
        .from('conversations')
        .update({ last_message: body, last_message_at: nowIso, unread })
        .eq('id', convId);
    },
    [],
  );

  const triggerAIReply = useCallback(
    async (conversationId: string, opts?: { silent?: boolean }) => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-auto-reply', {
          body: { conversation_id: conversationId },
        });
        if (error) throw new Error(error.message);
        if (data && (data as { ok?: boolean; error?: string }).ok === false) {
          throw new Error((data as { error?: string }).error || 'AI reply failed');
        }
        const replyBody = (data as { reply?: string })?.reply;
        if (replyBody) await updateConversationPreview(conversationId, replyBody);
        if (activeIdRef.current === conversationId) await loadMessages(conversationId);
        if (!opts?.silent) {
          toast({ title: 'AI replied', description: 'Your chatbot sent a reply in your persona.' });
        }
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!opts?.silent) {
          toast({ title: 'AI auto-reply failed', description: msg, variant: 'destructive' });
        }
        return false;
      }
    },
    [loadMessages, updateConversationPreview],
  );

  // ── Lightweight polling: every 6s, refresh the conversation list. When a new
  //    fan message arrives via a webhook (or from another device), this picks
  //    it up and auto-triggers the AI reply if the bot is on AND the platform
  //    has auto-reply enabled. We deliberately use polling instead of a
  //    realtime websocket subscription because the host environment's realtime
  //    decoder has been throwing spurious "n is not iterable" errors that spam
  //    the user's console without affecting functionality. Polling is more
  //    reliable here and the in-app DM simulator triggers AI replies directly
  //    anyway, so latency is not a concern.
  useEffect(() => {
    if (!user || !hasInbox) return;
    let cancelled = false;
    let lastSeenAt = new Date().toISOString();

    const tick = async () => {
      if (cancelled) return;
      try {
        const { data: newMsgs } = await supabase
          .from('messages')
          .select('id, conversation_id, sender, body, created_at, user_id')
          .eq('user_id', user.id)
          .eq('sender', 'fan')
          .gt('created_at', lastSeenAt)
          .order('created_at', { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          lastSeenAt = newMsgs[newMsgs.length - 1].created_at;
          for (const m of newMsgs as Message[]) {
            // Refresh the active thread if needed
            if (m.conversation_id === activeIdRef.current) {
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            }
            // Find the conversation so we know which platform this fan came from.
            const convoRes = await supabase
              .from('conversations')
              .select('id, platform')
              .eq('id', m.conversation_id)
              .maybeSingle();
            const convo = convoRes.data as { id: string; platform: string } | null;
            if (!convo) continue;

            setConversations((prev) =>
              prev
                .map((c) =>
                  c.id === m.conversation_id
                    ? { ...c, last_message: m.body, last_message_at: m.created_at, unread: true }
                    : c,
                )
                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()),
            );

            if (!botEnabledRef.current) continue;
            const autoOn = accountsRef.current.find(
              (a) => a.platform === convo.platform && a.auto_reply,
            );
            if (!autoOn) continue;
            if (handlingFanIdsRef.current.has(m.id)) continue;
            handlingFanIdsRef.current.add(m.id);
            triggerAIReply(convo.id, { silent: true }).finally(() => {
              handlingFanIdsRef.current.delete(m.id);
            });
          }
        }
      } catch {
        // Silently ignore polling errors — next tick will retry.
      }
    };

    const interval = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, hasInbox, triggerAIReply]);


  const send = async () => {
    if (!reply.trim() || !active || !user || sending) return;
    const body = reply.trim();
    setSending(true);
    setReply('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: active.id, user_id: user.id, sender: 'creator', body })
      .select()
      .single();

    if (error || !data) {
      toast({ title: 'Could not send', description: error?.message ?? 'Unknown error', variant: 'destructive' });
      setReply(body);
      setSending(false);
      return;
    }
    setMessages((m) => (m.some((x) => x.id === (data as Message).id) ? m : [...m, data as Message]));
    await updateConversationPreview(active.id, body);
    setSending(false);
    toast({ title: 'Message sent', description: `Reply sent to ${active.fan_name} on ${active.platform}` });
  };

  const handleManualAIReply = async () => {
    if (!active || aiThinking) return;
    setAiThinking(true);
    await triggerAIReply(active.id);
    setAiThinking(false);
  };

  // Bulk-run the chatbot across every unread conversation on connected,
  // auto-reply-enabled platforms.
  const runBotOnAllUnread = async () => {
    if (bulkRunning) return;
    const targets = conversations.filter(
      (c) => c.unread && autoReplyPlatforms.includes(c.platform),
    );
    if (targets.length === 0) {
      toast({ title: 'Nothing to reply to', description: 'No unread DMs on auto-reply platforms.' });
      return;
    }
    setBulkRunning(true);
    let ok = 0;
    let fail = 0;
    for (const c of targets) {
      // eslint-disable-next-line no-await-in-loop
      const success = await triggerAIReply(c.id, { silent: true });
      if (success) ok += 1;
      else fail += 1;
    }
    setBulkRunning(false);
    toast({
      title: `AI replied to ${ok} conversation${ok === 1 ? '' : 's'}`,
      description: fail > 0 ? `${fail} failed — check connection.` : 'Your fans just got a personal reply.',
      variant: fail > 0 && ok === 0 ? 'destructive' : 'default',
    });
  };

  // Fire a realistic burst of fan messages across every connected, allowed
  // platform so users can watch the chatbot triage and reply to all of them.
  const runInboxSimulator = async () => {
    if (simRunning || !user) return;
    if (allowedPlatforms.length === 0) {
      toast({
        title: 'Connect a platform first',
        description: 'Add at least one social account to simulate incoming DMs.',
      });
      return;
    }
    setSimRunning(true);
    toast({
      title: 'Inbox simulator running',
      description: `Dropping fan DMs across ${allowedPlatforms.length} platform${allowedPlatforms.length === 1 ? '' : 's'} — your AI chatbot will reply automatically.`,
    });

    for (const platform of allowedPlatforms) {
      const burst = SIM_BURST[platform] ?? [`hey, just found you on ${platform}!`];
      const body = burst[Math.floor(Math.random() * burst.length)];

      // Find an existing convo for this platform, or create one.
      let convo = conversations.find((c) => c.platform === platform);
      if (!convo) {
        const seed = PLATFORM_SEEDS[platform]?.[0] ?? { fan_name: 'New Fan', tier: 'Free', ltv: 0, last_message: body };
        const { data: created } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            fan_name: seed.fan_name,
            platform,
            tier: seed.tier,
            ltv: seed.ltv,
            unread: true,
            last_message: body,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (!created) continue;
        convo = created as Conversation;
        setConversations((prev) => [convo as Conversation, ...prev]);
      }

      // Insert the fan message — the realtime listener will pick it up and
      // trigger the AI reply automatically, exactly like a real incoming DM.
      await supabase.from('messages').insert({
        conversation_id: convo.id,
        user_id: user.id,
        sender: 'fan',
        body,
      });

      // Stagger so it looks like real fans messaging at slightly different times.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 700));
    }

    setSimRunning(false);
  };

  const submitFanMessage = async (body: string) => {
    if (!active || !user) return;
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: active.id, user_id: user.id, sender: 'fan', body })
      .select()
      .single();
    if (error || !data) {
      toast({ title: 'Could not add message', description: error?.message ?? 'Unknown error', variant: 'destructive' });
      return;
    }
    setMessages((m) => (m.some((x) => x.id === (data as Message).id) ? m : [...m, data as Message]));
    await updateConversationPreview(active.id, body, { unread: true });
    // Realtime listener will trigger auto-reply if eligible. As a backup
    // (e.g. realtime not yet connected), trigger here too when bot is on.
    if (botEnabled && autoReplyPlatforms.includes(active.platform)) {
      setAiThinking(true);
      setTimeout(async () => {
        await triggerAIReply(active.id, { silent: true });
        setAiThinking(false);
      }, 400);
    }
  };

  if (!user) {
    return (
      <section id="inbox" className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Unified Inbox</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Sign in to open your inbox</h2>
            <p className="mt-3 text-slate-400">
              Your conversations are private to your account. Sign in to connect your social accounts and let the AI chatbot
              reply to fans in your persona.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-slate-300 flex items-center gap-3">
            <Inbox className="h-5 w-5 text-amber-400" /> Your inbox will appear here once you're signed in.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="inbox" className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div className="max-w-2xl">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Unified Inbox</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">All Your Fans. One Dashboard.</h2>
            <p className="mt-3 text-slate-400">
              Connect Instagram, OnlyFans, Telegram, Fanvue, X, Fansly and more — your AI chatbot watches every conversation
              in real time and replies in your persona the moment a fan messages.
              {hasInbox && platformLimit !== -1 && (
                <span className="block mt-1 text-amber-300 text-sm">
                  Your {tier.name} plan: <strong>{platformLimit}</strong> platform{platformLimit !== 1 ? 's' : ''} • <strong>{accounts.length}</strong> connected.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <Bot className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-white text-sm font-semibold">AI Auto-Reply</div>
              <div className="text-slate-500 text-xs">{botEnabled ? 'Active — overseeing your inbox' : 'Paused'}</div>
            </div>
            <Switch checked={botEnabled} onCheckedChange={setBotEnabled} />
          </div>
        </div>

        {!hasInbox ? (
          <UpgradePrompt
            title="Unified Inbox requires a paid plan"
            description="Merge all your social & fan platforms into one inbox with AI auto-reply. Starts at $20/mo on the Starter plan (2 platforms)."
            requiredTierId="starter"
          />
        ) : (
          <>
            {/* Connected platforms strip */}
            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-2">
              <Plug className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-slate-300 font-semibold mr-1">Connected:</span>
              {accounts.length === 0 ? (
                <span className="text-sm text-slate-500">No accounts connected yet.</span>
              ) : (
                accounts.map((a) => {
                  const allowed = allowedPlatforms.includes(a.platform);
                  return (
                    <span
                      key={a.id}
                      className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${
                        allowed
                          ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300'
                          : 'bg-slate-700/40 border-slate-600 text-slate-400'
                      }`}
                      title={allowed ? `${a.handle}` : 'Locked — upgrade plan to enable'}
                    >
                      {!allowed && <Lock className="h-3 w-3" />} {a.platform}
                      {a.auto_reply && allowed && <Bot className="h-3 w-3 text-amber-400 ml-1" />}
                    </span>
                  );
                })
              )}
              <div className="ml-auto flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runInboxSimulator}
                  disabled={simRunning || allowedPlatforms.length === 0}
                  className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                  title="Drop a realistic fan DM into every connected platform — see the chatbot triage them all"
                >
                  {simRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
                  Simulate fan DMs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runBotOnAllUnread}
                  disabled={bulkRunning || unreadCount === 0}
                  className="bg-white/5 border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                  title="Have your AI chatbot reply to every unread DM on auto-reply platforms"
                >
                  {bulkRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  AI reply to {unreadCount} unread
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowConnect(true)}
                  className="bg-amber-400 text-slate-950 hover:bg-amber-500"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Connect account
                </Button>
              </div>
            </div>

            {platformLimit !== -1 && accounts.length > platformLimit && (
              <div className="mb-4">
                <UpgradePrompt
                  variant="inline"
                  description={`You've connected ${accounts.length} platforms but your plan only includes ${platformLimit}. Upgrade to unlock the rest.`}
                  requiredTierId={platformLimit <= 2 ? 'creator' : 'agency'}
                />
              </div>
            )}

            <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[560px]">
              <div className="border-r border-white/10 flex flex-col">
                <div className="p-3 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search messages…"
                      className="pl-9 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingList && (
                    <div className="p-4 text-slate-400 text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
                    </div>
                  )}
                  {!loadingList && accounts.length === 0 && (
                    <div className="p-6 text-center">
                      <Plug className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <div className="text-white text-sm font-semibold mb-1">Connect your first account</div>
                      <div className="text-xs text-slate-500 mb-3">
                        Add Instagram, OnlyFans, Telegram or any other platform to start receiving messages.
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowConnect(true)}
                        className="bg-amber-400 text-slate-950 hover:bg-amber-500"
                      >
                        Connect a platform
                      </Button>
                    </div>
                  )}
                  {!loadingList && accounts.length > 0 && visibleConversations.length === 0 && (
                    <div className="p-4 text-slate-500 text-sm">No conversations match your search.</div>
                  )}
                  {visibleConversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition ${activeId === c.id ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-white font-semibold text-sm">{c.fan_name}</div>
                        <div className="text-xs text-slate-500">{relativeTime(c.last_message_at)}</div>
                      </div>
                      <div className="text-xs text-amber-400 mt-0.5">{c.platform}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{c.last_message}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            c.tier === 'VIP'
                              ? 'bg-amber-400/20 text-amber-300'
                              : c.tier === 'Subscriber'
                              ? 'bg-purple-400/20 text-purple-300'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {c.tier}
                        </span>
                        <span className="text-[10px] text-emerald-400">LTV ${c.ltv}</span>
                        {c.unread && <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />}
                      </div>
                    </button>
                  ))}
                  {lockedConversations.length > 0 &&
                    lockedConversations.map((c) => (
                      <div
                        key={c.id}
                        className="w-full text-left p-3 border-b border-white/5 opacity-50 cursor-not-allowed"
                        title="Connect or upgrade to unlock this platform"
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-slate-400 font-semibold text-sm flex items-center gap-1.5">
                            <Lock className="h-3 w-3 text-amber-400" /> {c.fan_name}
                          </div>
                          <div className="text-xs text-slate-500">{relativeTime(c.last_message_at)}</div>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{c.platform} · locked</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col">
                {!active ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center">
                    {accounts.length === 0
                      ? 'Connect a social account to see conversations here.'
                      : 'Select a conversation from the list.'}
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center gap-2 flex-wrap">
                      <div>
                        <div className="text-white font-semibold">{active.fan_name}</div>
                        <div className="text-xs text-slate-400">
                          {active.platform} • {active.tier} • LTV ${active.ltv}
                          {autoReplyPlatforms.includes(active.platform) && (
                            <span className="ml-2 text-amber-400">• AI auto-reply on</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSimulateDm(true)}
                          className="bg-white/5 border-white/10 text-slate-300 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Simulate DM
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-amber-400">
                          <Star className="h-3.5 w-3.5 mr-1" /> {active.tier}
                        </Button>
                      </div>
                    </div>
                    <div ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-950/50 max-h-[480px]">
                      {loadingMessages && (
                        <div className="text-slate-500 text-sm flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                        </div>
                      )}
                      {!loadingMessages && messages.length === 0 && (
                        <div className="text-slate-500 text-sm">
                          No messages yet — simulate a DM or send the first reply.
                        </div>
                      )}
                      {messages.map((m) => (
                        <div key={m.id} className="flex flex-col">
                          <div
                            className={
                              m.sender === 'fan'
                                ? 'max-w-[75%] p-3 rounded-2xl rounded-bl-sm bg-white/10 text-slate-200 text-sm'
                                : m.sender === 'ai'
                                ? 'max-w-[75%] ml-auto p-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 text-sm'
                                : 'max-w-[75%] ml-auto p-3 rounded-2xl rounded-br-sm bg-amber-400 text-slate-950 text-sm'
                            }
                          >
                            {m.body}
                          </div>
                          {m.sender === 'ai' && (
                            <div className="self-end mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                              <Bot className="h-3 w-3" /> Auto-sent by your AI chatbot
                            </div>
                          )}
                        </div>
                      ))}
                      {aiThinking && (
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> AI is typing…
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-white/10 flex gap-2">
                      <Input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && send()}
                        placeholder="Type a reply, or let the AI handle it…"
                        className="bg-white/5 border-white/10 text-white"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleManualAIReply}
                        disabled={aiThinking || !active}
                        variant="outline"
                        className="bg-white/5 border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
                        title="Generate an AI reply in your persona"
                      >
                        {aiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                      <Button onClick={send} disabled={sending} className="bg-amber-400 text-slate-950 hover:bg-amber-500">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {canUseFeature('analytics') ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Connected Platforms', value: String(accounts.length) },
                  { label: 'Active Convos', value: String(visibleConversations.length) },
                  { label: 'AI Replies', value: String(messages.filter((m) => m.sender === 'ai').length) },
                  { label: 'Unread', value: String(unreadCount) },
                ].map((s) => (
                  <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <UpgradePrompt
                  variant="inline"
                  title="Advanced Analytics"
                  description="Unlock the full analytics dashboard (conversion, LTV, AI hit-rate) on the Agency plan."
                  requiredTierId="agency"
                />
              </div>
            )}
          </>
        )}

        {user && (
          <ConnectAccountsDialog
            open={showConnect}
            onOpenChange={setShowConnect}
            userId={user.id}
            accounts={accounts}
            onChanged={refreshAll}
          />
        )}

        {active && (
          <SimulateDmDialog
            open={showSimulateDm}
            onOpenChange={setShowSimulateDm}
            fanName={active.fan_name}
            platform={active.platform}
            onSubmit={submitFanMessage}
          />
        )}
      </div>
    </section>
  );
};

export default UnifiedInbox;
