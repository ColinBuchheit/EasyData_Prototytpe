// src/components/chat/ChatProgress.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../../hooks/useRedux';
import { ProgressUpdateType } from '../../types/query.types';
import { 
  Brain, 
  Database, 
  Code, 
  RefreshCw, 
  BarChart, 
  LayoutDashboard,
  ThumbsUp,
  AlertTriangle 
} from 'lucide-react';

const getProgressIcon = (type: ProgressUpdateType) => {
  switch (type) {
    case ProgressUpdateType.THINKING:
      return <Brain className="w-4 h-4 text-purple-400" />;
    case ProgressUpdateType.SCHEMA_ANALYSIS:
      return <Database className="w-4 h-4 text-blue-400" />;
    case ProgressUpdateType.QUERY_GENERATION:
      return <Code className="w-4 h-4 text-green-400" />;
    case ProgressUpdateType.QUERY_EXECUTION:
      return <RefreshCw className="w-4 h-4 text-yellow-400" />;
    case ProgressUpdateType.RESULT_ANALYSIS:
      return <BarChart className="w-4 h-4 text-orange-400" />;
    case ProgressUpdateType.VISUALIZATION:
      return <LayoutDashboard className="w-4 h-4 text-pink-400" />;
    case ProgressUpdateType.DECISION:
      return <ThumbsUp className="w-4 h-4 text-indigo-400" />;
    case ProgressUpdateType.ERROR:
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default:
      return <RefreshCw className="w-4 h-4 text-zinc-400" />;
  }
};

const ChatProgress: React.FC = () => {
  const { progressUpdates } = useAppSelector(state => state.query);
  const { status } = useAppSelector(state => state.chat);
  
  // Only show when processing or streaming
  if ((status !== 'loading' && status !== 'streaming') || progressUpdates.length === 0) {
    return null;
  }
  
  // Take the last 3 progress updates to show
  const recentUpdates = progressUpdates.slice(-3);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg shadow-xl p-3 max-w-md w-full mx-auto z-10"
    >
      <div className="text-xs text-zinc-400 mb-2">Processing your query...</div>
      
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {recentUpdates.map((update, index) => (
            <motion.div
              key={`${update.type}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 text-sm"
            >
              <div className="flex-shrink-0 mt-0.5">{getProgressIcon(update.type)}</div>
              <div className="text-zinc-300">{update.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* SQL preview if available */}
      {progressUpdates.some(u => u.type === ProgressUpdateType.QUERY_GENERATION && u.details?.query) && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 mb-1">Generated SQL:</div>
          <div className="bg-zinc-950 rounded p-2 text-xs font-mono text-green-400 overflow-x-auto max-h-20 overflow-y-auto">
            {progressUpdates.find(u => u.type === ProgressUpdateType.QUERY_GENERATION && u.details?.query)?.details.query}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatProgress;