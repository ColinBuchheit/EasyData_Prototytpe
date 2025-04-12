// src/components/dashboard/ConnectionStatusWidget.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Link2, AlertTriangle, CheckCircle2, Server, Plus } from 'lucide-react';
import { DbConnection } from '../../types/database.types';
import Card from '../common/Card';
import Button from '../common/Button';

interface ConnectionStatusWidgetProps {
  connections: DbConnection[];
  loading: boolean;
}

const ConnectionStatusWidget: React.FC<ConnectionStatusWidgetProps> = ({ connections, loading }) => {
  // Calculate summary stats
  const connectedCount = connections.filter(conn => conn.is_connected).length;
  const disconnectedCount = connections.length - connectedCount;
  
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Connection Status</h3>
          </div>
          
          {connections.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => window.location.href = '/databases'}
            >
              Add
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="h-[140px] flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-3 bg-zinc-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-zinc-700 rounded"></div>
                  <div className="h-3 bg-zinc-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : connections.length === 0 ? (
          <div className="py-6 text-center">
            <Server className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-400 mb-3">No database connections</p>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = '/databases'}
            >
              Add Connection
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div 
                className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 flex flex-col items-center justify-center"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  connectedCount > 0 ? 'bg-green-900/30' : 'bg-zinc-700/30'
                }`}>
                  <CheckCircle2 className={`w-5 h-5 ${
                    connectedCount > 0 ? 'text-green-400' : 'text-zinc-500'
                  }`} />
                </div>
                <div className="text-2xl font-bold text-zinc-100">{connectedCount}</div>
                <div className="text-xs text-zinc-400 mt-1">Connected</div>
              </motion.div>
              
              <motion.div 
                className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 flex flex-col items-center justify-center"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  disconnectedCount > 0 ? 'bg-amber-900/30' : 'bg-zinc-700/30'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    disconnectedCount > 0 ? 'text-amber-400' : 'text-zinc-500'
                  }`} />
                </div>
                <div className="text-2xl font-bold text-zinc-100">{disconnectedCount}</div>
                <div className="text-xs text-zinc-400 mt-1">Disconnected</div>
              </motion.div>
            </div>
            
            {/* Connection List */}
            <div className="bg-zinc-800 rounded-lg border border-zinc-700">
              <div className="text-xs uppercase text-zinc-500 p-3 border-b border-zinc-700">
                Database Connections
              </div>
              
              <div className="divide-y divide-zinc-700">
                {connections.map((conn) => (
                  <div key={conn.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          conn.is_connected ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                        aria-hidden="true"
                      ></div>
                      <span className="text-zinc-300 truncate max-w-[180px]" title={conn.connection_name || conn.database_name}>
                        {conn.connection_name || conn.database_name}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">{conn.db_type}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.location.href = '/databases'}
            >
              Manage Connections
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ConnectionStatusWidget;