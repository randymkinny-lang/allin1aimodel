import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Music2,
  Heart,
  AtSign,
  Lock,
  Eye,
  Fingerprint,
  Clock,
  Users,
  Image as ImageIcon,
  FileText,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Platform = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  risk: 'High' | 'Medium' | 'Low';
  policy: string;
  allowed: string[];
  banned: string[];
  tips: string[];
};

const PLATFORMS: Platform[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'from-blue-500 to-blue-700',
    risk: 'High',
    policy: 'Meta requires AI-generated content to be clearly labeled. Impersonation and undisclosed synthetic media are grounds for permanent ban.',
    allowed: [
      'Label profile bio with "AI Creator", "Virtual Influencer", or "Digital Persona"',
      'Use the built-in "AI info" content label on every post',
      'Safe-for-work fashion, lifestyle, travel, food, and art content',
      'Original AI art disclosed as such',
    ],
    banned: [
      'Nudity, sexually suggestive poses, visible underwear close-ups',
      'Pretending the AI model is a real human',
      'Using real people\'s faces without written consent',
      'Mass-following, engagement pods, or bought likes',
    ],
    tips: [
      'Warm up new accounts for 14 days before posting AI content',
      'Post 1–2x/day max for the first month',
      'Never link to adult platforms in bio — use a Linktree buffer',
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 via-red-500 to-yellow-500',
    risk: 'High',
    policy: 'Same Meta policies as Facebook. Instagram aggressively shadow-bans AI accounts that skip AI labeling or push traffic to adult sites.',
    allowed: [
      'Toggle "AI-generated" in advanced settings on every post',
      'Lifestyle reels, outfit changes, B-roll, behind-the-scenes',
      'Story polls, Q&As, and authentic-feeling captions',
      'Collabs with disclosed virtual-influencer accounts',
    ],
    banned: [
      'Deepfakes of celebrities or private individuals',
      'DM spam with external links',
      'Sexual content, "barely-covered" thirst traps',
      'Buying followers or using bot engagement services',
    ],
    tips: [
      'Aspect ratio 4:5 portraits get 40% more reach than 1:1',
      'Vary backgrounds, lighting, and outfits — identical-background posts trigger bot detection',
      'Reply to comments within 1 hour to signal "real" account behavior',
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: 'from-slate-900 via-pink-500 to-cyan-400',
    risk: 'High',
    policy: 'TikTok requires the AI-generated content toggle on every synthetic video. Undisclosed AI + face = instant permanent ban after review.',
    allowed: [
      'Turn ON "AI-generated content" label when uploading',
      'Use the "Virtual Influencer" or "AIGC" hashtags',
      'Lip-sync, dance, cooking, fitness tutorials',
      'Trending sounds + original AI visuals',
    ],
    banned: [
      'Sexual, suggestive, or fetish content',
      'Minors (appearing under 18) in any frame',
      'Copyrighted music outside TikTok\'s library',
      'Redirects to OnlyFans, Fanvue, or adult sites in bio',
    ],
    tips: [
      'First 1,000 views decide if you enter the main FYP — post at 7–9pm local time',
      'Keep videos 21–34 seconds for max retention scoring',
      'Never edit a banned video and re-upload — fingerprint matches will stack strikes',
    ],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'from-slate-700 to-slate-900',
    risk: 'Low',
    policy: 'X allows adult content in "Sensitive Media" mode but requires correct account-level NSFW flags. Mislabeled accounts get shadow-banned from search.',
    allowed: [
      'Mark account as "Adult Content" in Settings → Privacy & Safety if applicable',
      'AI art, sensual-but-covered content behind sensitive toggle',
      'Promoting adult-platform links (Fanvue, OnlyFans allowed)',
      'Reply-bait, threads, long captions',
    ],
    banned: [
      'CSAM or anything that could be read as underage — zero tolerance',
      'Non-consensual deepfakes of real people',
      'Posting adult content on a non-flagged account',
      'Mass-DMing new followers with promo links',
    ],
    tips: [
      'Verify with Premium ($8/mo) to unlock long-form posts + algo boost',
      'Pin a bio tweet with your Linktree, not a direct OF/Fanvue link',
      'Post 5–10x/day — X rewards volume more than any other platform',
    ],
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: AtSign,
    color: 'from-slate-800 to-slate-950',
    risk: 'Medium',
    policy: 'Inherits Instagram policies + strict anti-spam. Promotional or AI-heavy accounts get reach-limited fast.',
    allowed: [
      'Text-first conversation, witty takes, AMAs',
      'Occasional AI portrait with clear label',
      'Linking back to Instagram profile',
    ],
    banned: [
      'Sexual/suggestive content (same as IG)',
      'Spam replies for follow-backs',
      'Affiliate link dumps',
    ],
    tips: [
      'Reply to bigger accounts in your niche — Threads\' algo surfaces replies heavily',
      'Text posts outperform image posts 3:1 here',
    ],
  },
  {
    id: 'messenger',
    name: 'Messenger',
    icon: MessageCircle,
    color: 'from-blue-400 to-purple-600',
    risk: 'Medium',
    policy: 'Messenger flags accounts that send identical messages to many recipients or unsolicited links. Tied to your Facebook account health.',
    allowed: [
      'Organic 1:1 conversations with followers who messaged first',
      'AI chatbot responses IF labeled as automated',
      'Sharing non-adult links sparingly',
    ],
    banned: [
      'Bulk outbound cold DMs',
      'Identical copy-paste sales messages',
      'Sending adult content or external adult links',
    ],
    tips: [
      'Use the built-in AI Chatbot with 3–5 response variations to avoid spam detection',

      'Delay first-response by 30–120 seconds to appear human',
    ],
  },
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    icon: Heart,
    color: 'from-sky-400 to-blue-600',
    risk: 'Medium',
    policy: 'OnlyFans now requires AI creators to disclose synthetic content and verify the operator\'s real ID. Undisclosed AI = ban + withheld earnings.',
    allowed: [
      'AI content IF "AI Generated" tag is added to every post',
      'Verified operator must be 18+ with government ID on file',
      'Explicit content allowed with proper labeling',
      'PPV, subscriptions, tips, custom content requests',
    ],
    banned: [
      'Hiding that content is AI-generated',
      'Using a real person\'s likeness without notarized consent',
      'Promising live video calls you can\'t deliver',
      'Chargebacks from undisclosed AI — leads to permanent ban + blacklist',
    ],
    tips: [
      'Upload your ID + a selfie holding it during verification — takes 48h',
      'Price entry subscription at $6.99–$9.99 for max conversion',
      'Use mass-messages sparingly — 2x/week max to avoid spam flags',
    ],
  },
  {
    id: 'fanvue',
    name: 'Fanvue',
    icon: Heart,
    color: 'from-purple-500 to-pink-600',
    risk: 'Low',
    policy: 'Fanvue is AI-creator friendly and actively markets to virtual influencers. Still requires disclosure + operator ID verification.',
    allowed: [
      'Explicit AI content with "AI Creator" badge enabled',
      'AI chat responses (Fanvue has native AI chat tools)',
      'Promoting your Fanvue link from X, Reddit, and Telegram',
      'Custom content, PPV, subscriptions',
    ],
    banned: [
      'Content depicting anyone under 18 (including ambiguous ages)',
      'Real-person deepfakes',
      'Bestiality, violence, or illegal content',
      'Chargebacks & payment fraud',
    ],
    tips: [
      'Fanvue\'s algorithm promotes new AI creators for the first 30 days — post daily',
      'Enable the AI Chat feature to 10x message volume without burning out',
      'Average top-10% AI creator earns $3k–$12k/mo here',
    ],
  },
];

