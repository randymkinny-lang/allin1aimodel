import React from 'react';
import LegalPage from '@/components/legal/LegalPage';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setAgeVerified, isAgeVerified, clearAgeVerification } from '@/lib/ageGate';

const AgeGate: React.FC = () => {
  const navigate = useNavigate();
  const verified = isAgeVerified();

  const handleConfirm = () => {
    setAgeVerified(true);
    navigate('/');
  };

  const handleDeny = () => {
    clearAgeVerification();
    window.location.href = 'https://www.google.com';
  };

  return (
    <LegalPage title="Age Verification" subtitle="This Platform contains adult-oriented synthetic media. You must be 18+ to enter.">
      <div className="not-prose rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 mb-8 flex gap-4">
        <ShieldAlert className="h-8 w-8 text-amber-400 flex-shrink-0" />
        <div>
          <div className="text-white font-semibold mb-1">Status: {verified ? 'Verified 18+' : 'Not verified'}</div>
          <p className="text-sm text-slate-300">
            We use a localStorage flag to remember your confirmation on this device. Clearing your browser data will
            require re-verification. In jurisdictions that require ID verification (e.g., UK Online Safety Act,
            Louisiana, Texas HB 1181), we route you through a third-party age-verification provider before granting
            access to adult content.
          </p>
        </div>
      </div>

      <h2>Why we ask</h2>
      <p>
        All in 1 AI Model produces synthetic adult-oriented content including AI-generated photography, voice, and chat
        that may be sexually suggestive or explicit depending on creator settings. By federal law (18 U.S.C. § 2257)
        and equivalent international regulations, access is restricted to adults aged <strong>18 or older</strong>{' '}
        (or the age of majority in your jurisdiction, whichever is greater).
      </p>

      <h2>By clicking "I am 18 or older" you affirm that:</h2>
      <ul>
        <li>You are at least 18 years of age (or the legal age of majority in your jurisdiction).</li>
        <li>Adult content is legal to view in your location.</li>
        <li>You are accessing the Platform voluntarily and not on behalf of a minor.</li>
        <li>You will not share account access with anyone under 18.</li>
        <li>You understand all personas are AI-generated and not real people.</li>
      </ul>

      <div className="not-prose flex flex-col sm:flex-row gap-3 mt-8">
        <Button
          size="lg"
          onClick={handleConfirm}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold flex-1"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" /> I am 18 or older — enter
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleDeny}
          className="border-white/20 text-white hover:bg-white/5 flex-1"
        >
          <XCircle className="h-5 w-5 mr-2" /> I am under 18 — leave
        </Button>
      </div>

      <h2 className="mt-12">Parents &amp; Guardians</h2>
      <p>
        If you are a parent or guardian and want to block this site on devices used by minors, we recommend tools such as{' '}
        <a href="https://www.netnanny.com" target="_blank" rel="noopener noreferrer">Net Nanny</a>,{' '}
        <a href="https://qustodio.com" target="_blank" rel="noopener noreferrer">Qustodio</a>, or your operating system's
        built-in parental controls. The Platform is labeled with the RTA ("Restricted to Adults") meta tag, which is
        recognized by most filtering software.
      </p>
    </LegalPage>
  );
};

export default AgeGate;
