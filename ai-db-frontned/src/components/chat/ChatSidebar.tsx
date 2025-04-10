// src/components/chat/ChatSidebar.tsx
import React from 'react';
import { Plus, Trash2, MessageSquare, MoreVertical, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/format.utils';
import Button from '../common/Button';
import { ChatSession } from '../../types/chat.types';
import { Menu } from '@headlessui/react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearChat: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  onNewChat, 
  onSelectSession,
  onDeleteSession,
  onClearChat,
  sessions,
  currentSessionId
}) => {
  // Format relative time
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

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
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No conversations yet
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {sessions.map(session => (
              <div 
                key={session.id} 
                className="group relative"
              >
                <button
                  className={cn(
                    "flex items-center w-full rounded-md px-3 py-2 text-left hover:bg-zinc-800/50 group relative",
                    session.id === currentSessionId 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-300"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {session.title || `Conversation ${session.id.substring(0, 8)}`}
                      </div>
                      
                      <div className="text-xs text-zinc-500 truncate">
                        {formatTime(session.updatedAt)}
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Action menu (appears on hover) */}
                <div className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                  session.id === currentSessionId && "opacity-100"
                )}>
                  <Menu as="div" className="relative">
                    <Menu.Button className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300">
                      <MoreVertical className="w-4 h-4" />
                    </Menu.Button>
                    
                    <Menu.Items className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg z-10 py-1">
                      {session.id === currentSessionId && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={cn(
                                "flex w-full items-center px-3 py-2 text-sm",
                                active ? "bg-zinc-800 text-zinc-200" : "text-zinc-400"
                              )}
                              onClick={onClearChat}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Clear conversation
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-sm",
                              active ? "bg-zinc-800 text-red-400" : "text-red-400"
                            )}
                            onClick={() => onDeleteSession(session.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete conversation
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                </div>
              </div>
            ))}
          </motion.div>
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