const STEPS = [
  {
    num: 1,
    icon: Fingerprint,
    title: 'Build a Believable Identity',
    desc: 'Before a single post, establish your AI persona as its own clearly-disclosed brand. Bio should say "Virtual Model" or "AI Creator". Profile pic consistent across every platform. Use the same name, handle, and voice everywhere.',
    checks: [
      'Same @handle on every platform (check availability first)',
      'Bio explicitly mentions "AI", "Virtual", or "Digital"',
      'Linktree/Beacons as the single outbound link hub',
      'Consistent profile photo across all 7+ platforms',
    ],
  },
  {
    num: 2,
    icon: Clock,
    title: 'Warm Up Every New Account',
    desc: 'New accounts posting AI content immediately = instant shadow-ban. For 10–14 days: only browse, like, and comment. No posts, no DMs, no links. This trains the algorithm that you are a real user.',
    checks: [
      'Days 1–3: scroll feed 15 min/day, follow 20 accounts in niche',
      'Days 4–7: like 30 posts/day, leave 5 thoughtful comments',
      'Days 8–14: post 1 non-AI image (screenshot, meme, landscape)',
      'Day 15+: start posting AI content with proper disclosure',
    ],
  },
  {
    num: 3,
    icon: Eye,
    title: 'Always Disclose AI Content',
    desc: 'Every major platform now has an AI-content toggle. Using it actually HELPS your reach because the platform trusts you. Skipping it = account review = likely ban.',
    checks: [
      'Instagram/Facebook: enable "AI info" label per post',
      'TikTok: toggle "AI-generated content" on upload',
      'YouTube: check "Altered or synthetic content" in details',
      'Mention "AI" in the first line of your bio',
    ],
  },
  {
    num: 4,
    icon: ImageIcon,
    title: 'Vary Your Content Signals',
    desc: 'Bot-detection AI looks for repeated backgrounds, lighting, compression artifacts, and EXIF patterns. Your generations need to look like a real photographer took them across different days.',
    checks: [
      'Rotate through 10+ different scene presets from the studio',
      'Mix aspect ratios: 4:5, 1:1, 9:16 — don\'t stick to one',
      'Include "imperfect" shots: blurry background, off-center',
      'Strip EXIF metadata before upload (All in 1 AI Model does this automatically)',
    ],
  },

  {
    num: 5,
    icon: FileText,
    title: 'Write Human-Sounding Captions',
    desc: 'Perfect grammar, emoji-packed, hashtag-stuffed captions scream "bot". Write how a 22-year-old texts. Include typos. Reference real things (weather, weekday, coffee).',
    checks: [
      'Max 3–5 hashtags per post (not 30)',
      'Occasional lowercase-only captions',
      'Mention real-world context: "monday blues", "post-gym"',
      'Never copy-paste the same caption twice',
    ],
  },
  {
    num: 6,
    icon: Users,
    title: 'Engage Like a Real Person',
    desc: 'Platforms track reply speed, session duration, and scroll patterns. If your account only posts and never browses, it will be flagged. Spend time inside the app, not just posting.',
    checks: [
      'Reply to every comment within 2 hours',
      'Scroll the FYP/feed for 10 min after each post',
      'Like 5 posts from your followers daily',
      'Save/bookmark posts occasionally (algorithm signal)',
    ],
  },
  {
    num: 7,
    icon: Globe,
    title: 'Traffic Routing (Don\'t Link Adult Directly)',
    desc: 'Linking directly from Instagram/TikTok/Facebook to OnlyFans or Fanvue triggers automatic bans. Always route through a Linktree, Beacons, or your own landing page.',
    checks: [
      'Main platforms link → Linktree/your own site',
      'Your site links → Fanvue/OnlyFans',
      'Never mention "OF", "Fanvue", or "spicy content" on SFW platforms',
      'Use code words: "exclusive", "VIP", "more of me"',
    ],
  },
  {
    num: 8,
    icon: Lock,
    title: 'Lock Down Your Operator Identity',
    desc: 'Fanvue and OnlyFans now require the real human operator behind the AI to verify with government ID. This protects YOU from chargebacks, impersonation claims, and legal issues.',
    checks: [
      'Complete ID verification on every adult platform',
      'Use a dedicated business email, not personal',
      'Register a DBA/LLC for the persona brand',
      'Keep written logs of every generation prompt (CYA evidence)',
    ],
  },
];

