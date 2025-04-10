// src/components/dashboard/RecentQueriesWidget.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Database, ArrowRight, Play, Code, Copy } from 'lucide-react';
import { QueryHistory } from '../../types/query.types';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { useAppDispatch } from '../../hooks/useRedux';
import { addToast } from '../../store/slices/uiSlice';
import { executeQuery } from '../../store/slices/querySlice';

interface RecentQueriesWidgetProps {
  history: QueryHistory[];
  loading: boolean;
}

const RecentQueriesWidget: React.FC<RecentQueriesWidgetProps> = ({ history, loading }) => {
  const dispatch = useAppDispatch();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        dispatch(
          addToast({
            type: 'success',
            message: 'Query copied to clipboard',
          })
        );
      },
      () => {
        dispatch(
          addToast({
            type: 'error',
            message: 'Failed to copy query',
          })
        );
      }
    );
  };

  const rerunQuery = (query: QueryHistory) => {
    dispatch(
      executeQuery({
        dbId: query.dbId,
        query: query.queryText,
      })
    );
    
    // Redirect to chat page
    window.location.href = '/chat';
  };

  // Format execution time
  const formatExecTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format relative time
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Recent Queries</h3>
          </div>
          
          <a 
            href="/chat"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-zinc-400">No query history found</p>
            <p className="text-zinc-500 text-sm mt-1">
              Start querying your database to see history
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 5).map((query, index) => (
              <motion.div
                key={query.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden"
              >
                <div className="p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-start gap-2">
                      <Database className="w-4 h-4 text-zinc-400 mt-1" />
                      <div>
                        <p className="text-zinc-200 font-medium line-clamp-1">
                          {query.queryText.length > 70
                            ? `${query.queryText.substring(0, 70)}...`
                            : query.queryText}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span>{formatTime(query.timestamp)}</span>
                          <span>•</span>
                          <span>{formatExecTime(query.executionTimeMs)}</span>
                          <span>•</span>
                          <span>{query.rowCount} rows</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => rerunQuery(query)}
                      className="flex items-center gap-1 text-xs py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                      aria-label="Run query again"
                    >
                      <Play className="w-3 h-3" />
                      Run Again
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(query.queryText)}
                      className="flex items-center gap-1 text-xs py-1 px-2 bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition-colors"
                      aria-label="Copy query to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    
                    {/* View Results button (optional) */}
                    <button
                      onClick={() => window.location.href = '/chat'}
                      className="flex items-center gap-1 text-xs py-1 px-2 bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition-colors ml-auto"
                      aria-label="View query details"
                    >
                      <Code className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentQueriesWidget;