import React from 'react';
import { SAMPLE_MODELS } from '@/data/models';
import { TrendingUp, Users, Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: 'I had zero experience and launched my first AI model in one afternoon. The ban-prevention guides alone saved my account.',
    author: 'Creator from Texas',
  },
  {
    quote: 'The chatbot handles my DMs 24/7 while I sleep. I wake up to new subscribers every morning.',
    author: 'Creator from Florida',
  },
  {
    quote: 'I went from $0 to $4,200/mo in my first 60 days using the curriculum inside the app.',
    author: 'Creator from Atlanta',
  },
];

const Showcase: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <section id="showcase" className="py-20 lg:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Success Stories</div>
          <h2 className="text-3xl lg:text-5xl font-bold text-white">Real AI Models. Real Revenue.</h2>
          <p className="mt-4 text-slate-400 text-lg">Browse a sample of AI personalities our creators have launched. Every face, personality, and revenue stream built from scratch on All in 1 AI Model.</p>

        </div>
        <p className="text-center text-xs text-slate-500 mb-6">Example AI models built on All in 1 AI Model. Results vary.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_MODELS.map((m) => (
            <div key={m.id} className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/40 transition">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-amber-400 text-xs font-semibold border border-amber-400/30">
                  {m.personality}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-bold text-white">{m.name}, {m.age}</h3>
                  <p className="text-slate-300 text-sm mt-1">{m.tagline}</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <div>
                    <div className="text-white text-sm font-semibold">{m.subs.toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">Subscribers</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="text-emerald-400 text-sm font-semibold">{m.revenue}</div>
                    <div className="text-slate-500 text-xs">Revenue</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">What Creators Say</div>
            <h3 className="text-2xl lg:text-4xl font-bold text-white">Loved by Creators Worldwide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="relative rounded-2xl bg-slate-900 border border-white/10 p-7 flex flex-col">
                <Quote className="h-9 w-9 text-amber-400 mb-4" fill="currentColor" />
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 text-amber-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-slate-200 text-base leading-relaxed flex-1">"{t.quote}"</p>
                <p className="mt-5 text-amber-400 font-semibold text-sm">— {t.author}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">Real testimonials on file. Names withheld for creator privacy.</p>
        </div>

        <div className="text-center mt-12">
          <button onClick={onStart} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-semibold shadow-lg shadow-amber-500/30">
            Build Yours Now →
          </button>
        </div>
      </div>
    </section>
  );
};

export default Showcase;
