import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Users, TrendingUp, Send, Search, Handshake, Sparkles, MessageSquare, CheckCircle2 } from 'lucide-react';

interface Creator {
  id: string; name: string; handle: string; avatar: string; niche: string;
  followers: number; engagement: number; bio: string;
}

const CREATORS: Creator[] = [
  { id: '1', name: 'Luna Vale', handle: '@lunavale.ai', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', niche: 'Fitness', followers: 184000, engagement: 8.4, bio: 'High-energy fitness AI — duets crush.' },
  { id: '2', name: 'Aria Noir', handle: '@arianoir', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300', niche: 'Fashion', followers: 92400, engagement: 6.1, bio: 'Couture aesthetics, luxury vibes.' },
  { id: '3', name: 'Sage Rivers', handle: '@sage.rivers', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300', niche: 'Wellness', followers: 210500, engagement: 9.2, bio: 'Mindful content, yoga, journaling.' },
  { id: '4', name: 'Kai Ember', handle: '@kaiember', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300', niche: 'Gaming', followers: 58200, engagement: 11.3, bio: 'Gamer girl persona, Twitch-style.' },
  { id: '5', name: 'Nova Soleil', handle: '@novasoleil', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', niche: 'Travel', followers: 142800, engagement: 7.6, bio: 'Travel diaries, beach content.' },
  { id: '6', name: 'Jade Mireille', handle: '@jademireille', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300', niche: 'Fashion', followers: 76300, engagement: 5.8, bio: 'French-inspired editorial looks.' },
  { id: '7', name: 'Ivy Reese', handle: '@ivyreese', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', niche: 'Lifestyle', followers: 305000, engagement: 6.9, bio: 'Soft aesthetic, lifestyle pillars.' },
  { id: '8', name: 'Zara Wilde', handle: '@zara.wilde', avatar: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=300', niche: 'Fitness', followers: 421000, engagement: 8.8, bio: 'Gym-core content, very shareable.' },
  { id: '9', name: 'Mira Luxe', handle: '@miraluxe', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300', niche: 'Wellness', followers: 88900, engagement: 10.1, bio: 'Meditation, mindful sensuality.' },
];

const SUCCESS_STORIES = [
  { a: 'Luna Vale', b: 'Zara Wilde', format: 'Dual workout reel', aGain: 18.4, bGain: 12.1 },
  { a: 'Aria Noir', b: 'Jade Mireille', format: 'Shared editorial series', aGain: 9.7, bGain: 14.3 },
  { a: 'Sage Rivers', b: 'Mira Luxe', format: 'Cross-posted meditation', aGain: 7.2, bGain: 22.5 },
];

const CollabMarketplace: React.FC = () => {
  const [niche, setNiche] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState(0);
  const [selected, setSelected] = useState<Creator | null>(null);
  const [pitch, setPitch] = useState('');
  const [collabType, setCollabType] = useState('duet');

  const [pending, setPending] = useState<{ id: string; to: string; type: string; status: 'pending' | 'accepted' }[]>([
    { id: 'c1', to: 'Nova Soleil', type: 'shoutout', status: 'pending' },
    { id: 'c2', to: 'Kai Ember', type: 'duet', status: 'accepted' },
  ]);

  const niches = ['all', ...Array.from(new Set(CREATORS.map((c) => c.niche)))];

  const filtered = useMemo(() => CREATORS.filter((c) =>
    (niche === 'all' || c.niche === niche) &&
    c.followers >= minFollowers &&
    (query === '' || c.name.toLowerCase().includes(query.toLowerCase()) || c.handle.toLowerCase().includes(query.toLowerCase()))
  ), [niche, query, minFollowers]);

  const sendRequest = () => {
    if (!selected) return;
    setPending((p) => [...p, { id: `c-${Date.now()}`, to: selected.name, type: collabType, status: 'pending' }]);
    toast({ title: 'Collab request sent!', description: `${selected.name} will see your pitch and reply in-app.` });
    setSelected(null); setPitch('');
  };

  return (
    <section id="collabs" className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Collab Marketplace</div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Cross-Promote. Grow Together.</h2>
          <p className="mt-3 text-slate-400">Discover AI creators, pitch duets, shoutouts, or joint content — and track the exact growth each collab drove.</p>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators…"
              className="bg-white/5 border-white/10 text-white pl-9" />
          </div>
          <select value={niche} onChange={(e) => setNiche(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-3 text-white text-sm">
            {niches.map((n) => <option key={n} value={n} className="bg-slate-900">{n === 'all' ? 'All niches' : n}</option>)}
          </select>
          <select value={minFollowers} onChange={(e) => setMinFollowers(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-md px-3 text-white text-sm">
            <option value={0} className="bg-slate-900">Any size</option>
            <option value={50000} className="bg-slate-900">50K+</option>
            <option value={100000} className="bg-slate-900">100K+</option>
            <option value={250000} className="bg-slate-900">250K+</option>
          </select>
        </div>

        {/* Directory grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-amber-400/40 transition">
              <div className="aspect-[4/3] bg-black/30 relative">
                <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                <Badge className="absolute top-2 left-2 bg-black/60 text-white border-0">{c.niche}</Badge>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-white font-semibold">{c.name}</div>
                    <div className="text-slate-400 text-xs">{c.handle}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-sm font-bold">{(c.followers / 1000).toFixed(1)}K</div>
                    <div className="text-slate-500 text-xs">{c.engagement}% eng</div>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-2 line-clamp-2">{c.bio}</p>
                <div className="flex gap-2 mt-3">
                  <Dialog open={selected?.id === c.id} onOpenChange={(o) => !o && setSelected(null)}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setSelected(c)} size="sm" className="flex-1 bg-amber-400 text-slate-950 font-semibold hover:bg-amber-500">
                        <Handshake className="h-3.5 w-3.5 mr-1" /> Collab
                      </Button>
                    </DialogTrigger>
                    {selected?.id === c.id && (
                      <DialogContent className="bg-slate-900 border-white/10 text-white">
                        <DialogHeader>
                          <DialogTitle>Pitch a collab to {c.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Collab type</div>
                            <div className="flex flex-wrap gap-2">
                              {['duet', 'shoutout', 'joint content', 'takeover'].map((t) => (
                                <button key={t} onClick={() => setCollabType(t)}
                                  className={`px-3 py-1.5 rounded-full text-xs border ${collabType === t ? 'bg-amber-400 text-slate-950 border-amber-400' : 'border-white/10 text-slate-300'}`}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Your pitch</div>
                            <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)}
                              placeholder="e.g. Love your fitness content — want to do a split-screen workout duet for TikTok + IG?"
                              className="bg-white/5 border-white/10 text-white min-h-[100px]" />
                          </div>
                          <Button onClick={sendRequest} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold">
                            <Send className="h-4 w-4 mr-2" /> Send Request
                          </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  <Button size="sm" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5"
                    onClick={() => toast({ title: `Message sent to ${c.name}` })}>
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">No creators match your filters.</div>}
        </div>

        {/* Two-column: Pending + Success */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-amber-400" /> Your Collab Pipeline</h3>
            <div className="space-y-2">
              {pending.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                  <div>
                    <div className="text-white text-sm font-medium">{c.to}</div>
                    <div className="text-slate-400 text-xs capitalize">{c.type}</div>
                  </div>
                  <Badge className={c.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}>
                    {c.status === 'accepted' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                    {c.status}
                  </Badge>
                </div>
              ))}
              {pending.length === 0 && <div className="text-slate-500 text-sm text-center py-6">No pending collabs yet.</div>}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-600/15 to-amber-400/10 border border-amber-400/30 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Success Stories</h3>
            <div className="space-y-3">
              {SUCCESS_STORIES.map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-black/30 border border-white/10">
                  <div className="text-white text-sm font-semibold">{s.a} × {s.b}</div>
                  <div className="text-slate-400 text-xs">{s.format}</div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-emerald-400"><TrendingUp className="h-3 w-3 inline mr-1" /> {s.a.split(' ')[0]} +{s.aGain}%</span>
                    <span className="text-emerald-400"><TrendingUp className="h-3 w-3 inline mr-1" /> {s.b.split(' ')[0]} +{s.bGain}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollabMarketplace;
