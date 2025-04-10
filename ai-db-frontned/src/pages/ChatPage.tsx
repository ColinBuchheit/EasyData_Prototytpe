import React, { useEffect } from 'react';
// Removed MainLayout import
import ChatContainer from '../components/chat/ChatContainer';
import QueryHistoryViewer from '../components/query/QueryHistoryViewer';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchQueryHistory } from '../store/slices/querySlice';

const ChatPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { history, loading } = useAppSelector(state => state.query);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  
  // Fetch query history when the page loads
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchQueryHistory({ limit: 10 }));
    }
  }, [dispatch, isAuthenticated]);

  const handleSelectQuery = (query: string) => {
    // This could be implemented to populate the chat input with the selected query
    console.log('Selected query:', query);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main chat area - takes up more space */}
        <div className="lg:col-span-2">
          <ChatContainer />
        </div>
        
        {/* History sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <QueryHistoryViewer 
                history={history} 
                onSelectQuery={handleSelectQuery} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;