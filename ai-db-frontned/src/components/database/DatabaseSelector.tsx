import React from 'react';
import Dropdown from '../common/Dropdown';
import { DbConnection } from '../../types/database.types';
import { Database } from 'lucide-react';

interface DatabaseSelectorProps {
  connections: DbConnection[];
  selectedId?: number;
  onSelect: (id: number) => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  connections,
  selectedId,
  onSelect,
}) => {
  const selected = connections.find((c) => c.id === selectedId);

  return (
    <Dropdown
      triggerLabel={selected?.connection_name || 'Select Database'}
      items={connections.map((conn) => ({
        label: conn.connection_name || conn.database_name,
        icon: <Database className="w-4 h-4" />,
        onSelect: () => onSelect(conn.id),
      }))}
    />
  );
};

export default DatabaseSelector;
