// components/settings/Preferences.tsx
import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import Button from '../common/Button';

const Preferences: React.FC = () => {
  const [preferences, setPreferences] = useState({
    defaultQueryMode: 'natural',
    autoVisualize: true,
  });

  const handleChange = (field: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saved preferences:', preferences);
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-lg font-semibold text-zinc-100">Preferences</h2>

      <div>
        <label className="block text-sm mb-1 text-zinc-300">Default Query Mode</label>
        <select
          value={preferences.defaultQueryMode}
          onChange={(e) => handleChange('defaultQueryMode', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="natural">Natural Language</option>
          <option value="sql">SQL Mode</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Auto-generate visualizations</span>
        <Switch
          checked={preferences.autoVisualize}
          onChange={(val) => handleChange('autoVisualize', val)}
          className={`${
            preferences.autoVisualize ? 'bg-blue-600' : 'bg-zinc-700'
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        >
          <span
            className={`${
              preferences.autoVisualize ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
          />
        </Switch>
      </div>

      <Button onClick={handleSave}>Save Preferences</Button>
    </div>
  );
};

export default Preferences;
