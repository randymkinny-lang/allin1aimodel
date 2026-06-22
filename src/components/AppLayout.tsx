import React from 'react';
import TestModeBanner from './TestModeBanner';
import BetaFeedbackBanner from './BetaFeedbackBanner';
import Header from './Header';
import FeaturesOverview from './sections/FeaturesOverview';
import Hero from './Hero';
import Showcase from './Showcase';
import ModelStudio from './studio/ModelStudio';
import SocialLinks from './sections/SocialLinks';
import ChatbotBuilder from './sections/ChatbotBuilder';
import UnifiedInbox from './sections/UnifiedInbox';
import VoiceChanger from './sections/VoiceChanger';
import MyVoiceClips from './voice/MyVoiceClips';
import AICloneStudio from './sections/AICloneStudio';

import ContentScheduler from './sections/ContentScheduler';
import AnalyticsDashboard from './sections/AnalyticsDashboard';
import CollabMarketplace from './sections/CollabMarketplace';
import ContentModeration from './sections/ContentModeration';
import Monetization from './sections/Monetization';
import SafetyGuide from './sections/SafetyGuide';
import Pricing from './sections/Pricing';
import FAQ from './sections/FAQ';
import Footer from './sections/Footer';
import ChecklistOptin from './sections/ChecklistOptin';
import BooksSection from './sections/BooksSection';
import FounderStory from './sections/FounderStory';

const AppLayout: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <TestModeBanner />
      <BetaFeedbackBanner />
      <Header onNavigate={scrollTo} onStart={() => scrollTo('studio')} />
      <FeaturesOverview
        onSeePricing={() => scrollTo('pricing')}
        onStart={() => scrollTo('studio')}
      />
      <Hero onStart={() => scrollTo('studio')} onShowcase={() => scrollTo('showcase')} />
      <FounderStory onSeeSystem={() => scrollTo('pricing')} />
      <ChecklistOptin />
      <BooksSection />
      <Showcase onStart={() => scrollTo('studio')} />
      <ModelStudio />
      <SocialLinks />
      <ChatbotBuilder />
      <UnifiedInbox />
      <VoiceChanger />
      <MyVoiceClips />
      <AICloneStudio />

      <ContentScheduler />
      <AnalyticsDashboard />
      <CollabMarketplace />
      <ContentModeration />
      <Monetization />
      <SafetyGuide />
      <FAQ />
      <Pricing />
      <Footer />
    </div>
  );
};

export default AppLayout;
