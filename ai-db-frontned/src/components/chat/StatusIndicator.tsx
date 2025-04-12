import React from 'react';
import { CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { cn } from '../../utils/format.utils';

interface StatusIndicatorProps {
  status: 'success' | 'error' | 'loading' | 'stream';
  message?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
  const icon = {
    success: <CheckCircle className="text-green-500 w-4 h-4" />,
    error: <XCircle className="text-red-500 w-4 h-4" />,
    loading: <Loader2 className="text-blue-500 w-4 h-4 animate-spin" />,
    stream: <Info className="text-yellow-400 w-4 h-4 animate-pulse" />,
  }[status];

  return (
    <div className="flex items-start gap-2 text-sm whitespace-pre-wrap">
      {icon}
      <span
        className={cn(
          status === 'error'
            ? 'text-red-400'
            : status === 'stream'
            ? 'text-yellow-300'
            : 'text-zinc-300'
        )}
      >
        {message || (status === 'loading' ? 'Running query...' : 'Query complete.')}
      </span>
    </div>
  );
};

export default StatusIndicator;
