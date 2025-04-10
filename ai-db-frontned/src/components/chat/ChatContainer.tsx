// src/components/chat/ChatContainer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/useRedux';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import useChat from '../../hooks/useChat';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkles, ArrowDown, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/format.utils';

const { currentSessionId } = useAppSelector(state => state.chat);
const { startNewSession } = useChat();

// Loading spinner animation
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="relative h-8 w-8">
      <div className="absolute inset-0 rounded-full border-2 border-zinc-700"></div>
      <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin"></div>
    </div>
  </div>
);

// Empty chat state
const EmptyChatState: React.FC<{ onSendExample: (text: string) => void }> = ({ onSendExample }) => {
  const examples = [
    "Show me all users who joined in the last month",
    "What products have the highest profit margin?",
    "Calculate total sales by region for Q1",
    "Find customers who haven't placed an order in 6 months"
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 max-w-3xl mx-auto">
      <div className="w-20 h-20 rounded-full bg-blue-600/10 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">Start your database conversation</h2>
      <p className="text-zinc-400 mb-8 max-w-lg">
        Ask questions about your database in natural language. Our AI will generate SQL, run the query, and explain the results.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {examples.map((example, index) => (
          <button
            key={index}
            className="text-left p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
            onClick={() => onSendExample(example)}
          >
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400">Example</span>
            </div>
            <span className="text-sm">{example}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatContainer: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, status } = useAppSelector(state => state.chat);
  const { selectedConnection } = useAppSelector(state => state.database);
  const { sendMessage } = useChat();
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Ensure we have a session when component mounts
    if (!currentSessionId && messages.length === 0) {
      startNewSession("New Chat");
    }
  }, [currentSessionId, messages.length, startNewSession]);
  
  // Show scroll button when user scrolls up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollButton(!isNearBottom);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle sending a message
  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;
    
    // Simply call sendMessage with the content
    sendMessage(content);
  };
  
  // Scroll to bottom when button is clicked
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        {!selectedConnection && (
          <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg p-4 m-4 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No database selected</p>
              <p className="text-sm mt-1">You need to select a database before you can start querying.</p>
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <EmptyChatState onSendExample={handleSendMessage} />
        ) : (
          <div className="max-w-3xl w-full mx-auto pt-8 pb-32">
            {messages.map((message, index) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                isFirst={index === 0}
                isLast={index === messages.length - 1}
              />
            ))}
            
            {/* Loading indicator */}
            {status === 'loading' && (
              <div className="py-8 flex justify-center">
                <LoadingSpinner />
              </div>
            )}
            
            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-24 right-8 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full p-3 shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="w-4 h-4 text-zinc-200" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      
      {/* Chat input */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pb-4 pt-20 px-4",
      )}>
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={status === 'loading' || !selectedConnection}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;