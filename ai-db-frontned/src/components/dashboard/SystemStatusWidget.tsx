// src/components/dashboard/SystemStatusWidget.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { checkApiHealth, HealthCheckResult } from '../../utils/api-health';

const SystemStatusWidget: React.FC = () => {
  const [statusData, setStatusData] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initial health check
  useEffect(() => {
    fetchHealthStatus();
  }, []);

  // Refresh health status
  const fetchHealthStatus = async () => {
    setLoading(true);
    try {
      const results = await checkApiHealth();
      setStatusData(results);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error checking API health:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get overall system status
  const getOverallStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
    if (statusData.length === 0) return 'unhealthy';
    
    const unhealthyCount = statusData.filter(s => s.status === 'unhealthy').length;
    if (unhealthyCount === 0) return 'healthy';
    if (unhealthyCount < statusData.length) return 'degraded';
    return 'unhealthy';
  };

  // Get status icon and color
  const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
          label: 'All Systems Operational',
          bg: 'bg-green-900/20',
          border: 'border-green-900/50'
        };
      case 'degraded':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: 'Degraded Performance',
          bg: 'bg-amber-900/20',
          border: 'border-amber-900/50'
        };
      case 'unhealthy':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          label: 'System Issues Detected',
          bg: 'bg-red-900/20',
          border: 'border-red-900/50'
        };
    }
  };

  const overallStatus = getOverallStatus();
  const statusInfo = getStatusIcon(overallStatus);
  
  // Format relative time
  const formatUpdatedTime = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">System Status</h3>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex items-center justify-center"
            onClick={fetchHealthStatus}
            disabled={loading}
            aria-label="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Overall status */}
        <motion.div 
          className={`p-3 rounded-lg ${statusInfo.bg} border ${statusInfo.border} mb-4 flex items-center gap-3`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {statusInfo.icon}
          <div>
            <div className="font-medium text-zinc-100">{statusInfo.label}</div>
            <div className="text-xs text-zinc-400">Last checked: {formatUpdatedTime()}</div>
          </div>
        </motion.div>
        
        {/* Service statuses */}
        <div className="space-y-2">
          {statusData.map((service, index) => (
            <motion.div
              key={service.service}
              className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className="flex items-center gap-2">
                {service.status === 'healthy' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-zinc-300">{service.service}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {service.latency && (
                  <span className="text-xs text-zinc-500">{service.latency}ms</span>
                )}
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  service.status === 'healthy' 
                    ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                    : 'bg-amber-900/30 text-amber-400 border border-amber-800/50'
                }`}>
                  {service.status === 'healthy' ? 'Operational' : 'Issues'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default SystemStatusWidget;