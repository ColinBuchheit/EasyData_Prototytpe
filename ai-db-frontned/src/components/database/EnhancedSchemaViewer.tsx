// src/components/database/EnhancedSchemaViewer.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Table, Key, Link, Info, List, Calendar } from 'lucide-react';
import { DbSchema, DatabaseTable, DbRelationship } from '../../types/database.types';

interface EnhancedSchemaViewerProps {
  schema: DbSchema | null;
}

const EnhancedSchemaViewer: React.FC<EnhancedSchemaViewerProps> = ({ schema }) => {
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});
  const [openRelationships, setOpenRelationships] = useState(false);
  const [openMetadata, setOpenMetadata] = useState(false);

  const toggleTable = (table: string) => {
    setOpenTables((prev) => ({ ...prev, [table]: !prev[table] }));
  };

  if (!schema) {
    return (
      <div className="p-4 text-zinc-400 bg-zinc-900 rounded-md text-center">
        No schema data available. Select a database connection first.
      </div>
    );
  }

  const getFieldIcon = (field: { type: string, isPrimary?: boolean, isForeign?: boolean }) => {
    if (field.isPrimary) return <Key className="w-3 h-3 text-yellow-500" />;
    if (field.isForeign) return <Link className="w-3 h-3 text-blue-500" />;
    return null;
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'one-to-one':
        return '1:1';
      case 'one-to-many':
        return '1:N';
      case 'many-to-many':
        return 'N:M';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4 text-sm bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Schema Header */}
      <div className="bg-zinc-900 p-4 border-b border-zinc-800">
        <h3 className="text-lg font-medium text-zinc-100">{schema.name}</h3>
        <div className="text-zinc-400 text-xs mt-1">Type: {schema.type}</div>
      </div>

      {/* Tables Section */}
      <div className="p-4 space-y-2">
        <h4 className="text-zinc-300 font-medium mb-3 flex items-center gap-2">
          <List className="w-4 h-4" />
          Tables ({schema.tables.length})
        </h4>

        {schema.tables.map((table: DatabaseTable) => (
          <div key={table.name} className="border border-zinc-800 rounded-md mb-2">
            <button
              onClick={() => toggleTable(table.name)}
              className="flex items-center justify-between w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-left"
            >
              <span className="flex items-center gap-2">
                <Table className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-200">{table.name}</span>
                {table.estimatedRows && (
                  <span className="text-xs text-zinc-500">
                    ~{table.estimatedRows.toLocaleString()} rows
                  </span>
                )}
              </span>
              {openTables[table.name] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {openTables[table.name] && (
              <div className="border-t border-zinc-800">
                {table.description && (
                  <div className="px-4 py-2 text-xs text-zinc-400 bg-zinc-900 border-b border-zinc-800">
                    {table.description}
                  </div>
                )}
                <ul className="bg-zinc-950 divide-y divide-zinc-900">
                  {table.columns.map((column) => (
                    <li
                      key={column.name}
                      className="px-4 py-2 flex items-center justify-between hover:bg-zinc-900"
                    >
                      <div className="flex items-center gap-2">
                        {getFieldIcon(column)}
                        <span className={`${column.isPrimary ? 'font-medium text-zinc-200' : 'text-zinc-400'}`}>
                          {column.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {column.type}
                          {column.nullable ? '' : ' NOT NULL'}
                        </span>
                      </div>
                      {column.description && (
                        <span className="text-xs text-zinc-500 max-w-xs truncate" title={column.description}>
                          {column.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Relationships Section */}
      {schema.relationships && schema.relationships.length > 0 && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setOpenRelationships(!openRelationships)}
            className="flex items-center justify-between w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-left rounded-md mb-2"
          >
            <span className="flex items-center gap-2">
              <Link className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200">Relationships ({schema.relationships.length})</span>
            </span>
            {openRelationships ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {openRelationships && (
            <div className="space-y-2 mt-2">
              {schema.relationships.map((rel: DbRelationship, index) => (
                <div key={index} className="border border-zinc-800 rounded-md p-3 bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-300">
                        {getRelationshipIcon(rel.type)}
                      </span>
                      <span className="text-zinc-400">{rel.name || 'Relationship'}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{rel.type}</span>
                  </div>
                  <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                    <div className="bg-zinc-800 p-2 rounded">
                      <div className="text-zinc-500">Source</div>
                      <div className="text-zinc-300">{rel.source.table}.{rel.source.column}</div>
                    </div>
                    <div className="bg-zinc-800 p-2 rounded">
                      <div className="text-zinc-500">Target</div>
                      <div className="text-zinc-300">{rel.target.table}.{rel.target.column}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata Section */}
      {schema.metadata && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setOpenMetadata(!openMetadata)}
            className="flex items-center justify-between w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-left rounded-md mb-2"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200">Metadata</span>
            </span>
            {openMetadata ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {openMetadata && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {schema.metadata.domainType && (
                <div className="border border-zinc-800 rounded-md p-3 bg-zinc-900">
                  <div className="text-xs text-zinc-500 mb-1">Domain Type</div>
                  <div className="text-zinc-300">{schema.metadata.domainType}</div>
                </div>
              )}
              {schema.metadata.contentDescription && (
                <div className="border border-zinc-800 rounded-md p-3 bg-zinc-900">
                  <div className="text-xs text-zinc-500 mb-1">Description</div>
                  <div className="text-zinc-300">{schema.metadata.contentDescription}</div>
                </div>
              )}
              {schema.metadata.dataCategory && schema.metadata.dataCategory.length > 0 && (
                <div className="border border-zinc-800 rounded-md p-3 bg-zinc-900">
                  <div className="text-xs text-zinc-500 mb-1">Data Categories</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {schema.metadata.dataCategory.map((cat, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {schema.metadata.lastAnalyzed && (
                <div className="border border-zinc-800 rounded-md p-3 bg-zinc-900">
                  <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last Analyzed
                  </div>
                  <div className="text-zinc-300">
                    {new Date(schema.metadata.lastAnalyzed).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSchemaViewer;
