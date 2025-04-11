// src/pages/DatabasePage.tsx
import React, { useEffect, useState } from 'react';
import ConnectionForm from '../components/database/ConnectionForm';
import ConnectionList from '../components/database/ConnectionList';
import EnhancedSchemaViewer from '../components/database/EnhancedSchemaViewer';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useDatabase } from '../hooks/useDatabase';
import { fetchUnifiedSchema, createConnection, setSelectedConnection, deleteConnection, checkConnectionHealth } from '../store/slices/databaseSlice';
import Button from '../components/common/Button';
import Modal, { ModalFooter } from '../components/common/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/common/Tabs';
import { Database, Plus, TrashIcon, Link2, XCircle, Settings, Check, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { addToast } from '../store/slices/uiSlice';
import { cn } from '../utils/format.utils';
import { formatConnectionString, getDatabaseTypeName } from '../utils/db-format.utils';
import Input from '../components/common/Input';
import { isValidHostname, isValidPort } from '../utils/validation.utils';
import { DatabaseType, DbConnectionRequest } from '../types/database.types';

const DatabasePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connections, selectedConnection, schema, healthStatus, loading } = useDatabase();
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState<string>('connections');
  
  // State for connection management
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<number | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<Record<number, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // New connection form - UPDATED to match backend expectations
  const [newConnection, setNewConnection] = useState<DbConnectionRequest>({
    dbType: 'postgres',
    host: '',
    port: 5432,
    username: '',
    password: '',
    dbName: '',
    connectionName: ''
  });
  
  // Form errors - UPDATED to match new field names
  const [formErrors, setFormErrors] = useState({
    connectionName: '',
    host: '',
    port: '',
    username: '',
    password: '',
    dbName: ''
  });
  
  // Fetch schema when selected connection changes
  useEffect(() => {
    if (selectedConnection && isAuthenticated) {
      dispatch(fetchUnifiedSchema(selectedConnection.id));
    }
  }, [selectedConnection?.id, dispatch, isAuthenticated]);

  const handleConnectionSubmit = (data: DbConnectionRequest) => {
    dispatch(createConnection(data));
    setShowNewConnectionModal(false);
  };

  const handleConnectionSelect = (id: number) => {
    const connection = connections.find(conn => conn.id === id);
    if (connection) {
      dispatch(setSelectedConnection(connection));
    }
  };
  
  // Toggle connection expanded
  const toggleConnectionExpanded = (connectionId: number) => {
    setExpandedConnections(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };
  
  // UPDATED: handleInputChange to use new field names
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'port') {
      const portValue = parseInt(value);
      setNewConnection(prev => ({ ...prev, [name]: isNaN(portValue) ? 0 : portValue }));
    } else {
      setNewConnection(prev => ({ ...prev, [name]: value }));
    }
    
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };
  
  // UPDATED: handleDbTypeChange to use correct field name
  const handleDbTypeChange = (type: DatabaseType) => {
    setNewConnection(prev => {
      let port = prev.port;
      
      switch(type) {
        case 'postgres': port = 5432; break;
        case 'mysql': port = 3306; break;
        case 'mssql': port = 1433; break;
        case 'mongodb': port = 27017; break;
        case 'couchdb': port = 5984; break;
        default: port = 5432;
      }
      
      return { ...prev, dbType: type, port };
    });
  };
  
  // UPDATED: validateForm to use new field names
  const validateForm = () => {
    const errors = {
      connectionName: '',
      host: '',
      port: '',
      username: '',
      password: '',
      dbName: ''
    };
    let isValid = true;
    
    if (!newConnection.dbName.trim()) {
      errors.dbName = 'Database name is required';
      isValid = false;
    }
    
    if (newConnection.dbType !== 'sqlite') {
      if (!newConnection.host.trim()) {
        errors.host = 'Host is required';
        isValid = false;
      } else if (!isValidHostname(newConnection.host)) {
        errors.host = 'Invalid hostname or IP address';
        isValid = false;
      }
      
      if (!newConnection.port) {
        errors.port = 'Port is required';
        isValid = false;
      } else if (!isValidPort(newConnection.port.toString())) {
        errors.port = 'Port must be between 0 and 65535';
        isValid = false;
      }
      
      if (!newConnection.username.trim()) {
        errors.username = 'Username is required';
        isValid = false;
      }
      
      if (!newConnection.password.trim()) {
        errors.password = 'Password is required';
        isValid = false;
      }
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // UPDATED: handleCreateConnection to directly use the properly formatted data
  const handleCreateConnection = () => {
    if (!validateForm()) {
      return;
    }
    
    // Pass the connection data directly to handleConnectionSubmit
    // Now the data is already in the correct format
    handleConnectionSubmit(newConnection);
    
    // Show success toast AFTER the API call is complete
    // This will be handled in the thunk when createConnection is successful
    
    // Close modal
    setShowNewConnectionModal(false);
    
    // Reset form with new field names
    setNewConnection({
      dbType: 'postgres',
      host: '',
      port: 5432,
      username: '',
      password: '',
      dbName: '',
      connectionName: ''
    });
  };
  
  const handleDeleteConnection = () => {
    if (connectionToDelete) {
      dispatch(deleteConnection(connectionToDelete));
      
      dispatch(addToast({
        type: 'success',
        message: 'Connection deleted successfully',
      }));
      
      setShowDeleteModal(false);
      setConnectionToDelete(null);
    }
  };
  
  const handleRefreshConnections = async () => {
    setIsRefreshing(true);
    try {
      for (const connection of connections) {
        await dispatch(checkConnectionHealth(connection.id));
      }
      
      dispatch(addToast({
        type: 'success',
        message: 'Connections refreshed successfully',
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to refresh connections',
      }));
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getConnectionStatus = (connectionId: number) => {
    const status = healthStatus[connectionId];
    
    if (!status) {
      return { isHealthy: false, latencyMs: 0, message: 'Unknown status' };
    }
    
    return status;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Database Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="connections">
            <Database className="w-4 h-4 mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="schema">
            <Settings className="w-4 h-4 mr-2" />
            Schema Viewer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Database Connections</h2>
              <p className="text-zinc-400 mt-1">
                Manage your database connections and monitor their status.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshConnections}
                isLoading={isRefreshing}
                leftIcon={<Settings className="w-4 h-4" />}
              >
                Refresh
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowNewConnectionModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Connection
              </Button>
            </div>
          </div>
          
          {/* Connection List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-8 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">No Connections Found</h3>
              <p className="text-zinc-400 mb-6">
                You haven't added any database connections yet.
              </p>
              <Button
                onClick={() => setShowNewConnectionModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Your First Connection
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map(connection => {
                const status = getConnectionStatus(connection.id);
                const isExpanded = !!expandedConnections[connection.id];
                
                return (
                  <div
                    key={connection.id}
                    className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              connection.is_connected ? "bg-green-900/30" : "bg-red-900/30"
                            )}
                          >
                            <Database className={cn(
                              "w-5 h-5",
                              connection.is_connected ? "text-green-400" : "text-red-400"
                            )} />
                          </div>
                          
                          <div>
                            <div className="text-zinc-200 font-medium flex items-center gap-2">
                              {connection.connection_name || connection.database_name}
                              <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">
                                {getDatabaseTypeName(connection.db_type)}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-1">
                              {connection.host ? `${connection.host}:${connection.port}` : 'Local Database'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-2 py-1 rounded-full text-xs flex items-center gap-1",
                            connection.is_connected 
                              ? "bg-green-900/30 text-green-400 border border-green-900/50" 
                              : "bg-red-900/30 text-red-400 border border-red-900/50"
                          )}>
                            {connection.is_connected ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Connected
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Disconnected
                              </>
                            )}
                          </div>
                          
                          {status.latencyMs > 0 && (
                            <div className="bg-zinc-700/50 px-2 py-1 rounded-full text-xs text-zinc-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {status.latencyMs}ms
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnectionSelect(connection.id)}
                          >
                            Select
                          </Button>
                          
                          <button
                            onClick={() => toggleConnectionExpanded(connection.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-full transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Expanded Connection Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-zinc-300">Connection Details</h4>
                              
                              <div className="bg-zinc-900 rounded p-3 text-xs font-mono">
                                {formatConnectionString(connection)}
                              </div>
                              
                              <div className="text-xs text-zinc-400">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-zinc-500">Database:</span> {connection.database_name}
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Type:</span> {getDatabaseTypeName(connection.db_type)}
                                  </div>
                                  {connection.host && (
                                    <>
                                      <div>
                                        <span className="text-zinc-500">Host:</span> {connection.host}
                                      </div>
                                      <div>
                                        <span className="text-zinc-500">Port:</span> {connection.port}
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <span className="text-zinc-500">Connected:</span> {connection.is_connected ? 'Yes' : 'No'}
                                  </div>
                                  <div>
                                    <span className="text-zinc-500">Created:</span> {new Date(connection.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-zinc-300">Status</h4>
                              
                              <div className={cn(
                                "bg-zinc-900 rounded p-3 flex items-start gap-3",
                                connection.is_connected ? "border-l-4 border-green-500" : "border-l-4 border-red-500"
                              )}>
                                {connection.is_connected ? (
                                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                                )}
                                
                                <div>
                                  <div className="text-sm font-medium text-zinc-200">
                                    {connection.is_connected ? 'Connection healthy' : 'Connection unavailable'}
                                  </div>
                                  <div className="text-xs text-zinc-400 mt-1">
                                    {status.message || (connection.is_connected ? 
                                      'The connection is working properly.' : 
                                      'Unable to connect to the database.')}
                                  </div>
                                  <div className="mt-2 text-xs">
                                    <button 
                                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                      onClick={() => dispatch(checkConnectionHealth(connection.id))}
                                    >
                                      <Settings className="w-3 h-3" />
                                      Test Connection
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleConnectionSelect(connection.id)}
                                  leftIcon={<Settings className="w-4 h-4" />}
                                >
                                  Use This Database
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Settings className="w-4 h-4" />}
                                >
                                  Edit
                                </Button>
                                
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setConnectionToDelete(connection.id);
                                    setShowDeleteModal(true);
                                  }}
                                  leftIcon={<TrashIcon className="w-4 h-4" />}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="schema">
          <div className="bg-zinc-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-zinc-200">
              Database Schema
              {selectedConnection && (
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  {selectedConnection.connection_name || selectedConnection.database_name}
                </span>
              )}
            </h2>
            
            {!selectedConnection ? (
              <div className="p-8 text-center">
                <Database className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No Database Selected</h3>
                <p className="text-zinc-400 mb-4">
                  Select a database connection to view its schema
                </p>
                
                {connections.length > 0 ? (
                  <div className="flex justify-center gap-2">
                    {connections.slice(0, 3).map(conn => (
                      <Button
                        key={conn.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectionSelect(conn.id)}
                      >
                        {conn.connection_name || conn.database_name}
                      </Button>
                    ))}
                    {connections.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab('connections')}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowNewConnectionModal(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Connection
                  </Button>
                )}
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <EnhancedSchemaViewer schema={schema} />
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* New Connection Modal */}
      <Modal
        isOpen={showNewConnectionModal}
        onClose={() => setShowNewConnectionModal(false)}
        title="Add Database Connection"
        description="Connect to a new database to query it with natural language."
      >
        <div className="space-y-4">
          {/* Updated form fields to use new field names */}
          <Input
            label="Connection Name (Optional)"
            name="connectionName"
            value={newConnection.connectionName}
            onChange={handleInputChange}
            placeholder="My Database"
            error={formErrors.connectionName}
            hint="Give your connection a friendly name to help identify it"
          />
          
          {/* Database Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Database Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['postgres', 'mysql', 'mssql', 'sqlite', 'mongodb', 'firebase', 'couchdb', 'dynamodb'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleDbTypeChange(type as DatabaseType)}
                  className={cn(
                    "p-2 rounded-md border text-center text-sm",
                    newConnection.dbType === type
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          {/* Connection Info */}
          {newConnection.dbType !== 'sqlite' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Host"
                  name="host"
                  value={newConnection.host}
                  onChange={handleInputChange}
                  placeholder="localhost or 127.0.0.1"
                  error={formErrors.host}
                />
                
                <Input
                  label="Port"
                  name="port"
                  type="number"
                  value={newConnection.port.toString()}
                  onChange={handleInputChange}
                  placeholder="5432"
                  error={formErrors.port}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Username"
                  name="username"
                  value={newConnection.username}
                  onChange={handleInputChange}
                  placeholder="postgres"
                  error={formErrors.username}
                />
                
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={newConnection.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  error={formErrors.password}
                />
              </div>
            </>
          )}
          
          {/* Database Name */}
          <Input
            label="Database Name"
            name="dbName"
            value={newConnection.dbName}
            onChange={handleInputChange}
            placeholder="my_database"
            error={formErrors.dbName}
          />
        </div>
        
        <ModalFooter
          onCancel={() => setShowNewConnectionModal(false)}
          onConfirm={handleCreateConnection}
          confirmText="Add Connection"
        />
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Connection"
        description="Are you sure you want to delete this connection? This action cannot be undone."
      >
        <ModalFooter
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConnection}
          confirmText="Delete"
          danger
        />
      </Modal>
    </div>
  );
};

export default DatabasePage;