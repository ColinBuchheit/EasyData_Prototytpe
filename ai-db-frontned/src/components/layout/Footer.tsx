// src/components/layout/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ExternalLink, MessageSquare, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 py-4 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="text-sm">maiquery</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full">v0.1.4</span>
          </div>
          
          {/* Center */}
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span>Powered by</span>
            <span className="font-medium text-zinc-400">GPT-4</span>
            <span>+</span>
            <span className="font-medium text-zinc-400">CrewAI</span>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/ColinBuchheit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
            
            <Link 
              to="/docs" 
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="Documentation"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            
            <a 
              href="https://discord.gg/your-server" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="Discord Community"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
            
            <button
              onClick={() => window.open('https://www.buymeacoffee.com/your-username', '_blank')}
              className="text-zinc-400 hover:text-zinc-300 transition-colors"
              aria-label="Support Project"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Bottom copyright */}
        <div className="mt-4 pt-4 border-t border-zinc-800/50 text-center text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} maiquery. All rights reserved.</p>
          <div className="mt-1 flex items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;