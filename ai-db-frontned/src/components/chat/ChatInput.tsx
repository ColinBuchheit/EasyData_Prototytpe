// src/components/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { addMessage } from '../../store/slices/chatSlice';
import { executeNaturalLanguageQuery } from '../../store/slices/querySlice';
import { wsSendQuery } from '../../store/middleware/websocketMiddleware';
import Button from '../common/Button';

const ChatInput: React.FC = () => {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { status } = useAppSelector(state => state.query);
  const { selectedConnection } = useAppSelector(state => state.database);
  const { currentSessionId } = useAppSelector(state => state.chat);
  const isProcessing = status === 'processing';
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || isProcessing) {
      return;
    }
    
    const currentQuery = query.trim();
    setQuery('');
    
    // Get the current DB connection ID if available
    const dbId = selectedConnection?.id;
    
    // Create chat session if needed
    if (!currentSessionId) {
      // TODO: Create a new chat session
    }
    
    // Check if we should use WebSockets
    const useWebsocket = true; // TODO: Make this configurable
    
    if (useWebsocket) {
      // WebSocket method - send query through WebSocket for real-time updates
      dispatch(wsSendQuery(currentQuery, dbId));
    } else {
      // REST API method - add message immediately and execute query
      dispatch(addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: currentQuery,
        timestamp: new Date().toISOString()
      }));
      
      try {
        const result = await dispatch(executeNaturalLanguageQuery({
          task: currentQuery,
          dbId,
          visualize: true
        })).unwrap();
        
        dispatch(addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: result.explanation || 'Query executed successfully',
          timestamp: new Date().toISOString(),
          queryResult: result
        }));
      } catch (error: any) {
        dispatch(addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${error}`,
          timestamp: new Date().toISOString(),
          error: error
        }));
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative rounded-lg border dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 bg-white dark:bg-gray-800 shadow-sm">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedConnection
                ? `Ask a question about the ${selectedConnection.database_name} database...`
                : "First connect to a database or ask a general question..."
            }
            disabled={isProcessing}
            className="w-full resize-none py-3 px-4 outline-none bg-transparent min-h-[56px] max-h-[200px] text-gray-900 dark:text-gray-100"
            rows={1}
          />
          
          <div className="absolute right-2 bottom-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!query.trim() || isProcessing}
              className="p-2 rounded-full"
            >
              {isProcessing ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {selectedConnection ? (
            <>
              Connected to <span className="font-medium">{selectedConnection.connection_name || selectedConnection.database_name}</span> ({selectedConnection.db_type})
            </>
          ) : (
            <>
              No database selected. <a href="#" className="text-blue-500 hover:underline">Connect to a database</a> to get started.
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInput;