import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Determine data directory based on OS
 * This ensures user data persists across app updates
 */
export function getDataDirectory(): string {
  const platform = os.platform();
  let dataDir: string;

  // Check if running in Electron (data dir set by electron-main)
  if (process.env.USER_DATA_DIR) {
    dataDir = process.env.USER_DATA_DIR;
  } else if (platform === 'win32') {
    // Windows: C:\Users\Username\AppData\Roaming\InventoryManagement
    dataDir = path.join(process.env.APPDATA || '', 'InventoryManagement');
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/InventoryManagement
    dataDir = path.join(os.homedir(), 'Library', 'Application Support', 'InventoryManagement');
  } else {
    // Linux: ~/.local/share/inventory-management-system
    dataDir = path.join(os.homedir(), '.local', 'share', 'inventory-management-system');
  }

  // Create directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Created data directory: ${dataDir}`);
  }

  return dataDir;
}

/**
 * Get the database file path
 */
export function getDatabasePath(): string {
  // Use DATABASE_URL if provided (for development or custom setups)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL.replace('file:', '');
  }

  const dataDir = getDataDirectory();
  return path.join(dataDir, 'inventory.db');
}

/**
 * Initialize Prisma Client with proper database path
 */
const databaseUrl = `file:${getDatabasePath()}`;
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

logger.info(`Database path: ${getDatabasePath()}`);

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
});

export default prisma;
