// src/components/settings/ThemeSwitcher.tsx
import React from 'react';
import { UserTheme } from '../../types/user.types';
import { Sun, Moon, Monitor, CheckCircle } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: UserTheme;
  onChange: (theme: UserTheme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onChange }) => {
  const themes: { id: UserTheme; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="w-5 h-5" />,
      description: 'Light mode for brighter environments'
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="w-5 h-5" />,
      description: 'Dark mode for reduced eye strain'
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor className="w-5 h-5" />,
      description: 'Follow your system preferences'
    }
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {themes.map((theme) => (
        <div 
          key={theme.id}
          onClick={() => onChange(theme.id)}
          className={`flex-1 bg-zinc-800 border ${
            currentTheme === theme.id 
              ? 'border-blue-500 ring-2 ring-blue-500/50' 
              : 'border-zinc-700 hover:border-zinc-600'
          } rounded-lg p-4 cursor-pointer transition-all`}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              currentTheme === theme.id
                ? theme.id === 'light' 
                  ? 'bg-amber-100 text-amber-600'
                  : theme.id === 'dark'
                  ? 'bg-blue-900 text-blue-300'
                  : 'bg-zinc-700 text-zinc-300'
                : 'bg-zinc-700 text-zinc-400'
            }`}>
              {theme.icon}
            </div>
            <h4 className="font-medium text-zinc-200 mb-1">{theme.label}</h4>
            <p className="text-xs text-zinc-500">{theme.description}</p>
          </div>
          {currentTheme === theme.id && (
            <div className="flex items-center justify-center mt-3">
              <span className="text-xs font-medium text-blue-400 bg-blue-900/20 px-2 py-1 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ThemeSwitcher;