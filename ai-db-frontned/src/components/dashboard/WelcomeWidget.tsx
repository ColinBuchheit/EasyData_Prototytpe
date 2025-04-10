// src/components/dashboard/WelcomeWidget.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';
import Button from '../common/Button';

interface WelcomeWidgetProps {
  onNewChat: () => void;
}

const WelcomeWidget: React.FC<WelcomeWidgetProps> = ({ onNewChat }) => {
  return (
    <motion.div 
      className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl overflow-hidden shadow-lg border border-blue-700"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-6 md:p-8 relative">
        {/* Background sparkle elements */}
        <div className="absolute top-10 right-10 opacity-20">
          <Sparkles className="w-20 h-20 text-blue-300" />
        </div>
        <div className="absolute bottom-5 left-5 opacity-10">
          <Sparkles className="w-16 h-16 text-blue-300" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-lg p-2">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Maiquery AI</h2>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ask questions about your database in plain English
          </h3>
          
          <p className="text-blue-100 mb-6 max-w-2xl">
            Connect to your database and start asking questions in natural language. 
            Our AI will generate the SQL, run it, and explain the results for you.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={onNewChat} 
              variant="default" 
              size="lg"
              className="bg-white text-blue-800 hover:bg-blue-50"
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Start New Chat
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-blue-700"
            >
              View Tutorial
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeWidget;