import React from 'react';
import { Mic2, Settings } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../lib/constants'; // Updated import path

interface HeaderProps {
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  return (
    <header className="relative flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
      
      {onOpenSettings && (
        <button 
          onClick={onOpenSettings}
          className="absolute top-4 right-4 p-2 text-slate-600 hover:text-amber-500 hover:bg-slate-800/50 rounded-full transition-all"
          title="Configure API Settings"
          aria-label="Open settings"
        >
          <Settings size={20} />
        </button>
      )}

      <div className="flex items-center space-x-3 text-amber-500">
        <Mic2 size={40} className="animate-pulse" aria-hidden="true" />
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
          {APP_NAME}
        </h1>
      </div>
      <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide">
        {APP_TAGLINE}
      </p>
      <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-4 opacity-50"></div>
    </header>
  );
};

export default React.memo(Header);