import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/sections/Footer';

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({
  title,
  subtitle,
  lastUpdated = 'April 28, 2026',
  children,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (id: string) => {
    if (id === 'top') {
      navigate('/');
      return;
    }
    navigate(`/#${id}`);
  };

  const handleStart = () => navigate('/');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header onNavigate={handleNavigate} onStart={handleStart} />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 mb-6 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3">{title}</h1>
          {subtitle && <p className="text-slate-400 text-lg mb-2">{subtitle}</p>}
          <p className="text-xs text-slate-500 mb-10">Last updated: {lastUpdated}</p>
          <article className="prose prose-invert max-w-none prose-headings:text-white prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-300 prose-strong:text-white prose-a:text-amber-400 hover:prose-a:text-amber-300">
            {children}
          </article>
          <div className="mt-12 pt-8 border-t border-white/10 text-sm text-slate-500">
            Questions? Contact{' '}
            <a
              href="mailto:legal@allin1aimodel.com"
              className="text-amber-400 hover:text-amber-300"
            >
              legal@allin1aimodel.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
