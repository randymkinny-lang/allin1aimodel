import React, { useMemo, useState } from 'react';
import { CHAT_SNIPPETS, SNIPPET_CATEGORIES, type ChatSnippet } from '@/data/chatTemplates';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Plus, Search } from 'lucide-react';

interface Props {
  selectedIds: string[];
  onAdd: (id: string) => void;
  onDragStart: (id: string) => void;
}

const TemplateLibrary: React.FC<Props> = ({ selectedIds, onAdd, onDragStart }) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CHAT_SNIPPETS.filter((s) => {
      if (cat !== 'All' && s.category !== cat) return false;
      if (!needle) return true;
      return (
        s.title.toLowerCase().includes(needle) ||
        s.text.toLowerCase().includes(needle) ||
        s.category.toLowerCase().includes(needle)
      );
    });
  }, [q, cat]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChatSnippet[]>();
    filtered.forEach((s) => {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    });
    return map;
  }, [filtered]);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-white font-semibold">Template Library</h3>
          <p className="text-slate-400 text-xs">{CHAT_SNIPPETS.length}+ drag-and-drop behaviors. Click <Plus className="inline h-3 w-3" /> or drag to add.</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="bg-white/5 border-white/10 text-white pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {['All', ...SNIPPET_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              cat === c
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-semibold'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-amber-400/50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="max-h-[520px] overflow-y-auto pr-1 space-y-4">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <div className="text-amber-400 text-[11px] font-semibold tracking-wider uppercase mb-2 sticky top-0 bg-slate-950/80 backdrop-blur py-1">
              {category} <span className="text-slate-500">· {items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((s) => {
                const active = selectedIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', s.id);
                      onDragStart(s.id);
                    }}
                    className={`group flex items-start gap-2 p-2.5 rounded-lg border transition cursor-grab active:cursor-grabbing ${
                      active
                        ? 'bg-amber-400/10 border-amber-400/50'
                        : 'bg-white/5 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white text-sm font-medium truncate">{s.title}</div>
                        {active && <Badge className="bg-amber-400 text-slate-950 text-[10px]">added</Badge>}
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5 line-clamp-2">{s.text}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdd(s.id)}
                      disabled={active}
                      className="flex-shrink-0 h-7 w-7 rounded-md bg-amber-400/10 hover:bg-amber-400/20 disabled:opacity-40 grid place-items-center"
                      aria-label="Add"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-10">No templates match your search.</div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;
