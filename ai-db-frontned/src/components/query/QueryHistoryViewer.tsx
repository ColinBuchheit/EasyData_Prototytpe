// src/components/query/QueryHistoryViewer.tsx
import React, { useState } from 'react';
import { Clock, Database, ArrowUpRight, ChevronDown, ChevronRight, Play, Copy, Code } from 'lucide-react';
import { QueryHistory } from '../../types/query.types';
import { useAppDispatch } from '../../hooks/useRedux';
import { executeQuery } from '../../store/slices/querySlice';
import { addToast } from '../../store/slices/uiSlice';

interface QueryHistoryViewerProps {
  history: QueryHistory[];
  onSelectQuery?: (query: string) => void;
}

const QueryHistoryViewer: React.FC<QueryHistoryViewerProps> = ({ history, onSelectQuery }) => {
  const dispatch = useAppDispatch();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

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

  const reRunQuery = (query: QueryHistory) => {
    dispatch(
      executeQuery({
        dbId: query.dbId,
        query: query.queryText,
      })
    );
  };

  const selectQuery = (query: string) => {
    if (onSelectQuery) {
      onSelectQuery(query);
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-lg p-8 text-center text-zinc-400">
        <Clock className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
        <h3 className="text-lg font-medium mb-2">No Query History</h3>
        <p>Run queries to see them in your history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
      <div className="p-4 bg-zinc-900">
        <h3 className="text-lg font-medium text-zinc-100">Query History</h3>
        <p className="text-sm text-zinc-400 mt-1">Your recent database queries</p>
      </div>
  
      <div className="divide-y divide-zinc-800">
        {history.map((item) => (
          <div key={item.id || item.timestamp} className="bg-zinc-900">
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800"
              onClick={() => toggleItem(item.id || item.timestamp)}
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-zinc-300 font-medium">
                    {item.queryText && item.queryText.length > 40
                      ? `${item.queryText.substring(0, 40)}...`
                      : item.queryText || 'Unknown query'}
                  </div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>{formatDate(item.timestamp)}</span>
                    <span>•</span>
                    <span>{formatExecutionTime(item.executionTimeMs || 0)}</span>
                    <span>•</span>
                    <span>{(item.rowCount || 0).toLocaleString()} rows</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {expandedItems[item.id || item.timestamp] ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
              </div>
            </div>
  
            {expandedItems[item.id || item.timestamp] && (
              <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800">
                <pre className="bg-zinc-900 p-3 rounded-md text-zinc-300 text-sm overflow-x-auto">
                  {item.queryText || 'No query text available'}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => reRunQuery(item)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                  >
                    <Play className="w-3 h-3" />
                    Run Again
                  </button>
                  <button
                    onClick={() => copyToClipboard(item.queryText)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-md text-xs hover:bg-zinc-700"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => selectQuery(item.queryText)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-md text-xs hover:bg-zinc-700"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    Load in Editor
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-zinc-900 p-2 rounded-md">
                    <div className="text-zinc-500 mb-1">Database ID</div>
                    <div className="text-zinc-300">{item.dbId}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded-md">
                    <div className="text-zinc-500 mb-1">Execution Time</div>
                    <div className="text-zinc-300">{formatExecutionTime(item.executionTimeMs)}</div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded-md">
                    <div className="text-zinc-500 mb-1">Row Count</div>
                    <div className="text-zinc-300">{item.rowCount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueryHistoryViewer;
