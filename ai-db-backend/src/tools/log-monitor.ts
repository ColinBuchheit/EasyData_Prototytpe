// src/tools/log-monitor.ts
import fs from 'fs';
import path from 'path';

// Path to log directory
const LOG_DIR = path.join(process.cwd(), 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`Created logs directory at ${LOG_DIR}`);
}

// Monitor logger configurations
console.log('Checking logger configurations...');

// Check for Winston transports
try {
  const loggerPath = require.resolve('../config/logger');
  console.log(`Logger module found at: ${loggerPath}`);
  
  const logger = require(loggerPath).default;
  
  if (logger && logger.transports) {
    console.log(`Found ${logger.transports.length} transports in logger`);
    logger.transports.forEach((transport: any, index: number) => {
      console.log(`- Transport ${index + 1}: ${transport.name} (level: ${transport.level || 'default'})`);
    });
  } else {
    console.log('Logger transports not found or accessible');
  }
} catch (error) {
  console.error(`Error inspecting logger: ${(error as Error).message}`);
}

console.log('\nChecking log files...');
// List existing log files
try {
  const logFiles = fs.readdirSync(LOG_DIR);
  if (logFiles.length === 0) {
    console.log('No log files found');
  } else {
    console.log('Log files:');
    logFiles.forEach(file => {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB, last modified: ${stats.mtime})`);
      
      // Show last few lines of log files
      if (stats.size > 0 && file.endsWith('.log')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const lastLines = lines.slice(-5);
        console.log('  Last 5 log entries:');
        lastLines.forEach(line => console.log(`  > ${line}`));
      }
    });
  }
} catch (error) {
  console.error(`Error checking log files: ${(error as Error).message}`);
}

console.log('\nLog monitor completed');