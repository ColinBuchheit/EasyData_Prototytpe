import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';
import { cn } from '../../utils/format.utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  RadialLinearScale
);

interface VisualizationProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';
  data: any;
  options?: any;
  title?: string;
}

const chartMap = {
  bar: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
};

const Visualization: React.FC<VisualizationProps> = ({ type, data, options, title }) => {
  if (!data || !data.datasets?.length) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6 border border-zinc-800 text-zinc-400 text-sm text-center">
        📉 No data available for visualization.
      </div>
    );
  }

  const ChartComponent = chartMap[type];

  return (
    <div className="w-full bg-zinc-900 p-4 rounded-lg border border-zinc-800 shadow-md space-y-3">
      {title && <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>}
      <div className="w-full aspect-[3/2] sm:aspect-[4/2]">
        <ChartComponent data={data} options={options} />
      </div>
    </div>
  );
};

export default Visualization;
