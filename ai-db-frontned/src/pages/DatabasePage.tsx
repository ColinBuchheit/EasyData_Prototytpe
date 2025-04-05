import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConnectionForm from '../components/database/ConnectionForm';
import ConnectionList from '../components/database/ConnectionList';
import { useDatabase } from '../hooks/useDatabase';

const DatabasePage: React.FC = () => {
  const { connections, selectedConnection } = useDatabase();

  return (
    <MainLayout>
      <div className="space-y-8 max-w-3xl">
        <ConnectionForm onSubmit={(data) => console.log('Submitted:', data)} />
        <ConnectionList
          connections={connections}
          selectedId={selectedConnection?.id}
          onSelect={(id) => console.log('Switched to DB:', id)}
        />
      </div>
    </MainLayout>
  );
};

export default DatabasePage;
