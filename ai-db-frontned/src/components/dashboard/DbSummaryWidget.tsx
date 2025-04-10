// src/components/dashboard/DbSummaryWidget.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Server, ExternalLink, Info } from 'lucide-react';
import { DbConnection } from '../../types/database.types';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatConnectionString } from '../../utils/db-format.utils';

interface DbSummaryWidgetProps {
  connections: DbConnection[];
}

const DbSummaryWidget: React.FC<DbSummaryWidgetProps> = ({ connections }) => {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(
    connections.length > 0 ? connections[0].id : null
  );

  // Helper to get connection type icon
  const getDbTypeIcon = (type: string) => {
    switch (type) {
      case 'postgres':
        return <span className="text-blue-400">PostgreSQL</span>;
      case 'mysql':
        return <span className="text-orange-400">MySQL</span>;
      case 'mongodb':
        return <span className="text-green-400">MongoDB</span>;
      case 'mssql':
        return <span className="text-blue-500">MS SQL</span>;
      default:
        return <span>{type}</span>;
    }
  };

  // Get selected connection details
  const selectedDb = connections.find(conn => conn.id === selectedConnection);

  return (
    <Card className="overflow-visible">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Database Summary</h3>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            leftIcon={<ExternalLink className="w-4 h-4" />}
            onClick={() => window.location.href = '/databases'}
          >
            Manage
          </Button>
        </div>
        
        {connections.length === 0 ? (
          <div className="py-6 text-center">
            <Server className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-400 mb-3">No database connections found</p>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => window.location.href = '/databases'}
            >
              Add Connection
            </Button>
          </div>
        ) : (
          <div>
            {/* Connection List */}
            <div className="flex overflow-x-auto gap-2 pb-2 mb-4 -mx-1 px-1">
              {connections.map(conn => (
                <motion.div
                  key={conn.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={() => setSelectedConnection(conn.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                      selectedConnection === conn.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                    aria-label={`Select ${conn.connection_name || conn.database_name} database`}
                  >
                    <Server className="w-4 h-4" />
                    <span>{conn.connection_name || conn.database_name}</span>
                  </button>
                </motion.div>
              ))}
            </div>
            
            {/* Selected Connection Details */}
            <AnimatePresence mode="wait">
              {selectedDb && (
                <motion.div
                  key={selectedDb.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-zinc-200">
                      {selectedDb.connection_name || selectedDb.database_name}
                    </h4>
                    <div 
                      className={`px-2 py-1 text-xs rounded-full ${
                        selectedDb.is_connected
                          ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                          : 'bg-red-900/40 text-red-400 border border-red-700/50'
                      }`}
                    >
                      {selectedDb.is_connected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Type:</span>
                      <span className="font-mono">{getDbTypeIcon(selectedDb.db_type)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Host:</span>
                      <span className="font-mono text-zinc-300">{selectedDb.host}:{selectedDb.port}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Database:</span>
                      <span className="font-mono text-zinc-300">{selectedDb.database_name}</span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <div className="flex items-center gap-1 mb-2">
                        <Info className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-400 text-xs">Connection String</span>
                      </div>
                      <div className="bg-zinc-900 rounded-md p-2 font-mono text-xs text-zinc-400 overflow-x-auto whitespace-nowrap">
                        {formatConnectionString(selectedDb)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DbSummaryWidget;