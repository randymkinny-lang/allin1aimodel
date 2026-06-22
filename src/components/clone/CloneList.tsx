import React from 'react';
import { Loader2, Trash2, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

export interface CloneRow {
  id: string;
  name: string;
  reference_video_url: string | null;
  thumbnail_url: string | null;
  status: string;
  analysis: any;
  created_at: string;
}

interface CloneListProps {
  clones: CloneRow[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (clone: CloneRow) => void;
  onDeleted: (id: string) => void;
}

const CloneList: React.FC<CloneListProps> = ({ clones, loading, selectedId, onSelect, onDeleted }) => {
  const handleDelete = async (e: React.MouseEvent, c: CloneRow) => {
    e.stopPropagation();
    if (!confirm(`Delete clone "${c.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('ai_clones').delete().eq('id', c.id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    onDeleted(c.id);
    toast({ title: 'Clone deleted' });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!clones.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-fuchsia-400" />
        <p className="text-white font-medium">No clones yet</p>
        <p className="text-slate-400 text-sm mt-1">Upload a reference video above to train your first AI clone.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clones.map((c) => {
        const isSelected = selectedId === c.id;
        const ready = c.status === 'ready';
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={`group text-left rounded-xl border bg-slate-900/60 overflow-hidden transition relative ${
              isSelected
                ? 'border-fuchsia-500/70 ring-2 ring-fuchsia-500/30'
                : 'border-white/10 hover:border-fuchsia-500/40'
            }`}
          >
            <div className="aspect-video bg-slate-800 relative overflow-hidden">
              {c.thumbnail_url ? (
                <img
                  src={c.thumbnail_url}
                  alt={c.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Sparkles className="h-8 w-8" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                {ready ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold px-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold px-2 py-0.5">
                    <Clock className="h-3 w-3" /> Training
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(e, c)}
                className="absolute top-2 right-2 rounded-md bg-black/60 hover:bg-red-600/80 text-white p-1.5 transition opacity-0 group-hover:opacity-100"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white font-medium truncate">{c.name}</p>
              </div>
              {c.analysis?.summary && (
                <p className="text-slate-400 text-xs mt-1 line-clamp-2">{c.analysis.summary}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CloneList;
