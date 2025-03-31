// src/modules/analytics/models/trend.model.ts

export interface Trend {
  metricName: string;
  interval: TimeInterval;
  dataPoints: DataPoint[];
  startDate: Date;
  endDate: Date;
  // Added metadata fields
  totalValue?: number;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface TrendFilter {
  metricName: string;
  interval: TimeInterval;
  startDate?: Date;
  endDate?: Date;
  userId?: number;
  dbId?: number;
  dimension?: string;
  // Added optional parameter for aggregation
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface TrendComparison {
  name: string;
  currentPeriod: Trend;
  previousPeriod: Trend;
  percentChange: number;
  // Added fields for more detailed comparison
  absoluteChange: number;
  isPositiveTrend: boolean;
}

export type TimeInterval = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

/**
 * Class implementation of Trend with utility methods
 */
export class TrendImpl implements Trend {
  metricName: string;
  interval: TimeInterval;
  dataPoints: DataPoint[];
  startDate: Date;
  endDate: Date;
  totalValue?: number;
  averageValue?: number;
  minValue?: number;
  maxValue?: number;
  
  constructor(data: Trend) {
    this.metricName = data.metricName;
    this.interval = data.interval;
    this.dataPoints = [...data.dataPoints]; // Make a copy to avoid reference issues
    this.startDate = new Date(data.startDate);
    this.endDate = new Date(data.endDate);
    
    // Calculate derived values
    this.calculateStatistics();
  }
  
  private calculateStatistics(): void {
    if (this.dataPoints.length === 0) {
      this.totalValue = 0;
      this.averageValue = 0;
      this.minValue = 0;
      this.maxValue = 0;
      return;
    }
    
    const values = this.dataPoints.map(point => point.value);
    this.totalValue = values.reduce((sum, value) => sum + value, 0);
    this.averageValue = this.totalValue / values.length;
    this.minValue = Math.min(...values);
    this.maxValue = Math.max(...values);
  }
  
  /**
   * Get the last data point in the trend
   */
  getLastValue(): number {
    if (this.dataPoints.length === 0) return 0;
    return this.dataPoints[this.dataPoints.length - 1].value;
  }
  
  /**
   * Check if trend is generally increasing or decreasing
   */
  isTrendIncreasing(): boolean | null {
    if (this.dataPoints.length < 2) return null;
    
    // Simple linear regression slope
    const n = this.dataPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.dataPoints[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope > 0;
  }
  
  /**
   * Add a new data point to the trend
   */
  addDataPoint(point: DataPoint): void {
    this.dataPoints.push(point);
    this.calculateStatistics();
  }
  
  /**
   * Convert to JSON-safe object
   */
  toJSON(): Trend {
    return {
      metricName: this.metricName,
      interval: this.interval,
      dataPoints: this.dataPoints,
      startDate: this.startDate,
      endDate: this.endDate,
      totalValue: this.totalValue,
      averageValue: this.averageValue,
      minValue: this.minValue,
      maxValue: this.maxValue
    };
  }
}

/**
 * Create a comparison between two trend periods
 */
export function createTrendComparison(
  name: string,
  currentPeriod: Trend,
  previousPeriod: Trend
): TrendComparison {
  const currentTotal = currentPeriod.dataPoints.reduce((sum, point) => sum + point.value, 0);
  const previousTotal = previousPeriod.dataPoints.reduce((sum, point) => sum + point.value, 0);
  
  let percentChange = 0;
  if (previousTotal !== 0) {
    percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
  } else if (currentTotal !== 0) {
    percentChange = 100; // If previous was 0 and current is not, that's 100% increase
  }
  
  const absoluteChange = currentTotal - previousTotal;
  const isPositiveTrend = absoluteChange > 0;
  
  return {
    name,
    currentPeriod,
    previousPeriod,
    percentChange,
    absoluteChange,
    isPositiveTrend
  };
}