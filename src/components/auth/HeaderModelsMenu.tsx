import React from 'react';
import { Users, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useModels } from '@/contexts/ModelsContext';
import { toast } from '@/components/ui/use-toast';

interface Props {
  onNavigate: (id: string) => void;
}

const HeaderModelsMenu: React.FC<Props> = ({ onNavigate }) => {
  const { models, currentId, loadModel, newModel } = useModels();

  const activeName = currentId ? models.find((m) => m.id === currentId)?.name || 'Model' : 'New';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hidden md:inline-flex text-slate-300 hover:text-white hover:bg-white/10 gap-2 max-w-[180px]"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate">{activeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-slate-900 border-white/10 text-white" align="end">
        <DropdownMenuLabel className="text-slate-400">Switch Model</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {models.length === 0 && (
          <div className="px-2 py-3 text-sm text-slate-400">No saved models yet.</div>
        )}
        {models.map((m) => (
          <DropdownMenuItem
            key={m.id}
            className="focus:bg-white/10 cursor-pointer flex items-center justify-between gap-2"
            onSelect={() => {
              loadModel(m.id);
              toast({ title: 'Loaded', description: `${m.name} is now active.` });
              onNavigate('studio');
            }}
          >
            <span className="truncate">{m.name}</span>
            {currentId === m.id && <Check className="h-4 w-4 text-amber-400" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="focus:bg-white/10 cursor-pointer"
          onSelect={() => {
            newModel();
            onNavigate('studio');
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> New model
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderModelsMenu;
