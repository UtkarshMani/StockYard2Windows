import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Use LOG_PATH environment variable, or fallback to writable locations
function getLogDir(): string {
  if (process.env.LOG_PATH) return process.env.LOG_PATH;
  
  // In production/embedded mode, use a writable user directory
  if (process.env.EMBEDDED_MODE === 'true' || process.env.NODE_ENV === 'production') {
    return path.join(os.homedir(), '.local', 'share', 'inventory-management-system', 'logs');
  }
  
  return 'logs';
}

const logDir = getLogDir();
let logDirWritable = false;

// Ensure log directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logDirWritable = true;
} catch (error) {
  console.error('Failed to create log directory:', error);
}

// Build transports array - always include console for embedded mode
const transports: winston.transport[] = [];

// Add file transports only if log directory is writable
if (logDirWritable) {
  transports.push(
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
  );
}

// Always add console transport (Electron captures stdout/stderr)
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'inventory-api' },
  transports,
});

export default logger;
