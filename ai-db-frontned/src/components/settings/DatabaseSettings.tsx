// src/components/settings/DatabaseSettings.tsx
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { 
  fetchUserConnections, 
  checkConnectionHealth,
  setSelectedConnection
} from '../../store/slices/databaseSlice';
import { addToast } from '../../store/slices/uiSlice';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { DatabaseType, DbConnection } from '../../types/database.types';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Clock, 
  ChevronDown, 
  Plus,
  Trash2,
  Edit,
  RotateCw,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../utils/format.utils';
import Modal, { ModalFooter } from '../common/Modal';
import Input from '../common/Input';
import { formatConnectionString, getDatabaseTypeName } from '../../utils/db-format.utils';
import { isValidHostname, isValidPort } from '../../utils/validation.utils';

const DatabaseSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connections, healthStatus, loading, error } = useAppSelector(state => state.database);
  
  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<number | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<Record<number, boolean>>({});
  
  // Edit connection form
  const [editingConnection, setEditingConnection] = useState<DbConnection | null>(null);
  
  // New connection form
  const [newConnection, setNewConnection] = useState({
    connection_name: '',
    db_type: 'postgres' as DatabaseType,
    host: '',
    port: 5432,
    username: '',
    password: '',
    database_name: ''
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState({
    connection_name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    database_name: ''
  });
  
  // Database type options
  const dbTypes: { value: DatabaseType; label: string }[] = [
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'mssql', label: 'Microsoft SQL Server' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'firebase', label: 'Firebase' },
    { value: 'couchdb', label: 'CouchDB' },
    { value: 'dynamodb', label: 'DynamoDB' },
  ];
  
  // Fetch connections on mount
  useEffect(() => {
    dispatch(fetchUserConnections());
  }, [dispatch]);
  
  // Handle refresh connections
  const handleRefreshConnections = async () => {
    setIsRefreshing(true);
    try {
      // Fetch connections
      await dispatch(fetchUserConnections()).unwrap();
      
      // Check health of all connections
      for (const connection of connections) {
        await dispatch(checkConnectionHealth(connection.id)).unwrap();
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
  
  // Handle toggle connection expanded
  const toggleConnectionExpanded = (connectionId: number) => {
    setExpandedConnections(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };
  
  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle port as a number
    if (name === 'port') {
      const portValue = parseInt(value);
      setNewConnection(prev => ({ ...prev, [name]: isNaN(portValue) ? 0 : portValue }));
    } else {
      setNewConnection(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for the field being edited
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };
  
  // Handle database type change
  const handleDbTypeChange = (type: DatabaseType) => {
    setNewConnection(prev => {
      // Set default port based on database type
      let port = prev.port;
      
      switch(type) {
        case 'postgres':
          port = 5432;
          break;
        case 'mysql':
          port = 3306;
          break;
        case 'mssql':
          port = 1433;
          break;
        case 'mongodb':
          port = 27017;
          break;
        case 'couchdb':
          port = 5984;
          break;
        default:
          port = 5432;
      }
      
      return { ...prev, db_type: type, port };
    });
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {
      connection_name: '',
      host: '',
      port: '',
      username: '',
      password: '',
      database_name: ''
    };
    let isValid = true;
    
    // Database name is always required
    if (!newConnection.database_name.trim()) {
      errors.database_name = 'Database name is required';
      isValid = false;
    }
    
    // For non-SQLite databases, validate host and port
    if (newConnection.db_type !== 'sqlite') {
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
  
  // Handle create connection
  const handleCreateConnection = () => {
    if (!validateForm()) {
      return;
    }
    
    // Create connection
    // This would be replaced with an actual API call
    console.log('Creating connection:', newConnection);
    
    // Show success message
    dispatch(addToast({
      type: 'success',
      message: 'Connection created successfully',
    }));
    
    // Close modal and reset form
    setShowNewConnectionModal(false);
    setNewConnection({
      connection_name: '',
      db_type: 'postgres',
      host: '',
      port: 5432,
      username: '',
      password: '',
      database_name: ''
    });
  };
  
  // Handle delete connection
  const handleDeleteConnection = () => {
    if (connectionToDelete) {
      // Delete connection
      // This would be replaced with an actual API call
      console.log('Deleting connection:', connectionToDelete);
      
      // Show success message
      dispatch(addToast({
        type: 'success',
        message: 'Connection deleted successfully',
      }));
      
      // Close modal
      setShowDeleteModal(false);
      setConnectionToDelete(null);
    }
  };
  
  // Handle edit connection
  const handleEditConnection = (connection: DbConnection) => {
    setEditingConnection(connection);
  };
  
  // Handle select connection
  const handleSelectConnection = (connection: DbConnection) => {
    dispatch(setSelectedConnection(connection));
    
    dispatch(addToast({
      type: 'success',
      message: `Selected ${connection.connection_name || connection.database_name} as active database`,
    }));
  };
  
  // Get connection status
  const getConnectionStatus = (connectionId: number) => {
    const status = healthStatus[connectionId];
    
    if (!status) {
      return { isHealthy: false, latencyMs: 0, message: 'Unknown status' };
    }
    
    return status;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Database Connections</h2>
          <p className="text-zinc-400 mb-6">
            Manage your database connections and monitor their status.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshConnections}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
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
          <Spinner size="lg" variant="primary" />
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
                      
                      <button
                        onClick={() => toggleConnectionExpanded(connection.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-full transition-colors"
                      >
                        <ChevronDown className={cn(
                          "w-5 h-5 transition-transform",
                          isExpanded ? "rotate-180" : "rotate-0"
                        )} />
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
                              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
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
                                  <RotateCw className="w-3 h-3" />
                                  Test Connection
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSelectConnection(connection)}
                              leftIcon={<ArrowRight className="w-4 h-4" />}
                            >
                              Use This Database
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditConnection(connection)}
                              leftIcon={<Edit className="w-4 h-4" />}
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
                              leftIcon={<Trash2 className="w-4 h-4" />}
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
      
      {/* New Connection Modal */}
      <Modal
        isOpen={showNewConnectionModal}
        onClose={() => setShowNewConnectionModal(false)}
        title="Add Database Connection"
        description="Connect to a new database to query it with natural language."
      >
        <div className="space-y-4">
          {/* Connection Name */}
          <Input
            label="Connection Name (Optional)"
            name="connection_name"
            value={newConnection.connection_name}
            onChange={handleInputChange}
            placeholder="My Database"
            error={formErrors.connection_name}
            hint="Give your connection a friendly name to help identify it"
          />
          
          {/* Database Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Database Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {dbTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleDbTypeChange(type.value)}
                  className={cn(
                    "p-2 rounded-md border text-center text-sm",
                    newConnection.db_type === type.value
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Connection Info */}
          {newConnection.db_type !== 'sqlite' && (
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
            name="database_name"
            value={newConnection.database_name}
            onChange={handleInputChange}
            placeholder="my_database"
            error={formErrors.database_name}
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

export default DatabaseSettings;
