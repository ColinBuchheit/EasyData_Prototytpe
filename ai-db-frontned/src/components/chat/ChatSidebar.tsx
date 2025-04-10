import React from 'react';
import { useAppSelector } from '../../hooks/useRedux';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/format.utils';
import Button from '../common/Button';

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string | null) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  onNewChat, 
  onSelectSession,
  onDeleteSession 
}) => {
  const { sessions, currentSessionId } = useAppSelector(state => state.chat);

  return (
    <div className="flex flex-col h-full py-4">
      {/* Header */}
      <div className="px-4 mb-4">
        <h2 className="text-xl font-semibold text-zinc-200 mb-4">Conversations</h2>
        <Button
          variant="default"
          className="w-full"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onNewChat}
        >
          New Conversation
        </Button>
      </div>
      
      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-1">
            {sessions.map(session => (
              <li key={session.id}>
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 cursor-pointer group",
                    session.id === currentSessionId 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className="truncate">
                    {session.title || `Conversation ${session.id.substring(0, 8)}`}
                  </span>
                  
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-auto px-4 pt-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          <p>AI Database Assistant</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
