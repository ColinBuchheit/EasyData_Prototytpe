import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
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
        disabled={!input.trim() || disabled}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChatInput;
