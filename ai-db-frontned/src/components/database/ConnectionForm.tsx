// components/database/ConnectionForm.tsx
import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { Listbox } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { DatabaseType } from '../../types/database.types.ts';

interface ConnectionFormProps {
  onSubmit: (data: any) => void;
  initial?: any;
}

const dbTypes: DatabaseType[] = [
  'postgres', 'mysql', 'mssql', 'sqlite', 'mongodb', 'firebase', 'couchdb', 'dynamodb',
];

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onSubmit, initial }) => {
  const [form, setForm] = useState(
    initial || {
      connection_name: '',
      db_type: dbTypes[0],
      host: '',
      port: 5432,
      username: '',
      database_name: '',
    }
  );

  const handleChange = (field: string, value: string | number) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Connection Name" value={form.connection_name} onChange={(e) => handleChange('connection_name', e.target.value)} />
      <Input label="Host" value={form.host} onChange={(e) => handleChange('host', e.target.value)} />
      <Input label="Port" type="number" value={form.port} onChange={(e) => handleChange('port', Number(e.target.value))} />
      <Input label="Username" value={form.username} onChange={(e) => handleChange('username', e.target.value)} />
      <Input label="Database Name" value={form.database_name} onChange={(e) => handleChange('database_name', e.target.value)} />

      <div>
        <label className="block text-sm mb-1 text-zinc-300">Database Type</label>
        <Listbox value={form.db_type} onChange={(val) => handleChange('db_type', val)}>
          <div className="relative">
            <Listbox.Button className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md flex justify-between items-center">
              {form.db_type}
              <ChevronsUpDown className="w-4 h-4" />
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-10">
              {dbTypes.map((type) => (
                <Listbox.Option
                  key={type}
                  value={type}
                  className={({ active }) =>
                    `px-4 py-2 text-sm cursor-pointer ${
                      active ? 'bg-blue-600 text-white' : 'text-zinc-100'
                    }`
                  }
                >
                  {({ selected }) => (
                    <span className="flex items-center gap-2">
                      {selected && <Check className="w-4 h-4" />}
                      {type}
                    </span>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      <Button type="submit" className="w-full">
        {initial ? 'Update Connection' : 'Create Connection'}
      </Button>
    </form>
  );
};

export default ConnectionForm;
