import React from 'react';
import { DbConnection } from '../../types/database.types';
import { Database, Link2, XCircle } from 'lucide-react';
import { cn } from '../../utils/format.utils';

interface ConnectionListProps {
  connections: DbConnection[];
  onSelect: (id: number) => void;
  selectedId?: number;
}

const ConnectionList: React.FC<ConnectionListProps> = ({ connections, onSelect, selectedId }) => {
  return (
    <div className="space-y-2">
      {connections.map((conn) => (
        <div
          key={conn.id}
          onClick={() => onSelect(conn.id)}
          className={cn(
            'flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors',
            conn.id === selectedId
              ? 'bg-zinc-800 border-blue-600'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700'
          )}
        >
          <div className="flex items-center gap-2 text-sm text-zinc-100">
            <Database className="w-4 h-4" />
            <span>{conn.connection_name || conn.database_name}</span>
          </div>

          {conn.is_connected ? (
            <Link2 className="w-4 h-4 text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
      ))}
    </div>
  );
};

export default ConnectionList;
