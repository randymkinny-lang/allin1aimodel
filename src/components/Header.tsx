import React, { useState } from 'react';
import { Menu, Compass, Crown, BookOpen, Camera, Video as VideoIcon, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AuthModal from './auth/AuthModal';
import UserMenu from './auth/UserMenu';
import HeaderModelsMenu from './auth/HeaderModelsMenu';
import NotificationsBell from './notifications/NotificationsBell';

import { openGenerator, quickLaunchModel } from './Hero';


interface HeaderProps {
  onNavigate: (id: string) => void;
  onStart: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, onStart }) => {
  const { user, loading } = useAuth();
  const { subscription, tier } = useSubscription();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [mobileOpen, setMobileOpen] = useState(false);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const links = [
    { id: 'studio', label: 'Studio' },
    { id: 'chatbot', label: 'Chatbot' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'voice-changer', label: 'Voice' },
    { id: 'clone', label: 'AI Clone' },
    { id: 'scheduler', label: 'Scheduler' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'collabs', label: 'Collabs' },
    { id: 'moderation', label: 'Safety' },
    { id: 'pricing', label: 'Pricing' },
  ];


  const handleMobileNavigate = (id: string) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  const handleMobileStart = () => {
    setMobileOpen(false);
    onStart();
  };

  const handleMobileAuth = (mode: 'signin' | 'signup') => {
    setMobileOpen(false);
    openAuth(mode);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button onClick={() => onNavigate('top')} className="flex items-center gap-2 group">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780369462937_b0834f8f.png"
            alt="All in 1 AI Model"
            className="h-10 w-auto object-contain"
            draggable={false}
          />
          <span className="sr-only">All in 1 AI Model</span>
        </button>


        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => onNavigate(l.id)}
              className="text-slate-300 hover:text-amber-400 text-sm font-medium transition"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-400 text-sm font-medium transition"
          >
            <Compass className="h-4 w-4" /> Discover
          </Link>
          <Link
            to="/academy"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-400 text-sm font-medium transition"
          >
            <BookOpen className="h-4 w-4" /> Academy
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {/* PROMINENT GENERATOR QUICK-ACTIONS — always visible on desktop */}
          <button
            onClick={quickLaunchModel}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-md shadow-purple-600/30 transition"
            title="Quick Model Launch — instantly create a randomized model"
          >
            <Zap className="h-4 w-4" /> Quick Launch
          </button>
          <button
            onClick={() => openGenerator('photo')}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-amber-400/90 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition"
            title="Generate Photo"
          >
            <Camera className="h-4 w-4" /> Generate Photo
          </button>
          <button
            onClick={() => openGenerator('video')}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20 transition"
            title="Generate Video"
          >
            <VideoIcon className="h-4 w-4" /> Generate Video
          </button>

          {subscription?.status === 'active' && (
            <button
              onClick={() => onNavigate('pricing')}
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 transition"
            >
              <Crown className="h-3.5 w-3.5" />
              {tier.name}
            </button>
          )}
          {!loading && !user && (
            <>
              <Button
                variant="ghost"
                onClick={() => openAuth('signin')}
                className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/10"
              >
                Sign In
              </Button>
              <Button
                onClick={onStart}
                className="hidden sm:inline-flex bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
              >
                Start Creating
              </Button>
            </>
          )}
          {!loading && user && (
            <>
              <NotificationsBell />
              <HeaderModelsMenu onNavigate={onNavigate} />
              <Button
                onClick={onStart}
                className="hidden lg:inline-flex bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
              >
                Create Model
              </Button>
              <UserMenu onNavigate={onNavigate} />
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-slate-950 border-l border-white/10 text-white w-[85vw] sm:w-[360px] p-0 flex flex-col"
            >
              <SheetHeader className="px-6 py-5 border-b border-white/10">
                <SheetTitle className="text-white flex items-center gap-2">
                  <img
                    src="https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780369462937_b0834f8f.png"
                    alt="All in 1 AI Model"
                    className="h-9 w-auto object-contain"
                    draggable={false}
                  />
                  <span className="sr-only">All in 1 AI Model</span>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="flex flex-col">
                  {links.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleMobileNavigate(l.id)}
                      className="text-left text-slate-200 hover:text-amber-400 hover:bg-white/5 text-base font-medium transition px-4 py-3 rounded-lg"
                    >
                      {l.label}
                    </button>
                  ))}
                  <Link
                    to="/discover"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-slate-200 hover:text-amber-400 hover:bg-white/5 text-base font-medium transition px-4 py-3 rounded-lg"
                  >
                    <Compass className="h-4 w-4" /> Discover
                  </Link>
                  <Link
                    to="/academy"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-slate-200 hover:text-amber-400 hover:bg-white/5 text-base font-medium transition px-4 py-3 rounded-lg"
                  >
                    <BookOpen className="h-4 w-4" /> Academy
                  </Link>
                </div>


                {/* Mobile-only quick-action buttons */}
                <div className="mt-4 mx-2 space-y-2">
                  <button
                    onClick={() => { setMobileOpen(false); quickLaunchModel(); }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-500 transition shadow-md shadow-purple-600/30"
                  >
                    <Zap className="h-4 w-4" /> Quick Model Launch
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setMobileOpen(false); openGenerator('photo'); }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition"
                    >
                      <Camera className="h-4 w-4" /> Photo
                    </button>
                    <button
                      onClick={() => { setMobileOpen(false); openGenerator('video'); }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white hover:from-purple-400 hover:to-fuchsia-500 transition"
                    >
                      <VideoIcon className="h-4 w-4" /> Video
                    </button>
                  </div>
                </div>



                {subscription?.status === 'active' && (
                  <div className="mt-4 mx-2">
                    <button
                      onClick={() => handleMobileNavigate('pricing')}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 transition"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      {tier.name} Plan
                    </button>
                  </div>
                )}
              </nav>

              <div className="border-t border-white/10 p-4 space-y-2">
                {!loading && !user && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleMobileAuth('signin')}
                      className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={handleMobileStart}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
                    >
                      Start Creating
                    </Button>
                  </>
                )}
                {!loading && user && (
                  <Button
                    onClick={handleMobileStart}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold"
                  >
                    Create Model
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </header>
  );
};

export default Header;
