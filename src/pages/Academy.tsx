import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import TestModeBanner from '@/components/TestModeBanner';
import Footer from '@/components/sections/Footer';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Lock,
  CheckCircle2,
  PlayCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Infinity as InfinityIcon,
  Video,
  FileText,
} from 'lucide-react';
import { academyChapters, type AcademyChapter } from '@/data/academyChapters';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTestMode } from '@/contexts/TestModeContext';
import AcademyCheckout, { type AcademyTier } from '@/components/academy/AcademyCheckout';

const Academy: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enabled: testModeEnabled } = useTestMode();
  const [hasPurchase, setHasPurchase] = useState<boolean>(testModeEnabled);
  const [checkingPurchase, setCheckingPurchase] = useState<boolean>(!testModeEnabled);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<AcademyTier>('text');
  const [activeChapter, setActiveChapter] = useState<AcademyChapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (testModeEnabled) {
        setHasPurchase(true);
        setCheckingPurchase(false);
        return;
      }
      if (!user) {
        setHasPurchase(false);
        setCheckingPurchase(false);
        return;
      }
      setCheckingPurchase(true);
      const { data } = await supabase
        .from('academy_purchases')
        .select('tier, status')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      if (!cancelled) {
        setHasPurchase((data?.length ?? 0) > 0);
        setCheckingPurchase(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user, testModeEnabled]);

  const openCheckout = (tier: AcademyTier) => {
    setCheckoutTier(tier);
    setCheckoutOpen(true);
  };

  const freeChapter = useMemo(
    () => academyChapters.find((c) => c.isFree) ?? academyChapters[0],
    [],
  );

  const isLocked = (chapter: AcademyChapter) => !chapter.isFree && !hasPurchase;

  const handleChapterClick = (chapter: AcademyChapter) => {
    if (isLocked(chapter)) {
      openCheckout('text');
      return;
    }
    setActiveChapter(chapter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIndex = activeChapter
    ? academyChapters.findIndex((c) => c.id === activeChapter.id)
    : -1;
  const prevChapter = currentIndex > 0 ? academyChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < academyChapters.length - 1
      ? academyChapters[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TestModeBanner />
      <Header onNavigate={(id) => navigate(`/#${id}`)} onStart={() => navigate('/')} />

      {!activeChapter && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.15),transparent_60%)]" />
            <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
              <Badge className="bg-amber-400/15 text-amber-300 border-amber-400/30 mb-6">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                The Official AIOAIM Curriculum
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
                How to Create, Launch & <span className="text-amber-400">Monetize</span> AI Models
              </h1>
              <p className="mt-5 text-lg text-slate-300 max-w-2xl mx-auto">
                A complete 16-module training program by Randy Kinny, founder of All In 1 AI Model.
                The official step-by-step curriculum — companion to <em>Consistency Beats Perfection</em>.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-400" /> 16 Modules + Bonus</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Self-paced</div>
                <div className="flex items-center gap-2"><InfinityIcon className="h-4 w-4 text-amber-400" /> Lifetime access</div>
              </div>

              {!hasPurchase && !checkingPurchase && (
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => openCheckout('text')}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold px-8"
                  >
                    Unlock Text Curriculum · $28.99
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleChapterClick(freeChapter)}
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                  >
                    Read Module 1 Free
                  </Button>
                </div>
              )}
              {hasPurchase && (
                <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-emerald-300 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> You have full access to all 16 modules
                </div>
              )}
            </div>
          </section>

          {/* Pricing tiers */}
          {!hasPurchase && (
            <section className="border-b border-white/10 bg-slate-950">
              <div className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Choose your access</h2>
                <p className="text-center text-slate-400 mb-10">One-time payment. Lifetime access. No subscriptions.</p>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/5 to-transparent p-7 flex flex-col">
                    <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
                      <FileText className="h-4 w-4" /> TEXT CURRICULUM
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold">$28.99</span>
                      <span className="text-slate-400 text-sm">one-time</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      The complete written curriculum — all 16 modules plus the bonus roast.
                    </p>
                    <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> All 16 modules unlocked</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Bonus: The Randy Roast</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Lifetime access + future updates</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Read on any device</li>
                    </ul>
                    <Button
                      onClick={() => openCheckout('text')}
                      className="mt-6 w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
                    >
                      Unlock for $28.99
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 flex flex-col relative">
                    <div className="absolute top-5 right-5">
                      <Badge className="bg-white/10 text-slate-300 border-white/20">Coming soon</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                      <Video className="h-4 w-4" /> FULL VIDEO CURRICULUM
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold">$49.99</span>
                      <span className="text-slate-400 text-sm">one-time</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Everything in Text + full walkthrough videos for every module (added soon).
                    </p>
                    <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Everything in Text Curriculum</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> HD video lessons (coming soon)</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Screen-share walkthroughs</li>
                      <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> Downloadable worksheets</li>
                    </ul>
                    <Button
                      onClick={() => openCheckout('video')}
                      variant="outline"
                      className="mt-6 w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                    >
                      Pre-order for $49.99
                    </Button>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4" /> Secured by Stripe · 2% platform fee included · No recurring charges
                </div>
              </div>
            </section>
          )}

          {/* Curriculum */}
          <section className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">The Curriculum</h2>
                <p className="text-slate-400 mt-1">
                  {hasPurchase
                    ? 'All modules unlocked. Click any module to read.'
                    : 'Module 1 is free. The remaining 15 modules unlock with the Text Curriculum.'}
                </p>
              </div>
              {!hasPurchase && !checkingPurchase && (
                <Button
                  onClick={() => openCheckout('text')}
                  className="hidden sm:inline-flex bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
                >
                  Unlock All · $28.99
                </Button>
              )}
            </div>

            <div className="grid gap-3">
              {academyChapters.map((chapter) => {
                const locked = isLocked(chapter);
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterClick(chapter)}
                    className={`text-left w-full rounded-xl border transition p-5 flex gap-4 items-start group ${
                      locked
                        ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                        : 'border-white/10 bg-white/[0.04] hover:border-amber-400/40 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        locked
                          ? 'bg-white/5 text-slate-500'
                          : chapter.isFree
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-400/15 text-amber-300'
                      }`}
                    >
                      {locked ? (
                        <Lock className="h-4 w-4" />
                      ) : chapter.isBonus ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className={locked ? 'text-slate-500' : 'text-amber-300'}>
                          {chapter.number}
                        </span>
                        {chapter.isFree && (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                            Free Preview
                          </Badge>
                        )}
                        {chapter.isBonus && (
                          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
                            Bonus
                          </Badge>
                        )}
                        {locked && (
                          <Badge className="bg-white/5 text-slate-400 border-white/10 text-[10px]">
                            Locked
                          </Badge>
                        )}
                      </div>
                      <div className={`mt-1 font-semibold text-base sm:text-lg ${locked ? 'text-slate-300' : 'text-white'}`}>
                        {chapter.title}
                      </div>
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                        {chapter.summary}
                      </p>
                      <div className="mt-2 text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {chapter.readTime}</span>
                      </div>
                    </div>
                    <div className="shrink-0 self-center">
                      {locked ? (
                        <span className="text-xs font-semibold text-amber-300 group-hover:text-amber-200">
                          Unlock →
                        </span>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-300 transition" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!hasPurchase && !checkingPurchase && (
              <div className="mt-10 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-8 text-center">
                <h3 className="text-xl font-bold">Ready to unlock everything?</h3>
                <p className="mt-2 text-slate-300 max-w-xl mx-auto">
                  Get lifetime access to all 16 modules plus the bonus roast for a single $28.99 payment.
                </p>
                <Button
                  onClick={() => openCheckout('text')}
                  size="lg"
                  className="mt-5 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold px-8"
                >
                  Unlock Full Curriculum · $28.99
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      {activeChapter && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <button
            onClick={() => setActiveChapter(null)}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300 transition mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to curriculum
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="text-amber-300">{activeChapter.number}</span>
            {activeChapter.isFree && (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                Free Preview
              </Badge>
            )}
            {activeChapter.isBonus && (
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
                Bonus
              </Badge>
            )}
            <span className="text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {activeChapter.readTime}
            </span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {activeChapter.title}
          </h1>
          <p className="mt-3 text-lg text-slate-400">{activeChapter.summary}</p>

          <article className="mt-8 space-y-5 text-slate-200 leading-relaxed">
            {activeChapter.content.map((p, i) => (
              <p key={i} className="text-[17px]">
                {p}
              </p>
            ))}
          </article>

          <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between gap-3">
            {prevChapter ? (
              <button
                onClick={() => handleChapterClick(prevChapter)}
                className="flex-1 text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-3 transition"
              >
                <div className="text-xs text-slate-500">Previous</div>
                <div className="text-sm font-semibold text-slate-200 truncate flex items-center gap-2">
                  {isLocked(prevChapter) && <Lock className="h-3 w-3 text-slate-500" />}
                  {prevChapter.title}
                </div>
              </button>
            ) : <div className="flex-1" />}
            {nextChapter ? (
              <button
                onClick={() => handleChapterClick(nextChapter)}
                className="flex-1 text-right rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-4 py-3 transition"
              >
                <div className="text-xs text-slate-500">Next</div>
                <div className="text-sm font-semibold text-slate-200 truncate flex items-center justify-end gap-2">
                  {nextChapter.title}
                  {isLocked(nextChapter) && <Lock className="h-3 w-3 text-slate-500" />}
                </div>
              </button>
            ) : <div className="flex-1" />}
          </div>

          {!hasPurchase && activeChapter.isFree && (
            <div className="mt-10 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-center">
              <h3 className="text-lg font-bold">Liked the preview?</h3>
              <p className="mt-1 text-sm text-slate-300">
                Unlock the remaining 15 modules + the bonus roast for $28.99.
              </p>
              <Button
                onClick={() => openCheckout('text')}
                className="mt-4 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
              >
                Unlock Full Curriculum
              </Button>
            </div>
          )}
        </section>
      )}

      <Footer />

      <AcademyCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        onSuccess={() => setHasPurchase(true)}
      />
    </div>
  );
};

export default Academy;
