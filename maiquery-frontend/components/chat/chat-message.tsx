// components/chat/chat-message.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/types/chat";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, ChevronDown, ChevronUp } from "lucide-react";
import DataTable from "../shared/data-table";
import CodeBlock from "../shared/code-block";
import { formatDistanceToNow } from "date-fns";

interface ChatMessageProps {
  message: ChatMessage;
  isLast?: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  isLast,
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("results");
  const [isCopied, setIsCopied] = React.useState(false);

  // Auto-scroll to the bottom when a new message appears
  useEffect(() => {
    if (isLast && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLast, message.content]);

  // Format timestamp as relative time
  const formattedTime = message.timestamp
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : "";

  // Handle copy query to clipboard
  const handleCopyQuery = () => {
    if (message.query) {
      navigator.clipboard.writeText(message.query);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Determine the background color based on the message role
  const getBackgroundColor = () => {
    switch (message.role) {
      case "user":
        return "bg-muted";
      case "assistant":
        return "bg-card";
      case "error":
        return "bg-destructive/10";
      default:
        return "bg-card";
    }
  };

  // Render different components based on the message role
  const renderMessageContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }

    if (message.role === "error") {
      return (
        <div className="text-destructive font-medium">
          {message.content || "An error occurred"}
        </div>
      );
    }

    return (
      <div className="prose dark:prose-invert max-w-none">
        {message.content}
      </div>
    );
  };

  return (
    <div
      ref={resultRef}
      className={`py-4 px-4 ${getBackgroundColor()} rounded-lg my-2`}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <Avatar className={message.role === "user" ? "bg-primary" : "bg-secondary"}>
          {message.role === "user" ? "U" : message.role === "error" ? "!" : "AI"}
        </Avatar>

        {/* Message content */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <div className="font-semibold">
              {message.role === "user" ? "You" : message.role === "error" ? "Error" : "MaiQuery"}
            </div>
            <div className="text-xs text-muted-foreground">{formattedTime}</div>
          </div>

          {renderMessageContent()}

          {/* Show results, query, and visualization if available */}
          {(message.results || message.query || message.visualizationCode) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center text-xs"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" /> Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" /> Show details
                  </>
                )}
              </Button>

              {showDetails && (
                <Card className="mt-2 p-4">
                  <Tabs defaultValue="results" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                      {message.results && (
                        <TabsTrigger value="results">Results</TabsTrigger>
                      )}
                      {message.query && (
                        <TabsTrigger value="query">SQL Query</TabsTrigger>
                      )}
                      {message.visualizationCode && (
                        <TabsTrigger value="visualization">Visualization</TabsTrigger>
                      )}
                    </TabsList>

                    {message.results && (
                      <TabsContent value="results">
                        <DataTable data={message.results} />
                      </TabsContent>
                    )}

                    {message.query && (
                      <TabsContent value="query" className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-10"
                          onClick={handleCopyQuery}
                          title="Copy to clipboard"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                        <CodeBlock
                          code={message.query}
                          language="sql"
                          showLineNumbers
                        />
                        {message.executionTimeMs && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Execution time: {message.executionTimeMs.toFixed(2)}ms
                            {message.rowCount !== undefined && ` • ${message.rowCount} rows returned`}
                          </div>
                        )}
                      </TabsContent>
                    )}

                    {message.visualizationCode && (
                      <TabsContent value="visualization">
                        <div dangerouslySetInnerHTML={{ __html: message.visualizationCode }} />
                      </TabsContent>
                    )}
                  </Tabs>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageComponent;