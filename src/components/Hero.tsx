import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, TrendingUp, Users, DollarSign, Camera, Video as VideoIcon, Sparkles, Zap } from 'lucide-react';

const HERO_BG = 'https://d64gsuwffb70l.cloudfront.net/69e42d4d86df19fff1064166_1776562345886_f13d5be4.jpg';

interface HeroProps {
  onStart: () => void;
  onShowcase: () => void;
}

// Shared helper: jump to the Studio's Media tab in the right mode.
// Works from anywhere in the app because ModelStudio listens to hash changes.
export const openGenerator = (mode: 'photo' | 'video' | 'animate') => {
  const hash = mode === 'photo' ? 'generate-photo' : mode === 'video' ? 'generate-video' : 'animate-photo';
  // Force a hashchange even if the hash is already set
  if (window.location.hash === `#${hash}`) {
    window.location.hash = '';
  }
  window.location.hash = hash;
  // Smoothly scroll to the studio after the hash has been applied
  setTimeout(() => {
    const el = document.getElementById('studio');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

// Shared helper: trigger the Studio's Quick Model Launch from anywhere in the app.
export const quickLaunchModel = () => {
  if (window.location.hash === '#quick-launch') {
    window.location.hash = '';
  }
  window.location.hash = 'quick-launch';
  setTimeout(() => {
    const el = document.getElementById('studio');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

const Hero: React.FC<HeroProps> = ({ onStart, onShowcase }) => {
  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            The #1 AI Creator Platform
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
            I Went from Prison to Building a{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              7-Figure AI Empire.
            </span>{' '}
            Now I'm Handing You the Whole System.
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-slate-300 max-w-2xl leading-relaxed">
            All in 1 AI Model gives you everything I wish I had — photo &amp; video generation, a 24/7 chatbot,
            unified inbox, monetization, and a step-by-step curriculum. One platform. Real income. Built by
            someone who started with nothing.
          </p>

          {/* PRIMARY CTAs */}
          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              onClick={scrollToPricing}
              size="lg"
              className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold h-14 px-8 text-base shadow-xl shadow-amber-500/30"
            >
              Start for $20/mo — Unlock Everything <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={onShowcase}
              variant="outline"
              size="lg"
              className="h-14 px-8 text-base bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Play className="mr-2 h-5 w-5" /> View Showcase
            </Button>
          </div>


          {/* QUICK MODEL LAUNCH — one-click random model generator */}
          <div className="mt-6">
            <button
              type="button"
              onClick={quickLaunchModel}
              className="group relative overflow-hidden w-full max-w-2xl rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-indigo-500 text-white p-5 text-left shadow-xl shadow-purple-600/30 transition border border-white/10"
            >
              <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition" />
              <div className="relative flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-lg leading-tight">Quick Model Launch</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">Randomize everything — appearance, personality, bio — in one click. Ready in under a second.</div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition" />
              </div>
            </button>
          </div>


          {/* GENERATOR QUICK-ACTION CARDS — the main attraction */}
          <div className="mt-10">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-300/80 font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Jump straight into the studio
            </div>
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              <button
                type="button"
                onClick={() => openGenerator('photo')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 p-5 text-left shadow-xl shadow-amber-500/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-950/20 flex items-center justify-center">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg leading-tight">Generate Photo</div>
                    <div className="text-xs opacity-80">Photorealistic AI images · 1 credit each</div>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 transition" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => openGenerator('video')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white p-5 text-left shadow-xl shadow-fuchsia-500/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                    <VideoIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg leading-tight">Generate Video</div>
                    <div className="text-xs opacity-90">Cinematic Runway Gen-4 clips · 3 credits</div>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 transition" />
                </div>
              </button>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: Users, value: '47K+', label: 'Creators' },
              { icon: TrendingUp, value: '2.3M', label: 'AI Models Built' },
              { icon: DollarSign, value: '$128M', label: 'Creator Earnings' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 lg:p-5">
                <s.icon className="h-5 w-5 text-amber-400 mb-2" />
                <div className="text-2xl lg:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs lg:text-sm text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
