// src/components/dashboard/QuickActionsWidget.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Database, 
  FileText,
  Lightbulb
} from 'lucide-react';
import Card from '../common/Card';

interface QuickActionsWidgetProps {
  onNewChat: () => void;
}

const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ onNewChat }) => {
  // Action items
  const actions = [
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'New Chat',
      description: 'Start a new chat with your database',
      href: '#',
      onClick: onNewChat,
      color: 'bg-blue-600'
    },
    {
      icon: <Database className="w-4 h-4" />,
      label: 'Add Database',
      description: 'Connect to a new database',
      href: '/databases',
      color: 'bg-purple-600'
    },
    {
      icon: <Lightbulb className="w-4 h-4" />,
      label: 'Example Queries',
      description: 'See example queries',
      href: '/chat?examples=true',
      color: 'bg-amber-600'
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: 'Documentation',
      description: 'View documentation and guides',
      href: 'https://docs.example.com',
      target: '_blank',
      color: 'bg-green-600'
    }
  ];

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-zinc-100">Quick Actions</h3>
          </div>
        </div>
        
        <div className="space-y-2">
          {actions.map((action, index) => (
            <motion.a
              key={action.label}
              href={action.href}
              target={action.target}
              onClick={(e) => {
                if (action.onClick) {
                  e.preventDefault();
                  action.onClick();
                }
              }}
              className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-750 transition-all"
              whileHover={{ x: 4 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center`}>
                {action.icon}
              </div>
              <div>
                <div className="font-medium text-zinc-200">{action.label}</div>
                <div className="text-xs text-zinc-400">{action.description}</div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default QuickActionsWidget;