// components/settings/ThemeSelector.tsx
import { Switch } from '@headlessui/react';
import { Moon, Sun } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const ThemeSelector: React.FC = () => {
  const [enabled, setEnabled] = useState(true); // true = dark

  useEffect(() => {
    document.documentElement.classList.toggle('dark', enabled);
  }, [enabled]);

  return (
    <Switch
      checked={enabled}
      onChange={setEnabled}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? 'bg-blue-600' : 'bg-zinc-700'
      }`}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {enabled ? (
          <Moon className="w-4 h-4 m-1 text-blue-600" />
        ) : (
          <Sun className="w-4 h-4 m-1 text-yellow-400" />
        )}
      </span>
    </Switch>
  );
};

export default ThemeSelector;
