import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ProgressUpdates from './ProgressUpdates';
import { useAppSelector } from '../../hooks/useRedux';
import { Message } from '../../types/chat.types';

const ChatContainer: React.FC = () => {
  const messages = useAppSelector((state) => state.chat.messages);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-50">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {messages.length === 0 ? (
          <p className="text-center text-zinc-500 italic">
            Start by asking a question...
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        
        {/* Progress updates will show here when a query is being processed */}
        <ProgressUpdates />
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900 p-4">
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatContainer;
