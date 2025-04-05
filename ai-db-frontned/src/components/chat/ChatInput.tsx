import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useRedux';
import { addMessage } from '../../store/slices/chatSlice';
import Button from '../common/Button';
import Input from '../common/Input';

const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const dispatch = useAppDispatch();

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    dispatch(addMessage(newMessage));
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1 bg-zinc-800 text-zinc-100 border-zinc-700 focus:ring-2 focus:ring-blue-500"
        placeholder="Ask your database..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        onClick={handleSend}
        aria-label="Send message"
        disabled={!input.trim()}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChatInput;
