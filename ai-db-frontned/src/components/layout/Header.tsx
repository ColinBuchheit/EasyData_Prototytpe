import React from 'react';
import { Sparkles } from 'lucide-react';
import ThemeSelector from '../settings/ThemeSelector';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-100 font-semibold text-lg">
        <Sparkles className="w-5 h-5 text-blue-500" />
        maiquery
      </div>

      <div className="flex items-center gap-4">
        <ThemeSelector />
        {/* Optional: user avatar */}
      </div>
    </header>
  );
};

export default Header;
