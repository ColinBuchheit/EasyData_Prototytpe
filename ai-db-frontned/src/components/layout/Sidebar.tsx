import React from 'react';
import ConnectionList from '../database/ConnectionList';
import DatabaseSelector from '../database/DatabaseSelector';
import SchemaViewer from '../database/SchemaViewer';
import { useDatabase } from '../../hooks/useDatabase';

const Sidebar: React.FC = () => {
  const { connections, selectedConnection, loading } = useDatabase();

  const schema = selectedConnection?.schema || {}; // adjust as needed

  return (
    <aside className="w-[280px] bg-zinc-900 border-r border-zinc-800 h-full p-4 overflow-y-auto space-y-6">
      <div>
        <h3 className="text-sm text-zinc-500 mb-2 uppercase">Connections</h3>
        <ConnectionList
          connections={connections}
          selectedId={selectedConnection?.id}
          onSelect={(id) => console.log('Switch DB to', id)}
        />
      </div>

      <div>
        <h3 className="text-sm text-zinc-500 mb-2 uppercase">Active Database</h3>
        <DatabaseSelector
          connections={connections}
          selectedId={selectedConnection?.id}
          onSelect={(id) => console.log('Switched to DB ID:', id)}
        />
      </div>

      <div>
        <h3 className="text-sm text-zinc-500 mb-2 uppercase">Schema</h3>
        <SchemaViewer schema={schema} />
      </div>
    </aside>
  );
};

export default Sidebar;
