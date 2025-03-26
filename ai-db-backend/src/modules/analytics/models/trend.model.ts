// src/modules/analytics/models/trend.model.ts

export interface Trend {
    metricName: string;
    interval: TimeInterval;
    dataPoints: DataPoint[];
    startDate: Date;
    endDate: Date;
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
  }
  
  export interface TrendComparison {
    name: string;
    currentPeriod: Trend;
    previousPeriod: Trend;
    percentChange: number;
  }
  
  export type TimeInterval = 
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly';