// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LucideIcon,
  LayoutDashboard, 
  Database, 
  MessageSquare, 
  BarChart2, 
  Settings,
  ChevronLeft,
  PlusCircle,
  History,
  Lightbulb,
  Menu
} from 'lucide-react';

import { useAppSelector, useAppDispatch } from '../../hooks/useRedux';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { toggleSidebar, setSidebarOpen } from '../../store/slices/uiSlice';
import { createChatSession } from '../../store/slices/chatSlice';

// interface for Navigation item
interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  badge?: number | string;
}

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { sidebarOpen } = useAppSelector(state => state.ui);
  const { sessions } = useAppSelector(state => state.chat);
  const [chatSessionsOpen, setChatSessionsOpen] = useState(true);
  
  // Main navigation items
  const navItems: NavItem[] = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Databases', path: '/databases', icon: Database },
    { title: 'Analytics', path: '/analytics', icon: BarChart2 },
    { title: 'Settings', path: '/settings', icon: Settings },
  ];
  
  // Create a new chat session
  const handleNewChat = async () => {
    try {
      const session = await dispatch(createChatSession("New Chat")).unwrap();
      if (session) {
        // Navigate programmatically
        window.location.href = '/chat';
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };
  
  // Toggle sidebar on mobile
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };
  
  // Check if a path is active
  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <button 
          onClick={handleToggleSidebar}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    
      {/* Sidebar backdrop for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}
    
      {/* Sidebar */}
      <motion.aside 
        className={`
          bg-zinc-900 border-r border-zinc-800 h-screen
          ${isMobile ? 'fixed left-0 top-0 z-50 w-64' : 'w-64 sticky top-0'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
        initial={false}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-800">
            <Link to="/" className="flex items-center gap-2 text-zinc-100 font-semibold">
              <span className="text-blue-500 text-xl">•</span> 
              maiquery
            </Link>
            
            {!isMobile && (
              <button 
                onClick={handleToggleSidebar}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Navigation section */}
          <div className="flex-1 overflow-y-auto py-4 px-3">
            {/* Main navigation */}
            <nav className="space-y-1 mb-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                    ${isActive(item.path) 
                      ? 'bg-blue-600/10 text-blue-500 font-medium border-l-2 border-blue-500 pl-[10px]' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                  
                  {item.badge && (
                    <span className="ml-auto bg-blue-600 text-xs rounded-full px-2 py-0.5 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            
            {/* Chat section */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-sm font-medium text-zinc-400">Recent Chats</h3>
                <button 
                  onClick={() => setChatSessionsOpen(!chatSessionsOpen)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
                >
                  <ChevronLeft className={`w-4 h-4 transition-transform ${chatSessionsOpen ? 'rotate-90' : ''}`} />
                </button>
              </div>
              
              {/* New chat button */}
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-500 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                New Chat
              </button>
              
              {/* Chat sessions list */}
              {chatSessionsOpen && (
                <div className="mt-2 space-y-1">
                  {sessions.slice(0, 5).map((session) => (
                    <Link
                      key={session.id}
                      to={`/chat?session=${session.id}`}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-md text-sm truncate
                        ${location.pathname === '/chat' && location.search.includes(session.id) 
                          ? 'bg-zinc-800 text-blue-400' 
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}
                      `}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </Link>
                  ))}
                  
                  {sessions.length > 5 && (
                    <Link
                      to="/chat/history"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md"
                    >
                      <History className="w-4 h-4" />
                      View all chats
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {/* Tips section */}
            <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-zinc-300">Pro Tips</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                Use natural language to ask questions about your database. Try phrases like "Show me sales by region" or "Count users by signup date".
              </p>
              <button className="text-xs text-blue-400 hover:text-blue-300">
                View more tips
              </button>
            </div>
          </div>
          
          {/* Sidebar footer */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                <Database className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-xs">
                <div className="text-zinc-400">Connected Database</div>
                <div className="text-zinc-200 font-medium">postgres_main</div>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;