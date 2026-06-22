import React from 'react';
import { SOCIAL_PLATFORMS } from '@/data/models';
import { ExternalLink } from 'lucide-react';

const SocialLinks: React.FC = () => {
  return (
    <section id="social" className="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Platform Launchpad</div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Launch Across Every Platform</h2>
          <p className="mt-3 text-slate-400">One-click signup access to every major platform your AI model needs to thrive. Maximize reach, maximize revenue.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {SOCIAL_PLATFORMS.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl p-5 bg-white/5 border border-white/10 hover:border-amber-400/50 transition"
            >
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${p.color} mb-3`} />
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold">{p.name}</div>
                <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition" />
              </div>
              <div className="text-slate-400 text-xs mt-1">{p.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialLinks;
