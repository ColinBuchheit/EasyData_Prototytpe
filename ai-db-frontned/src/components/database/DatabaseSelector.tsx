// src/components/database/DatabaseSelector.tsx
import React from 'react';
import Dropdown from '../common/Dropdown';
import { DbConnection } from '../../types/database.types';
import { Database, CheckCircle, XCircle } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useRedux';
import { 
  activateConnection, 
  checkConnectionHealth,
  setSelectedConnection 
} from '../../store/slices/databaseSlice';
import { addToast } from '../../store/slices/uiSlice';

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
  const dispatch = useAppDispatch();
  const selected = connections.find((c) => c.id === selectedId);

  const handleSelectConnection = async (connection: DbConnection) => {
    try {
      // First check the connection health
      await dispatch(checkConnectionHealth(connection.id)).unwrap();
      
      // Then try to activate the connection
      await dispatch(activateConnection(connection.id)).unwrap();
      
      // Finally, set it as the selected connection
      dispatch(setSelectedConnection(connection));
      
      // Call the original onSelect function
      onSelect(connection.id);
      
      // Show success toast
      dispatch(addToast({
        type: 'success',
        message: `Connected to ${connection.connection_name || connection.database_name}`
      }));
    } catch (error: any) {
      // Show error toast
      dispatch(addToast({
        type: 'error',
        message: `Failed to connect to database: ${error.message || 'Connection failed'}`
      }));
    }
  };

  return (
    <Dropdown
      triggerLabel={selected?.connection_name || selected?.database_name || 'Select Database'}
      value={selected?.id.toString()}
      onChange={(value: string) => {
        const connection = connections.find(c => c.id.toString() === value);
        if (connection) {
          handleSelectConnection(connection);
        }
      }}
      items={connections.map((conn) => ({
        value: conn.id.toString(),
        label: conn.connection_name || conn.database_name,
        icon: <Database className="w-4 h-4" />,
        description: conn.is_connected ? 'Connected' : 'Disconnected'
      }))}
    />
  );
};

export default DatabaseSelector;
