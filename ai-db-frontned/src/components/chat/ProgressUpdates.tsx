import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ProgressUpdate, ProgressUpdateType } from '../../types/query.types';

// Icons for different types of progress updates
const getProgressIcon = (type: ProgressUpdateType): string => {
  switch (type) {
    case ProgressUpdateType.THINKING:
      return '💭';
    case ProgressUpdateType.SCHEMA_ANALYSIS:
      return '🔍';
    case ProgressUpdateType.QUERY_GENERATION:
      return '⚙️';
    case ProgressUpdateType.QUERY_EXECUTION:
      return '🚀';
    case ProgressUpdateType.RESULT_ANALYSIS:
      return '📊';
    case ProgressUpdateType.VISUALIZATION:
      return '📈';
    case ProgressUpdateType.DECISION:
      return '🤔';
    case ProgressUpdateType.ERROR:
      return '⚠️';
    default:
      return '•';
  }
};

// Format progress update timestamp
const formatUpdateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

interface ProgressUpdateItemProps {
  update: ProgressUpdate;
}

const ProgressUpdateItem: React.FC<ProgressUpdateItemProps> = ({ update }) => {
  const { type, message, timestamp, details } = update;
  const icon = getProgressIcon(type);
  const time = formatUpdateTime(timestamp);

  return (
    <div className="flex items-start mb-2 text-sm">
      <div className="mr-2 min-w-[24px] text-center">{icon}</div>
      <div className="flex-1">
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        {details?.query && (
          <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
            {details.query}
          </div>
        )}
      </div>
      <div className="ml-2 text-xs text-gray-500">{time}</div>
    </div>
  );
};

const ProgressUpdates: React.FC = () => {
  const { progressUpdates } = useSelector((state: RootState) => state.query);
  
  // If there are no progress updates or the query is not in progress, don't render
  if (progressUpdates.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        Processing your query...
      </h3>
      <div className="max-h-60 overflow-y-auto">
        {progressUpdates.map((update, index) => (
          <ProgressUpdateItem key={index} update={update} />
        ))}
      </div>
    </div>
  );
};

export default ProgressUpdates;
