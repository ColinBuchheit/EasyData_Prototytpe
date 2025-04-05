import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { DatabaseType } from '../../types/database.types';

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
      db_type: 'postgres',
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
      <Input
        label="Connection Name"
        value={form.connection_name}
        onChange={(e) => handleChange('connection_name', e.target.value)}
      />
      <Input
        label="Host"
        value={form.host}
        onChange={(e) => handleChange('host', e.target.value)}
      />
      <Input
        label="Port"
        type="number"
        value={form.port}
        onChange={(e) => handleChange('port', Number(e.target.value))}
      />
      <Input
        label="Username"
        value={form.username}
        onChange={(e) => handleChange('username', e.target.value)}
      />
      <Input
        label="Database Name"
        value={form.database_name}
        onChange={(e) => handleChange('database_name', e.target.value)}
      />

      <label className="block text-sm text-zinc-300">Database Type</label>
      <select
        value={form.db_type}
        onChange={(e) => handleChange('db_type', e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {dbTypes.map((type) => (
          <option key={type} value={type}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </option>
        ))}
      </select>

      <Button type="submit" className="w-full">
        {initial ? 'Update Connection' : 'Create Connection'}
      </Button>
    </form>
  );
};

export default ConnectionForm;
