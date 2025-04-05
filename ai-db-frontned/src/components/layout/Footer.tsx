// src/components/layout/Footer.tsx

import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} AI Database | All rights reserved
        </div>
        <div className="mt-2 md:mt-0 text-sm text-gray-500 dark:text-gray-400">
          <a href="#" className="hover:text-blue-500 dark:hover:text-blue-400">Privacy Policy</a>
          <span className="mx-2">|</span>
          <a href="#" className="hover:text-blue-500 dark:hover:text-blue-400">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;