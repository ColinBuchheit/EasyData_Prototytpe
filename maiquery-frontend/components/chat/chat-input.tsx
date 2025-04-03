// components/chat/chat-input.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, DatabaseIcon, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatStore } from "@/store/chat-store";
import { useDatabaseStore } from "@/store/database-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  className?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ className }) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const sendMessage = useChatStore((state) => state.sendMessage);
  const isLoading = useChatStore((state) => state.isLoading);
  const activeConversation = useChatStore((state) => state.getActiveConversation());
  
  const databases = useDatabaseStore((state) => state.databases);
  const currentDatabaseId = useDatabaseStore((state) => state.currentDatabaseId);
  const setCurrentDatabase = useDatabaseStore((state) => state.setCurrentDatabase);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    sendMessage(message);
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
    }
  };

  // Handle textarea key press (Shift+Enter for new line, Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle database selection
  const handleDatabaseSelect = async (dbId: number | null) => {
    await setCurrentDatabase(dbId);
  };

  // Get currently selected database name
  const getCurrentDatabaseName = () => {
    if (!currentDatabaseId) return "No database selected";
    
    const db = databases.find((db) => db.id === currentDatabaseId);
    return db ? (db.connectionName || db.name) : "Unknown database";
  };

  return (
    <div className={`border-t bg-background p-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        {/* Database selector */}
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center">
            <DatabaseIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground">Database:</span>
          </div>
          
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2">
                      {getCurrentDatabaseName()}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select a database to query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenuContent align="end">
              {databases.length > 0 ? (
                <>
                  {databases.map((db) => (
                    <DropdownMenuItem
                      key={db.id}
                      onClick={() => handleDatabaseSelect(db.id)}
                      className={db.id === currentDatabaseId ? "bg-muted" : ""}
                    >
                      <DatabaseIcon className="h-4 w-4 mr-2" />
                      {db.connectionName || db.name}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <DropdownMenuItem disabled>No databases available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            className="pr-20 resize-none min-h-[80px] max-h-[320px] py-4"
            disabled={isLoading}
          />
          
          <div className="absolute bottom-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || isLoading}
                    className="rounded-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>
            Press <kbd className="px-1 py-0.5 rounded border">Enter</kbd> to send,{" "}
            <kbd className="px-1 py-0.5 rounded border">Shift</kbd> +{" "}
            <kbd className="px-1 py-0.5 rounded border">Enter</kbd> for new line
          </p>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;