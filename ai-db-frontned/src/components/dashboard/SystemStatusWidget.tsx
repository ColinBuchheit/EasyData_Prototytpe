// src/components/dashboard/SystemStatusWidget.tsx
import React from 'react';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import Card from '../common/Card';

const SystemStatusWidget: React.FC = () => {
  // Simplified version without real API calls
  const mockServices = [
    { name: 'API Server', status: 'healthy', latency: 42 },
    { name: 'Database', status: 'healthy', latency: 78 },
    { name: 'Authentication', status: 'healthy', latency: 35 }
  ];

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">System Status</h3>
          </div>
        </div>
        
        <div className="space-y-2">
          {mockServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700"
            >
              <div className="flex items-center gap-2">
                {service.status === 'healthy' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-zinc-300">{service.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{service.latency}ms</span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-800/50">
                  Operational
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default SystemStatusWidget;