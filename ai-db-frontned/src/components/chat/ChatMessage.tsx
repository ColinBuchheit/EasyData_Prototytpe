import React from 'react';
import { Message } from '../../types/chat.types';
import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';
import { cn } from '../../utils/format.utils';
import QueryResult from './QueryResult';
import StatusIndicator from './StatusIndicator';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'max-w-3xl px-4 py-3 rounded-lg shadow transition-all whitespace-pre-wrap',
        isUser
          ? 'bg-blue-600 text-white self-end ml-auto'
          : isAssistant
          ? 'bg-zinc-800 text-zinc-100 self-start mr-auto'
          : 'bg-zinc-900 text-zinc-400 self-center mx-auto text-sm'
      )}
    >
      {/* Streaming or system feedback */}
      {isSystem ? (
        <StatusIndicator status="stream" message={message.content} />
      ) : (
        <ReactMarkdown
          className="prose prose-invert max-w-none"
          components={{
            code({ node, inline, className, children, ...props }) {
              const language = className?.replace('language-', '') || 'sql';

              return !inline ? (
                <CodeBlock language={language} value={String(children).trim()} />
              ) : (
                <code
                  className={cn('px-1 py-0.5 rounded bg-zinc-700 text-sm', className)}
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}

      {message.queryResult && (
        <div className="mt-4">
          <QueryResult result={message.queryResult} />
        </div>
      )}

      {message.error && (
        <div className="mt-4 text-sm text-red-400">
          <StatusIndicator status="error" message={message.error} />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
