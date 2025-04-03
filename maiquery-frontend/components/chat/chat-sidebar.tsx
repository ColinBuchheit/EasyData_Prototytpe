// components/chat/chat-sidebar.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Trash2, Edit2, Check, X, MessageSquare, DatabaseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { useDatabaseStore } from "@/store/database-store";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatSidebarProps {
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const createConversation = useChatStore((state) => state.createConversation);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  
  const databases = useDatabaseStore((state) => state.databases);
  const currentDatabaseId = useDatabaseStore((state) => state.currentDatabaseId);
  const fetchDatabases = useDatabaseStore((state) => state.fetchDatabases);

  // Fetch databases on component mount
  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle new conversation
  const handleNewConversation = () => {
    createConversation("New Conversation", currentDatabaseId || undefined);
  };

  // Start editing conversation title
  const handleEditStart = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  // Save edited title
  const handleEditSave = (id: string) => {
    if (editTitle.trim()) {
      useChatStore.setState({
        conversations: conversations.map((c) =>
          c.id === id ? { ...c, title: editTitle.trim() } : c
        ),
      });
    }
    setEditingId(null);
  };

  // Cancel editing
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Confirm delete dialog
  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Perform deletion
  const handleDeleteConfirm = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  // Get database name for a conversation
  const getDatabaseName = (dbId?: number) => {
    if (!dbId) return null;
    const db = databases.find((db) => db.id === dbId);
    return db ? (db.connectionName || db.name) : null;
  };

  return (
    <div className={cn("flex flex-col h-full border-r", className)}>
      <div className="p-4">
        <Button 
          onClick={handleNewConversation} 
          className="w-full justify-start"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>
      
      <div className="px-4 mb-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div key={conversation.id}>
                <Button
                  variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto py-2 px-2 mb-1",
                    activeConversationId === conversation.id ? "font-medium" : ""
                  )}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="flex items-start space-x-2 w-full overflow-hidden">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      {editingId === conversation.id ? (
                        <div className="flex items-center">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-6 py-1 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSave(conversation.id);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCancel();
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="text-sm truncate">{conversation.title}</div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <span className="truncate">
                              {format(new Date(conversation.updatedAt), "MMM d, yyyy")}
                            </span>
                            {conversation.dbId && (
                              <div className="flex items-center ml-1">
                                <span className="mx-1">•</span>
                                <DatabaseIcon className="h-3 w-3 mr-1" />
                                <span className="truncate">{getDatabaseName(conversation.dbId)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {!editingId && activeConversationId === conversation.id && (
                      <div className="flex space-x-1 opacity-60 hover:opacity-100 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(conversation.id, conversation.title);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(conversation.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Button>
              </div>
            ))
          ) : searchQuery ? (
            <div className="text-center py-12 text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No conversations yet
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this conversation? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatSidebar;