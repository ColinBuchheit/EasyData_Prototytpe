// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, 
  PieChart, 
  Calendar, 
  Clock, 
  Database, 
  Users, 
  Search,
  FileText,
  ArrowUpRight,
  Filter,
  Download
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchQueryHistory } from '../store/slices/querySlice';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Dropdown from '../components/common/Dropdown';

// Chart components
import QueryTimeChart from '../components/analytics/QueryTimeChart';
import QueryTypeDistribution from '../components/analytics/QueryTypeDistribution';
import DatabaseUsageChart from '../components/analytics/DatabaseUsageChart';
import TopQueriesTable from '../components/analytics/TopQueriesTable';
import PerformanceMetrics from '../components/analytics/PerformanceMetrics';
import UsageOverTime from '../components/analytics/UsageOverTime';

const AnalyticsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { history } = useAppSelector(state => state.query);
  const { connections } = useAppSelector(state => state.database);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [selectedDatabase, setSelectedDatabase] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Fetch data for the analytics page
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch query history with filters
        await dispatch(fetchQueryHistory({ 
          limit: 100, 
          dbId: selectedDatabase !== 'all' ? selectedDatabase as number : undefined 
        }));
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        // Add slight delay to allow for charts rendering
        setTimeout(() => setLoading(false), 800);
      }
    };
    
    fetchData();
  }, [dispatch, dateRange, selectedDatabase]);

  // Database selector items
  const databaseOptions = [
    { label: 'All Databases', value: 'all' },
    ...connections.map(conn => ({ 
      label: conn.connection_name || conn.database_name, 
      value: conn.id.toString() 
    }))
  ];

  // Date range options
  const dateRangeOptions = [
    { label: 'Last 24 Hours', value: 'day' },
    { label: 'Last 7 Days', value: 'week' },
    { label: 'Last 30 Days', value: 'month' },
    { label: 'Last Year', value: 'year' }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Page Header */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Analytics Dashboard</h1>
            <p className="text-zinc-400 mt-2">Monitor your database query performance and usage patterns</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Filter Controls */}
            <div className="flex gap-2 items-center">
              <div className="bg-zinc-800 rounded-lg p-1 flex">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={dateRange === 'day' ? 'bg-zinc-700' : ''}
                  onClick={() => setDateRange('day')}
                >
                  Day
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={dateRange === 'week' ? 'bg-zinc-700' : ''}
                  onClick={() => setDateRange('week')}
                >
                  Week
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={dateRange === 'month' ? 'bg-zinc-700' : ''}
                  onClick={() => setDateRange('month')}
                >
                  Month
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={dateRange === 'year' ? 'bg-zinc-700' : ''}
                  onClick={() => setDateRange('year')}
                >
                  Year
                </Button>
              </div>
              
              <Dropdown
                triggerLabel={selectedDatabase === 'all' ? 'All Databases' : connections.find(c => c.id === selectedDatabase)?.connection_name || 'Select DB'}
                items={databaseOptions.map(option => ({
                  label: option.label,
                  value: option.value,
                  onSelect: () => setSelectedDatabase(option.value === 'all' ? 'all' : parseInt(option.value))
                }))}
                leftIcon={<Database className="w-4 h-4" />}
                variant="outline"
                size="sm"
              />
              
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
            </div>
          </div>
        </motion.div>
      </header>
      
      {loading ? (
        // Loading state
        <div className="flex justify-center items-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="text-zinc-400">Loading analytics data...</p>
          </div>
        </div>
      ) : (
        // Dashboard content
        <div className="space-y-8">
          {/* Top Row - Summary Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Total Queries */}
            <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total Queries</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{history.length}</h3>
                    <p className="text-blue-200 text-sm mt-1">+12% from previous period</p>
                  </div>
                  <div className="bg-blue-700/50 p-3 rounded-lg">
                    <Search className="w-6 h-6 text-blue-200" />
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Avg. Query Time */}
            <Card className="bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Avg. Query Time</p>
                    <h3 className="text-3xl font-bold text-white mt-2">247ms</h3>
                    <p className="text-purple-200 text-sm mt-1">-5% from previous period</p>
                  </div>
                  <div className="bg-purple-700/50 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-200" />
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Active Databases */}
            <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Active Databases</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{connections.length}</h3>
                    <p className="text-green-200 text-sm mt-1">No change from previous period</p>
                  </div>
                  <div className="bg-green-700/50 p-3 rounded-lg">
                    <Database className="w-6 h-6 text-green-200" />
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Active Users */}
            <Card className="bg-gradient-to-br from-amber-900 to-amber-800 border-amber-700">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-amber-300 text-sm font-medium">Active Users</p>
                    <h3 className="text-3xl font-bold text-white mt-2">3</h3>
                    <p className="text-amber-200 text-sm mt-1">+1 from previous period</p>
                  </div>
                  <div className="bg-amber-700/50 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-amber-200" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Second Row - Charts */}
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Query Times Chart */}
            <Card>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Query Performance</h3>
                  </div>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>Details</Button>
                </div>
                <div className="h-80">
                  <QueryTimeChart history={history} />
                </div>
              </div>
            </Card>
            
            {/* Database Usage Distribution */}
            <Card>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Database Usage</h3>
                  </div>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>Details</Button>
                </div>
                <div className="h-80">
                  <DatabaseUsageChart history={history} connections={connections} />
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Third Row - Combined Chart & Stats */}
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Usage Over Time Chart */}
            <Card className="lg:col-span-2">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Usage Over Time</h3>
                  </div>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>Details</Button>
                </div>
                <div className="h-80">
                  <UsageOverTime history={history} dateRange={dateRange} />
                </div>
              </div>
            </Card>
            
            {/* Query Type Distribution */}
            <Card>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Query Types</h3>
                  </div>
                  <Button variant="ghost" size="sm" rightIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                </div>
                <div className="h-80">
                  <QueryTypeDistribution history={history} />
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Fourth Row - Tables & Performance */}
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* Top Queries Table */}
            <Card className="lg:col-span-2">
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Top Queries</h3>
                  </div>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>View All</Button>
                </div>
                <div>
                  <TopQueriesTable history={history} />
                </div>
              </div>
            </Card>
            
            {/* Performance Metrics */}
            <Card>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-zinc-100">Performance</h3>
                  </div>
                </div>
                <div>
                  <PerformanceMetrics history={history} />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;