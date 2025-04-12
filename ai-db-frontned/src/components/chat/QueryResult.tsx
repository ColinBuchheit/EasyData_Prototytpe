import React from 'react';
import { QueryResult as QueryResultType } from '../../types/query.types';

interface QueryResultProps {
  result: QueryResultType;
}

const QueryResult: React.FC<QueryResultProps> = ({ result }) => {
  if (!result.results || result.results.length === 0) {
    return (
      <p className="text-sm text-zinc-400 italic border border-zinc-800 p-4 rounded-lg">
        No results returned.
      </p>
    );
  }

  const columns = Object.keys(result.results[0]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-zinc-400 px-1">
        <span>{result.rowCount} rows</span>
        {result.executionTimeMs && (
          <span>Execution time: {result.executionTimeMs.toFixed(0)}ms</span>
        )}
      </div>

      <div className="overflow-auto border border-zinc-800 rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 font-medium border-b border-zinc-800">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-zinc-100">
            {result.results.map((row, i) => (
              <tr
                key={i}
                className="even:bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2 border-b border-zinc-800 max-w-[300px] truncate"
                    title={String(row[col])}
                  >
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueryResult;
