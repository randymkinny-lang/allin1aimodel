import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/sections/Footer';
import TestModeBanner from '@/components/TestModeBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  RefreshCw,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTestMode } from '@/contexts/TestModeContext';
import SubscriptionsAdmin from '@/components/admin/SubscriptionsAdmin';

const AdminSubscriptions: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: flagsLoading } = useTestMode();

  const renderShell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TestModeBanner />
      <Header onNavigate={(id) => navigate(`/#${id}`)} onStart={() => navigate('/')} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">{children}</main>
      <Footer />
    </div>
  );

  if (authLoading || flagsLoading) {
    return renderShell(
      <div className="flex items-center justify-center py-32 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>,
    );
  }

  if (!user) {
    return renderShell(
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <Lock className="h-10 w-10 text-amber-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Admin sign-in required</h1>
        <p className="mt-2 text-slate-400">
          You need to be signed in with an admin email to view subscriptions.
        </p>
        <Button
          onClick={() => navigate('/')}
          className="mt-6 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to site
        </Button>
      </div>,
    );
  }

  if (!isAdmin) {
    return renderShell(
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8">
        <div className="flex items-center gap-3 text-rose-300">
          <ShieldAlert className="h-6 w-6" />
          <h1 className="text-xl font-bold">Access denied</h1>
        </div>
        <p className="mt-3 text-slate-300">
          Your account (<span className="font-mono">{user.email}</span>) is not in the{' '}
          <span className="font-mono">ADMIN_EMAILS</span> allowlist.
        </p>
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mt-5 border-white/15 text-slate-200 hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to site
        </Button>
      </div>,
    );
  }

  return renderShell(
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-slate-400 hover:text-amber-300 flex items-center gap-2 mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-amber-300" />
            Admin · Subscriptions
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Signed in as <span className="font-mono text-slate-300">{user.email}</span>
            <Badge className="ml-2 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              <ShieldCheck className="h-3 w-3 mr-1" /> ADMIN
            </Badge>
          </p>
        </div>
      </div>

      <SubscriptionsAdmin />
    </div>,
  );
};

export default AdminSubscriptions;
