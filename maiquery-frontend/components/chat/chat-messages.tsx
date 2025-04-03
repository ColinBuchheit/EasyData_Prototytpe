// components/chat/chat-messages.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/types/chat";
import ChatMessageComponent from "./chat-message";
import { useChatStore } from "@/store/chat-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface ChatMessagesProps {
  className?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ className }) => {
  const getActiveConversation = useChatStore((state) => state.getActiveConversation);
  const activeConversation = getActiveConversation();
  const messages = activeConversation?.messages || [];
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // Setup scroll detection to show/hide scroll button
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      // Find the actual scrollable div within the ScrollArea component
      const scrollableDiv = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollableDiv) return;
      
      const { scrollTop, scrollHeight, clientHeight } = scrollableDiv as HTMLDivElement;
      const scrollPosition = scrollHeight - scrollTop - clientHeight;
      
      // Consider "at bottom" if within 100px of the bottom
      const atBottom = scrollPosition < 100;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom);
    };

    // Find the scrollable div within the ScrollArea
    const scrollableDiv = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollableDiv) {
      scrollableDiv.addEventListener('scroll', handleScroll);
      return () => scrollableDiv.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Handle scroll to bottom
  const scrollToBottom = () => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
    }
  };

  // Initial welcome message if conversation is empty
  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome to MaiQuery!</h2>
          <p className="text-muted-foreground mb-4">
            Ask me anything about your databases. I can help you query data, understand schemas, and visualize results.
          </p>
          <p className="text-sm text-muted-foreground">
            Start by typing a question below...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
          <div ref={endOfMessagesRef} />
        </div>
      </ScrollArea>
      
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-4 rounded-full shadow-md"
          size="icon"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <ChevronDown />
        </Button>
      )}
    </div>
  );
};

export default ChatMessages;