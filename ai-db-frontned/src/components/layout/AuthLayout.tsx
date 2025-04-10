// src/components/layout/AuthLayout.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Database, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">maiquery</h1>
              <p className="text-blue-400 text-sm">AI-Powered Database Chat</p>
            </div>
          </div>
        </motion.div>
        
        {/* Main Content */}
        {children}
        
        {/* Footer */}
        <motion.div 
          className="mt-8 text-center text-zinc-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> 
            Powered by AI Database Technology
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;