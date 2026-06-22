import React, { useState } from 'react';
import { CHAT_SNIPPETS } from '@/data/chatTemplates';
import { GripVertical, X, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TemplateStack: React.FC<Props> = ({ selectedIds, onChange }) => {
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= selectedIds.length) return;
    const next = [...selectedIds];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  const handleDrop = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Reorder existing
    if (dragIndex !== null && selectedIds.includes(id)) {
      const target = dropIndex ?? selectedIds.length;
      if (dragIndex === target) { setDragIndex(null); return; }
      const next = [...selectedIds];
      const [x] = next.splice(dragIndex, 1);
      const adjusted = target > dragIndex ? target - 1 : target;
      next.splice(adjusted, 0, x);
      onChange(next);
      setDragIndex(null);
      return;
    }

    // Add new
    if (!selectedIds.includes(id)) {
      if (dropIndex === undefined) onChange([...selectedIds, id]);
      else {
        const next = [...selectedIds];
        next.splice(dropIndex, 0, id);
        onChange(next);
      }
    }
    setDragIndex(null);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Your Chatbot Stack</h3>
          <p className="text-slate-400 text-xs">Drag templates from the library here. Drag to reorder — top rules win.</p>
        </div>
        <div className="text-xs text-slate-400">
          <span className="text-amber-400 font-semibold">{selectedIds.length}</span> active
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => handleDrop(e)}
        className={`min-h-[320px] rounded-xl border-2 border-dashed p-3 transition ${
          dragOver ? 'border-amber-400 bg-amber-400/5' : 'border-white/10 bg-black/20'
        }`}
      >
        {selectedIds.length === 0 ? (
          <div className="h-full min-h-[280px] grid place-items-center text-center text-slate-500">
            <div>
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <div className="text-sm">Drop templates here</div>
              <div className="text-xs mt-1">Or click the + next to any template in the library.</div>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedIds.map((id, i) => {
              const snip = CHAT_SNIPPETS.find((s) => s.id === id);
              if (!snip) return null;
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', id);
                    setDragIndex(i);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, i)}
                  className="group flex items-start gap-2 p-3 rounded-lg bg-slate-900/60 border border-white/10 hover:border-amber-400/40"
                >
                  <GripVertical className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">{snip.category}</span>
                      <span className="text-white text-sm font-medium">{snip.title}</span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">{snip.text}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      className="h-6 w-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 grid place-items-center"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-slate-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === selectedIds.length - 1}
                      className="h-6 w-6 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 grid place-items-center"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-slate-300" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="h-7 w-7 rounded-md bg-red-500/10 hover:bg-red-500/20 grid place-items-center"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TemplateStack;
