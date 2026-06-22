import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { User as UserIcon, LogOut, Image as ImageIcon, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTestMode } from '@/contexts/TestModeContext';
import { toast } from '@/components/ui/use-toast';
interface UserMenuProps {
  onNavigate: (id: string) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onNavigate }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useTestMode();
  const navigate = useNavigate();
  if (!user) return null;

  const email = user.email ?? '';
  const fullName = (user.user_metadata?.full_name as string) || '';
  const displayName = fullName || email.split('@')[0];
  const initial = (displayName[0] || 'U').toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out.' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-sm">
            {initial}
          </div>
          <span className="hidden sm:inline text-slate-200 text-sm font-medium max-w-[120px] truncate">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-slate-900 border-white/10 text-slate-200">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-white font-semibold truncate">{displayName}</span>
          <span className="text-xs text-slate-400 truncate font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => onNavigate('studio')}
          className="cursor-pointer focus:bg-white/10 focus:text-white"
        >
          <UserIcon className="h-4 w-4 mr-2" /> My Profile & Models
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/profile')}
          className="cursor-pointer focus:bg-white/10 focus:text-white"
        >
          <Settings className="h-4 w-4 mr-2" /> Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/gallery')}
          className="cursor-pointer focus:bg-white/10 focus:text-white"
        >
          <ImageIcon className="h-4 w-4 mr-2" /> My Gallery
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNavigate('monetize')}
          className="cursor-pointer focus:bg-white/10 focus:text-white"
        >
          <Settings className="h-4 w-4 mr-2" /> Account Settings
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => navigate('/admin')}
              className="cursor-pointer focus:bg-amber-500/10 focus:text-amber-200 text-amber-300"
            >
              <ShieldCheck className="h-4 w-4 mr-2" /> Admin · Runtime Flags
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
