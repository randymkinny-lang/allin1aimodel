import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Video,
  Sparkles,
  Bot,
  Inbox,
  Mic,
  UserCog,
  BarChart3,
  CalendarClock,
  ShieldCheck,
  GraduationCap,
  CreditCard,
  Wallet,
  Users,
  Crown,
  Bell,
  Layers,
  Palette,
  Lock,
  TrendingUp,
  Megaphone,
  Globe,
  HeartHandshake,
  Zap,
  Headphones,
  ArrowRight,
} from 'lucide-react';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
}

const FEATURES: Feature[] = [
  { icon: Camera, title: 'AI Photo Generation', desc: 'Unlimited on-brand photos of your AI model in any pose, outfit, or scene.', href: '#studio' },
  { icon: Video, title: 'AI Video Generation', desc: 'Cinematic short videos of your model — perfect for Reels, TikTok & Shorts.', href: '#studio' },
  { icon: Palette, title: 'Customizable Appearance', desc: 'Fine-tune face, body, hair, skin and style — every detail of your model is yours.', href: '#studio' },
  { icon: Sparkles, title: 'Personality Engine', desc: 'Set tone, voice, kinks, niche and backstory — your model talks like a real person.', href: '#studio' },
  { icon: Bot, title: 'Customizable AI Chatbot', desc: "Train a chatbot with your model's voice to reply 24/7 across every platform.", href: '#chatbot' },
  { icon: Inbox, title: 'Unified Inbox', desc: 'IG, TikTok, X, OF, Fanvue, Telegram — every DM in one synced inbox.', href: '#inbox' },
  { icon: Mic, title: 'AI Voice Changer', desc: 'Real-time and uploaded voice cloning to send personalized voice notes at scale.', href: '#voice-changer' },
  { icon: UserCog, title: 'Full AI Clone Studio', desc: 'Upload a reference video and clone yourself or a persona end-to-end.', href: '#clone' },
  { icon: CalendarClock, title: 'Content Scheduler', desc: 'Plan, queue and auto-post photos, videos and captions across all platforms.', href: '#scheduler' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Revenue, fans, conversion, top posts — every metric that matters in one view.', href: '#analytics' },
  { icon: TrendingUp, title: 'Conversation Tracking', desc: 'See top spenders, hot leads, and conversation health across every fan.', href: '#inbox' },
  { icon: HeartHandshake, title: 'Collab Marketplace', desc: 'Find creators, agencies and shoutout partners to scale your reach faster.', href: '#collabs' },
  { icon: Megaphone, title: 'Social Auto-Posting', desc: 'One-click cross-post to IG, TikTok, X, Threads, OF, Fanvue and more.', href: '#social' },
  { icon: ShieldCheck, title: "Don't-Get-Banned Guides", desc: 'Live, platform-specific playbooks updated by people who run real accounts.', href: '#safety' },
  { icon: Bell, title: 'Ban-Risk Alerts', desc: 'Real-time alerts on policy changes, shadowbans and risky behaviour.', href: '#safety' },
  { icon: Lock, title: 'Content Moderation', desc: 'Auto-screen every generation against platform rules before you publish.', href: '#moderation' },
  { icon: CreditCard, title: 'Payment Platform Setup', desc: 'Done-for-you Stripe / FamousPay setup so you can charge fans on day one.', href: '#monetize' },
  { icon: Wallet, title: 'Monetization Suite', desc: 'Tips, PPV, custom requests, subscriptions — every revenue stream covered.', href: '#monetize' },
  { icon: GraduationCap, title: 'Full Curriculum', desc: 'Step-by-step Academy: creation → growth → scaling → monetizing → exiting.', href: '/academy' },
  { icon: Layers, title: 'Multi-Platform Posting', desc: 'Tier-gated platform connections — go from 2 to unlimited as you grow.', href: '#pricing' },
  { icon: Globe, title: 'White-Label Option', desc: 'Run the entire platform under your own brand with your own domain.', href: '#pricing' },
  { icon: Users, title: 'Team Seats & Agency Mode', desc: 'Invite assistants, chatters and managers with role-based permissions.', href: '#pricing' },
  { icon: Headphones, title: 'Priority + VIP Support', desc: 'Email, chat or phone — get a real human on higher tiers.', href: '#pricing' },
  { icon: Crown, title: 'Lifetime Ownership Option', desc: 'Buy the whole app outright — full source code & rights, no monthly fees.', href: '#pricing' },
];

interface Props {
  onSeePricing: () => void;
  onStart: () => void;
}

const FeaturesOverview: React.FC<Props> = ({ onSeePricing, onStart }) => {
  const navigate = useNavigate();

  const handleFeatureClick = (href: string) => {
    if (href.startsWith('/')) {
      navigate(href);
      return;
    }
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative pt-16 pb-12 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_50%)] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold mb-4">
            <Zap className="h-3.5 w-3.5" />
            Everything this app does — at a glance
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            The complete AI creator stack
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Photo & video generation, full personality customization, unified inbox, voice cloning,
            content scheduling, analytics, monetization, ban-prevention, and a step-by-step curriculum
            from launch to scale — all in one platform.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={onSeePricing}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold px-6 py-6 text-base hover:opacity-90"
            >
              <Crown className="h-4 w-4 mr-2" />
              See plans & start now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              onClick={onStart}
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 px-6 py-6 text-base"
            >
              Try the studio first
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.title}
                onClick={() => handleFeatureClick(f.href)}
                className="group text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-amber-400/40 transition p-4 flex flex-col gap-2"
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-white text-sm font-semibold leading-tight">{f.title}</div>
                <div className="text-slate-400 text-xs leading-snug">{f.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-amber-500/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-white font-bold text-xl">Pick your tier and start tonight</div>
            <div className="text-slate-300 text-sm mt-1">
              Plans from $20/mo up to full $17.5k lifetime ownership. Features unlock the second your payment clears.
            </div>
          </div>
          <Button
            onClick={onSeePricing}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-5 text-base whitespace-nowrap"
          >
            View pricing
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesOverview;
