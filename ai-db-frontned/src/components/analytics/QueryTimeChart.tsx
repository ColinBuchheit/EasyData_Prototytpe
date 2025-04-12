// src/components/analytics/QueryTimeChart.tsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { QueryHistory } from '../../types/query.types';

interface QueryTimeChartProps {
  history: QueryHistory[];
}

const QueryTimeChart: React.FC<QueryTimeChartProps> = ({ history }) => {
  // Process the data for the chart
  const processData = () => {
    // Create a frequency distribution of query times
    const timeRanges = [
      '0-100ms', '100-200ms', '200-500ms', 
      '500ms-1s', '1s-2s', '2s+'
    ];
    
    const counts = Array(timeRanges.length).fill(0);
    
    history.forEach(query => {
      const time = query.executionTimeMs;
      
      if (time < 100) counts[0]++;
      else if (time < 200) counts[1]++;
      else if (time < 500) counts[2]++;
      else if (time < 1000) counts[3]++;
      else if (time < 2000) counts[4]++;
      else counts[5]++;
    });
    
    return { labels: timeRanges, data: counts };
  };
  
  const { labels, data } = processData();
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Number of Queries',
        data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',  // Blue
          'rgba(99, 102, 241, 0.7)',  // Indigo
          'rgba(139, 92, 246, 0.7)',  // Purple
          'rgba(236, 72, 153, 0.7)',  // Pink
          'rgba(239, 68, 68, 0.7)',   // Red
          'rgba(249, 115, 22, 0.7)',  // Orange
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e4e4e7', // zinc-200
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(63, 63, 70, 0.5)', // zinc-700 with opacity
        },
        ticks: {
          color: '#a1a1aa', // zinc-400
        },
      },
      x: {
        grid: {
          color: 'rgba(63, 63, 70, 0.5)', // zinc-700 with opacity
        },
        ticks: {
          color: '#a1a1aa', // zinc-400
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default QueryTimeChart;