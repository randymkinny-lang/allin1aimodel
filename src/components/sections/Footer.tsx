import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type FooterLink = { label: string; to?: string; href?: string };

const LOGO_URL =
  'https://d64gsuwffb70l.cloudfront.net/69e3fc416958e05d4f216fb0_1780369462937_b0834f8f.png';

const Footer: React.FC = () => {
  const brandName = 'All in 1 AI Model';
  const brandTagline =
    'The complete platform for building, managing, and monetizing realistic AI personalities. Built by Randy Kinny.';

  const cols: { title: string; links: FooterLink[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'Model Studio', href: '/#studio' },
        { label: 'AI Chatbot', href: '/#chatbot' },
        { label: 'Unified Inbox', href: '/#inbox' },
        { label: 'Voice Changer', href: '/#voice-changer' },
        { label: 'Monetization', href: '/#monetize' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Creator Academy', to: '/academy' },
        { label: 'Discover', to: '/discover' },
        { label: 'Gallery', to: '/gallery' },
        { label: 'Help Center', href: 'mailto:allin1aimodels@gmail.com' },
        { label: 'Contact', href: 'mailto:allin1aimodels@gmail.com' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Features', href: '/#showcase' },
        { label: 'Pricing', href: '/#pricing' },
        { label: 'Trust & Safety', href: 'mailto:allin1aimodels@gmail.com' },
        { label: 'Press', href: 'mailto:allin1aimodels@gmail.com' },
        { label: 'Partners', href: 'mailto:allin1aimodels@gmail.com' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'DMCA', to: '/dmca' },
        { label: 'AI Disclosure', to: '/ai-disclosure' },
        { label: '18+ Age Verification', to: '/age-gate' },
      ],
    },
  ];

  const renderLink = (l: FooterLink) => {
    const cls = 'text-slate-400 hover:text-amber-400 text-sm transition';
    if (l.to) {
      return <Link to={l.to} className={cls}>{l.label}</Link>;
    }
    return <a href={l.href || '#'} className={cls}>{l.label}</a>;
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <img
                src={LOGO_URL}
                alt={brandName}
                className="h-10 w-auto object-contain"
                draggable={false}
              />
              <span className="sr-only">{brandName}</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm mb-4">{brandTagline}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> 18+ · AI-generated content disclosed
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-white font-semibold mb-3 text-sm">{c.title}</div>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>{renderLink(l)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500">
          <div>
            © 2026 All in 1 AI Model — All rights reserved. All personas are AI-generated. 18+ only.{' '}
            <Link to="/ai-disclosure" className="text-amber-400/80 hover:text-amber-300 underline">AI Disclosure</Link>
            {' · '}
            <Link to="/terms" className="hover:text-amber-300 underline">Terms</Link>
            {' · '}
            <Link to="/privacy" className="hover:text-amber-300 underline">Privacy</Link>
          </div>
          <div>Made for creators, powered by ethical AI.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
