import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Table } from 'lucide-react';

interface SchemaViewerProps {
  schema: Record<string, string[]>; // table: columns[]
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema }) => {
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const toggleTable = (table: string) => {
    setOpenTables((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  return (
    <div className="space-y-2 text-sm text-zinc-200">
      {Object.entries(schema).map(([table, columns]) => (
        <div key={table} className="border border-zinc-800 rounded-md">
          <button
            onClick={() => toggleTable(table)}
            className="flex items-center justify-between w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-left"
          >
            <span className="flex items-center gap-2">
              <Table className="w-4 h-4" />
              {table}
            </span>
            {openTables[table] ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {openTables[table] && (
            <ul className="px-4 py-2 bg-zinc-950 space-y-1">
              {columns.map((col) => (
                <li
                  key={col}
                  className="pl-5 text-zinc-400 relative before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-1 before:bg-zinc-500 before:rounded-full"
                >
                  {col}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default SchemaViewer;
