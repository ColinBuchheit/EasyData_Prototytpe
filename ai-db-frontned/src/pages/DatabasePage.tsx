import React, { useEffect } from 'react';
// Removed MainLayout import
import ConnectionForm from '../components/database/ConnectionForm';
import ConnectionList from '../components/database/ConnectionList';
import EnhancedSchemaViewer from '../components/database/EnhancedSchemaViewer';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useDatabase } from '../hooks/useDatabase';
import { fetchUnifiedSchema, createConnection, setSelectedConnection } from '../store/slices/databaseSlice';

const DatabasePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connections, selectedConnection, schema, loading } = useDatabase();
  const { isAuthenticated } = useAppSelector(state => state.auth);

  // Fetch schema when selected connection changes
  useEffect(() => {
    if (selectedConnection && isAuthenticated) {
      dispatch(fetchUnifiedSchema(selectedConnection.id));
    }
  }, [selectedConnection?.id, dispatch, isAuthenticated]);

  const handleConnectionSubmit = (data: any) => {
    dispatch(createConnection(data));
  };

  const handleConnectionSelect = (id: number) => {
    const connection = connections.find(conn => conn.id === id);
    if (connection) {
      dispatch(setSelectedConnection(connection));
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Database Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Connection Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-zinc-200">Add Connection</h2>
            <ConnectionForm onSubmit={handleConnectionSubmit} />
          </div>
          
          <div className="bg-zinc-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-zinc-200">Your Connections</h2>
            <ConnectionList
              connections={connections}
              selectedId={selectedConnection?.id}
              onSelect={handleConnectionSelect}
            />
          </div>
        </div>
        
        {/* Right column - Schema Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-zinc-200">
              Database Schema
              {selectedConnection && (
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  {selectedConnection.connection_name || selectedConnection.database_name}
                </span>
              )}
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <EnhancedSchemaViewer schema={schema} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabasePage;