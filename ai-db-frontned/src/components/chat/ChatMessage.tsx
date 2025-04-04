// src/components/chat/ChatMessage.tsx
import React from 'react';
import { Message } from '../../types/chat.types';
import CodeBlock from './CodeBlock';
import QueryResult from './QueryResult';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { role, content, queryResult, error, contextSwitch } = message;
  
  // Determine message class based on role
  const messageClasses = 
    role === 'user' 
      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
  
  // Determine avatar based on role
  const avatar = role === 'user' 
    ? (
      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
        U
      </div>
    ) : (
      <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white">
        AI
      </div>
    );
  
  // Check if content contains a SQL query
  const hasSqlQuery = content.includes('```sql') || (queryResult?.query && queryResult.query.length > 0);
  
  // Extract SQL query if present in markdown
  const extractSqlQuery = (content: string): string | null => {
    const sqlRegex = /```sql\n([\s\S]*?)```/;
    const match = content.match(sqlRegex);
    return match ? match[1].trim() : null;
  };
  
  const sqlQuery = hasSqlQuery 
    ? queryResult?.query || extractSqlQuery(content) 
    : null;
  
  // Render message content
  const renderContent = () => {
    // Split content into parts based on code blocks
    const parts = content.split(/(```\w*\n[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (match) {
          const [, language, code] = match;
          return <CodeBlock key={index} language={language || 'plaintext'} code={code} />;
        }
      }
      
      // For non-code parts, render as text with line breaks
      return (
        <div key={index} className="prose dark:prose-invert max-w-none">
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    });
  };

  return (
    <div className={`py-6 px-4 border-b dark:border-gray-700 ${role === 'assistant' ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4">
          {avatar}
          
          <div className="flex-1 overflow-hidden">
            <div className={`mb-2 ${error ? 'text-red-600 dark:text-red-400' : ''}`}>
              {renderContent()}
            </div>
            
            {/* Display SQL query if available */}
            {sqlQuery && (
              <div className="mt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Generated SQL Query:</div>
                <CodeBlock language="sql" code={sqlQuery} />
              </div>
            )}
            
            {/* Display query results if available */}
            {queryResult?.results && (
              <div className="mt-4">
                <QueryResult 
                  results={queryResult.results} 
                  visualizationCode={queryResult.visualizationCode} 
                  executionTimeMs={queryResult.executionTimeMs} 
                  rowCount={queryResult.rowCount} 
                />
              </div>
            )}
            
            {/* Display error if present */}
            {error && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            {/* Display context switch notification */}
            {contextSwitch && (
              <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                Database context switched to database ID: {contextSwitch.dbId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;