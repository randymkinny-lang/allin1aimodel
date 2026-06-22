
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';

const Index: React.FC = () => {
  const location = useLocation();

  // When arriving with a hash (e.g. /#studio from /gallery), scroll after mount
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // give the DOM a tick to render all sections
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [location.hash]);

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default Index;
