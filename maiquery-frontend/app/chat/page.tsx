"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatMessages from "@/components/chat/chat-messages";
import ChatInput from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  Database,
  Settings,
  User,
  LogOut,
  X,
  PanelLeft,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useChatStore } from "@/store/chat-store";
import { useDatabaseStore } from "@/store/database-store";

export default function ChatPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  
  const createConversation = useChatStore((state) => state.createConversation);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const getActiveConversation = useChatStore((state) => state.getActiveConversation);
  
  const fetchDatabases = useDatabaseStore((state) => state.fetchDatabases);
  const currentDatabaseId = useDatabaseStore((state) => state.currentDatabaseId);
  const getCurrentDatabase = useDatabaseStore((state) => state.getCurrentDatabase);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Create a new conversation if none exists
  useEffect(() => {
    if (!activeConversationId && useChatStore.getState().conversations.length === 0) {
      createConversation("New Conversation", currentDatabaseId || undefined);
    }
  }, [activeConversationId, createConversation, currentDatabaseId]);

  // Fetch databases on mount
  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const activeConversation = getActiveConversation();
  const currentDatabase = getCurrentDatabase();

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle logout
  const handleLogout = () => {
    // Clear tokens and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="mr-2"
            >
              <PanelLeft className={`h-5 w-5 ${sidebarOpen ? "" : "rotate-180"}`} />
            </Button>
          )}
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <ChatSidebar className="h-full" />
              </SheetContent>
            </Sheet>
          )}
          <h1 className="text-lg font-semibold">MaiQuery</h1>
        </div>

        <div className="flex items-center space-x-2">
          {currentDatabase && (
            <div className="hidden md:flex items-center mr-4 text-sm">
              <Database className="h-4 w-4 mr-1" />
              <span className="font-medium">
                {currentDatabase.connectionName || currentDatabase.name}
              </span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <Database className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/profile")}>
            <User className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!isMobile && sidebarOpen && (
          <ChatSidebar className="w-80 flex-shrink-0" />
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b">
            <h2 className="text-md font-medium">
              {activeConversation?.title || "New Conversation"}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatMessages />
          </div>
          <ChatInput />
        </div>
      </div>
    </div>
  );
}