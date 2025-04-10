// src/components/chat/ChatMessage.tsx
import React, { useState } from 'react';
import { Message } from '../../types/chat.types';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Copy, Check, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { cn } from '../../utils/format.utils';
import QueryResult from './QueryResult';
import { addToast } from '../../store/slices/uiSlice';
import { useAppDispatch } from '../../hooks/useRedux';
import { motion } from 'framer-motion';

interface ModernChatMessageProps {
  message: Message;
  isFirst: boolean;
  isLast: boolean;
}

const ChatMessage: React.FC<ModernChatMessageProps> = ({ message, isFirst, isLast }) => {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return timestamp;
    }
  };
  
  // Handle copy message
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(
      () => {
        setCopied(true);
        
        // Reset copied status after 2 seconds
        setTimeout(() => setCopied(false), 2000);
        
        // Show toast
        dispatch(addToast({
          type: 'success',
          message: 'Message copied to clipboard'
        }));
      },
      () => {
        dispatch(addToast({
          type: 'error',
          message: 'Failed to copy message'
        }));
      }
    );
  };
  
  // Determine message type for styling
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  
  // If message is collapsed, don't render
  if (!expanded) {
    return (
      <div className="border-t border-zinc-800 py-2">
        <button 
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm px-4 py-2"
          onClick={() => setExpanded(true)}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span>
            {isUser ? 'You: ' : 'AI: '}
            {message.content.length > 50 
              ? message.content.substring(0, 50) + '...' 
              : message.content}
          </span>
          <ChevronDown className="w-4 h-4 ml-auto" />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-8 group",
        isSystem && "opacity-75"
      )}
    >
      {/* Message header with avatar and role */}
      <div className="flex items-center mb-2 px-4">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-blue-600" : "bg-zinc-700"
        )}>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="ml-2 flex items-center">
          <span className="font-medium text-zinc-200">
            {isUser ? 'You' : 'Maiquery AI'}
          </span>
          <span className="ml-2 text-xs text-zinc-500">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        {/* Action buttons - only show on hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            aria-label="Collapse message"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Message content */}
      <div className={cn(
        "px-14 prose prose-invert prose-zinc max-w-none",
        "prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-lg",
        "prose-code:bg-zinc-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none"
      )}>
        <ReactMarkdown
          components={{
            // Custom rendering for code blocks
            code({ node, className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              const isInline = !className;
              
              return !isInline ? (
                <SyntaxHighlighter
                  style={oneDark}
                  language={language}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
        
        {/* Query result if available */}
        {message.queryResult && (
          <div className="mt-4 mb-8 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="bg-zinc-900 px-4 py-2 flex items-center">
              <Database className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-sm font-medium text-zinc-300">Query Results</span>
            </div>
            <div className="p-4 bg-zinc-800/50">
              <QueryResult result={message.queryResult} />
            </div>
          </div>
        )}
        
        {/* Error message if available */}
        {message.error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-sm">
            {message.error}
          </div>
        )}
      </div>
      
      {/* Add divider after message */}
      {!isLast && (
        <div className="mt-8 border-b border-zinc-800 opacity-75"></div>
      )}
    </motion.div>
  );
};

export default ChatMessage;
