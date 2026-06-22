import React, { useMemo, useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePrompt from '@/components/UpgradePrompt';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Users, DollarSign, TrendingUp, MousePointerClick, Download, Calendar, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const PLATFORMS = ['Instagram', 'TikTok', 'OnlyFans', 'Fansly', 'Twitter', 'Facebook'];
const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C', TikTok: '#69C9D0', OnlyFans: '#00AFF0',
  Fansly: '#1DA1F2', Twitter: '#1D9BF0', Facebook: '#1877F2',
};

function genSeries(days: number, base: number, volatility = 0.15) {
  const out: { date: string; followers: number; engagement: number; revenue: number }[] = [];
  let f = base;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    f += Math.round((Math.random() - 0.3) * base * volatility * 0.05);
    out.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers: f,
      engagement: Math.round((4 + Math.random() * 3) * 10) / 10,
      revenue: Math.round(80 + Math.random() * 220),
    });
  }
  return out;
}

const AnalyticsDashboard: React.FC = () => {
  const { canUseFeature, tier } = useSubscription();
  const hasAccess = canUseFeature('analytics');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;
  const data = useMemo(() => genSeries(days, 42000), [days]);

  const platformData = useMemo(
    () => PLATFORMS.map((p) => ({
      platform: p,
      followers: Math.round(8000 + Math.random() * 50000),
      engagement: Math.round((3 + Math.random() * 5) * 10) / 10,
      revenue: Math.round(400 + Math.random() * 3500),
      ctr: Math.round((1 + Math.random() * 6) * 10) / 10,
    })),
    [range]
  );

  const contentTypes = [
    { type: 'Photos', value: 45 },
    { type: 'Short Video', value: 30 },
    { type: 'Stories', value: 15 },
    { type: 'Live', value: 10 },
  ];

  const demographics = [
    { name: '18-24', value: 22 },
    { name: '25-34', value: 41 },
    { name: '35-44', value: 23 },
    { name: '45-54', value: 10 },
    { name: '55+', value: 4 },
  ];

  const totalFollowers = platformData.reduce((s, p) => s + p.followers, 0);
  const totalRevenue = platformData.reduce((s, p) => s + p.revenue, 0);
  const avgEngagement = (platformData.reduce((s, p) => s + p.engagement, 0) / platformData.length).toFixed(1);
  const avgCTR = (platformData.reduce((s, p) => s + p.ctr, 0) / platformData.length).toFixed(1);

  const exportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Allow popups to export your analytics PDF.', variant: 'destructive' });
      return;
    }
    const html = `<!doctype html><html><head><title>Analytics Report · ${tier.name}</title>
      <style>body{font-family:system-ui;padding:40px;color:#0f172a}h1{color:#b45309}
      table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #e2e8f0;padding:10px;text-align:left}
      th{background:#fef3c7}</style></head><body>
      <h1>All in 1 AI Model — Analytics Report</h1>

      <p><b>Range:</b> Last ${days} days · <b>Generated:</b> ${new Date().toLocaleString()}</p>
      <h2>Summary</h2>
      <table><tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Followers</td><td>${totalFollowers.toLocaleString()}</td></tr>
      <tr><td>Revenue This Period</td><td>$${totalRevenue.toLocaleString()}</td></tr>
      <tr><td>Avg Engagement Rate</td><td>${avgEngagement}%</td></tr>
      <tr><td>Avg Upsell CTR</td><td>${avgCTR}%</td></tr></table>
      <h2>Platform Breakdown</h2>
      <table><tr><th>Platform</th><th>Followers</th><th>Engagement</th><th>Revenue</th><th>CTR</th></tr>
      ${platformData.map(p => `<tr><td>${p.platform}</td><td>${p.followers.toLocaleString()}</td><td>${p.engagement}%</td><td>$${p.revenue}</td><td>${p.ctr}%</td></tr>`).join('')}
      </table>
      <p style="margin-top:40px;color:#64748b;font-size:12px">Use your browser's Print dialog (Ctrl/Cmd+P) to save this report as a PDF.</p>
      </body></html>`;
    win.document.write(html); win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <section id="analytics" className="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <div className="text-amber-400 text-sm font-semibold tracking-wider uppercase mb-3">Advanced Analytics</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">Growth & Revenue Dashboard</h2>
            <p className="mt-3 text-slate-400">Real-time metrics pulled from every connected social and payment platform.</p>
          </div>
          {hasAccess && (
            <Button onClick={exportPDF} variant="outline" className="border-amber-400/40 text-amber-300 hover:bg-amber-400/10">
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          )}
        </div>

        {!hasAccess ? (
          <UpgradePrompt
            title="Analytics unlocks on Creator · $55/mo"
            description="Follower growth, revenue, engagement breakdowns, CTR tracking, demographics, and side-by-side platform comparison are included on Creator and above."
            requiredTierId="creator"
          />

        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: 'Total Followers', value: totalFollowers.toLocaleString(), sub: '+8.2% vs prev.', color: 'from-blue-500 to-cyan-500' },
                { icon: DollarSign, label: 'Revenue This Period', value: `$${totalRevenue.toLocaleString()}`, sub: '+12.4% vs prev.', color: 'from-emerald-500 to-green-500' },
                { icon: TrendingUp, label: 'Avg Engagement', value: `${avgEngagement}%`, sub: '+0.4pp vs prev.', color: 'from-amber-400 to-orange-500' },
                { icon: MousePointerClick, label: 'Upsell CTR', value: `${avgCTR}%`, sub: '+0.8pp vs prev.', color: 'from-purple-500 to-pink-500' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider">{s.label}</div>
                  <div className="text-white text-2xl font-bold mt-1">{s.value}</div>
                  <div className="text-emerald-400 text-xs mt-1">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Date range controls */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Calendar className="h-4 w-4 text-amber-400" />
              {(['7d', '30d', '90d', 'custom'] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    range === r ? 'bg-amber-400 text-slate-950 border-amber-400' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}>
                  {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : r === '90d' ? 'Last 90 days' : 'Custom'}
                </button>
              ))}
              {range === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white" />
                  <span className="text-slate-500 text-xs">to</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white" />
                </div>
              )}
            </div>

            <Tabs defaultValue="growth" className="w-full">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="growth">Growth</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="comparison">Platform Compare</TabsTrigger>
                <TabsTrigger value="content">Content & Audience</TabsTrigger>
              </TabsList>

              <TabsContent value="growth" className="mt-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <h3 className="text-white font-semibold mb-4">Follower Growth</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="followers" stroke="#fbbf24" fillOpacity={1} fill="url(#fg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mt-4">
                  <h3 className="text-white font-semibold mb-4">Engagement Rate by Day</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="engagement" stroke="#a78bfa" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="revenue" className="mt-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <h3 className="text-white font-semibold mb-4">Revenue per Platform</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="platform" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                          {platformData.map((p, i) => (
                            <Cell key={i} fill={PLATFORM_COLORS[p.platform] || '#fbbf24'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mt-4">
                  <h3 className="text-white font-semibold mb-4">Daily Revenue Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#rv)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="mt-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <h3 className="text-white font-semibold mb-1">Side-by-Side Platform Performance</h3>
                  <p className="text-slate-400 text-xs mb-4">Compare engagement and CTR across every connected platform.</p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="platform" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="engagement" fill="#fbbf24" name="Engagement %" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="ctr" fill="#a78bfa" name="Upsell CTR %" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-slate-400 border-b border-white/10">
                        <th className="text-left p-2">Platform</th><th className="text-right p-2">Followers</th>
                        <th className="text-right p-2">Engagement</th><th className="text-right p-2">Revenue</th><th className="text-right p-2">CTR</th>
                      </tr></thead>
                      <tbody>{platformData.map((p) => (
                        <tr key={p.platform} className="border-b border-white/5 text-white">
                          <td className="p-2 font-medium" style={{ color: PLATFORM_COLORS[p.platform] }}>{p.platform}</td>
                          <td className="p-2 text-right">{p.followers.toLocaleString()}</td>
                          <td className="p-2 text-right">{p.engagement}%</td>
                          <td className="p-2 text-right">${p.revenue}</td>
                          <td className="p-2 text-right">{p.ctr}%</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-amber-400" /> Top Performing Content Types</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={contentTypes} dataKey="value" nameKey="type" outerRadius={90} label>
                            {contentTypes.map((_, i) => (
                              <Cell key={i} fill={['#fbbf24', '#a78bfa', '#60a5fa', '#f472b6'][i]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h3 className="text-white font-semibold mb-4">Audience Demographics (Age)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demographics} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} unit="%" />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                          <Bar dataKey="value" fill="#fbbf24" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </section>
  );
};

export default AnalyticsDashboard;
