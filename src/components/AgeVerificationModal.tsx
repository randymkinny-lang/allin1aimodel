import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useLocation } from 'react-router-dom';
import { isAgeVerified, setAgeVerified } from '@/lib/ageGate';

const AgeVerificationModal: React.FC = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    // Don't show on the dedicated /age-gate page (it has its own UI)
    if (location.pathname === '/age-gate') {
      setOpen(false);
      return;
    }
    setOpen(!isAgeVerified());

    const onChange = () => setOpen(!isAgeVerified());
    window.addEventListener('aii:age-verified-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('aii:age-verified-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [location.pathname]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!agree) return;
    setAgeVerified(true);
    setOpen(false);
  };

  const handleDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-amber-500/10 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Adults only · 18+</div>
            <h2 id="age-gate-title" className="text-xl sm:text-2xl font-bold text-white">Age verification required</h2>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          This Platform contains <strong className="text-white">AI-generated adult-oriented synthetic media</strong>.
          All personas are artificial — not real people. You must be at least 18 years old (or the age of majority in
          your jurisdiction) to enter.
        </p>

        <ul className="text-xs text-slate-400 space-y-1.5 mb-5 pl-4 list-disc">
          <li>I am 18 years of age or older.</li>
          <li>Adult content is legal where I live.</li>
          <li>I understand all content is AI-generated.</li>
          <li>I will not share access with minors.</li>
        </ul>

        <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
          <Checkbox
            id="age-agree"
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            className="mt-0.5 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950"
          />
          <span className="text-sm text-slate-200">
            I confirm all of the above and accept the{' '}
            <Link to="/terms" className="text-amber-400 hover:text-amber-300 underline">Terms</Link>,{' '}
            <Link to="/privacy" className="text-amber-400 hover:text-amber-300 underline">Privacy Policy</Link>, and{' '}
            <Link to="/ai-disclosure" className="text-amber-400 hover:text-amber-300 underline">AI Disclosure</Link>.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!agree}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> I am 18+ · Enter
          </Button>
          <Button
            onClick={handleDeny}
            variant="outline"
            className="flex-1 border-white/15 text-white hover:bg-white/5"
          >
            <XCircle className="h-4 w-4 mr-2" /> Leave
          </Button>
        </div>

        <p className="text-[11px] text-slate-500 mt-4 text-center">
          Verification is stored locally on this device. Clearing your browser data will require re-verification.{' '}
          <Link to="/age-gate" className="text-amber-400 hover:text-amber-300 underline">Learn more</Link>.
        </p>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