const RISK_COLORS = {
  High: 'bg-red-500/20 text-red-300 border-red-500/40',
  Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const SafetyGuide: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<string>('instagram');
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const platform = PLATFORMS.find((p) => p.id === activePlatform)!;
  const Icon = platform.icon;
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <section id="safety" className="py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium mb-5">
            <Shield className="h-4 w-4" /> Ban Prevention Playbook
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Keep Your AI Model <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Unbanned</span> on Every Platform
          </h2>
          <p className="text-lg text-slate-400">
            The exact 8-step framework top AI creators use to stay compliant on Facebook, Instagram, TikTok, X, Threads, Messenger, OnlyFans, and Fanvue.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-12 p-5 rounded-2xl bg-slate-900/60 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Your Compliance Progress</span>
            <span className="text-sm font-bold text-emerald-400">{completedCount}/{STEPS.length} steps · {progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 8 Steps */}
        <div className="grid md:grid-cols-2 gap-5 mb-20">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const isDone = completed[step.num];
            return (
              <div
                key={step.num}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDone ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-amber-400 to-purple-600 text-white'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Step {step.num}</div>
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">{step.desc}</p>
                <ul className="space-y-2 mb-4">
                  {step.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => setCompleted((prev) => ({ ...prev, [step.num]: !prev[step.num] }))}
                  className={`w-full ${
                    isDone
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isDone ? (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Completed</>
                  ) : (
                    <>Mark as Done</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Platform selector */}
        <div className="mb-10">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Platform-Specific Rules</h3>
          <p className="text-slate-400 text-center mb-8">Click each platform for its exact do's, don'ts, and pro tips.</p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {PLATFORMS.map((p) => {
              const PIcon = p.icon;
              const active = activePlatform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                    active
                      ? 'bg-white text-slate-950 border-white shadow-lg'
                      : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  <PIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active platform details */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-slate-900/60">
            <div className={`p-6 bg-gradient-to-r ${platform.color}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">{platform.name}</h4>
                    <p className="text-white/80 text-sm">Ban-Risk Playbook</p>
                  </div>
                </div>
                <Badge className={`border ${RISK_COLORS[platform.risk]} text-sm px-3 py-1`}>
                  {platform.risk} Ban Risk
                </Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 mb-8">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Platform Policy</div>
                    <p className="text-slate-300 text-sm leading-relaxed">{platform.policy}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <h5 className="font-bold text-white">Allowed & Encouraged</h5>
                  </div>
                  <ul className="space-y-2.5">
                    {platform.allowed.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <h5 className="font-bold text-white">Instant-Ban Triggers</h5>
                  </div>
                  <ul className="space-y-2.5">
                    {platform.banned.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <h5 className="font-bold text-white">Pro Creator Tips</h5>
                </div>
                <ul className="space-y-2.5">
                  {platform.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                      <div className="h-5 w-5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-slate-900 border border-emerald-500/30 text-center">
          <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Stay Compliant. Stay Earning.</h3>
          <p className="text-slate-300 max-w-2xl mx-auto mb-6">
            Follow this playbook and your AI model will outlive 95% of creators who get banned in the first 30 days.
            Bookmark this page — platform policies change monthly and we keep it updated.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => window.print()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            >
              Print Checklist
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const el = document.getElementById('studio');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Back to Studio
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetyGuide;
