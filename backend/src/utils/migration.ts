import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getDataDirectory, getDatabasePath } from '../config/database';
import logger from './logger';

const prisma = new PrismaClient();

/**
 * Run database migrations with automatic backup
 */
export async function runMigrations(): Promise<{ success: boolean; isFirstRun: boolean }> {
  const dbPath = getDatabasePath();
  const dataDir = getDataDirectory();
  const isEmbedded = process.env.EMBEDDED_MODE === 'true';
  
  logger.info(`📂 Data directory: ${dataDir}`);
  logger.info(`💾 Database path: ${dbPath}`);
  logger.info(`🔧 Mode: ${isEmbedded ? 'Embedded (Production)' : 'Development'}`);

  // Check if database exists
  const isFirstRun = !fs.existsSync(dbPath);
  
  if (isFirstRun) {
    logger.info('🆕 First run - creating new database...');
    
    if (isEmbedded) {
      // In production, copy pre-built database from resources
      return await setupProductionDatabase(dbPath);
    }
  } else {
    logger.info('📊 Existing database found');
    
    if (!isEmbedded) {
      // Only backup and migrate in development mode
      await backupDatabase(dbPath);
    }
  }

  try {
    // Ensure DATABASE_URL is set correctly
    process.env.DATABASE_URL = `file:${dbPath}`;
    
    if (!isEmbedded) {
      // Only run Prisma CLI in development mode
      const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
      
      if (fs.existsSync(migrationsDir)) {
        logger.info('Running database migrations...');
        execSync('npx prisma migrate deploy', {
          cwd: path.join(__dirname, '..', '..'),
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'inherit'
        });
      } else {
        // If no migrations folder, just push the schema
        logger.info('Pushing database schema...');
        execSync('npx prisma db push --accept-data-loss', {
          cwd: path.join(__dirname, '..', '..'),
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'inherit'
        });
      }
    } else {
      // In embedded mode, just verify database connection
      logger.info('Verifying database connection...');
      await prisma.$connect();
      await prisma.$disconnect();
    }
    
    logger.info('✅ Database setup completed successfully');
    
    return { success: true, isFirstRun };
  } catch (error) {
    logger.error('❌ Database setup failed:', error);
    
    // Restore backup on failure (only in dev mode)
    if (!isFirstRun && !isEmbedded) {
      await restoreBackup(dbPath);
    }
    
    throw error;
  }
}

/**
 * Setup database for production embedded mode
 */
async function setupProductionDatabase(dbPath: string): Promise<{ success: boolean; isFirstRun: boolean }> {
  try {
    logger.info('📦 Setting up production database...');
    
    // Try to find a pre-built database in resources or create a new one using Prisma Client
    const isPackaged = process.env.EMBEDDED_MODE === 'true';
    let resourcesPath: string;
    
    if (isPackaged && (process as any).resourcesPath) {
      resourcesPath = (process as any).resourcesPath;
    } else {
      resourcesPath = path.join(__dirname, '..', '..');
    }
    
    const seedDbPath = path.join(resourcesPath, 'app.asar.unpacked', 'backend', 'prisma', 'dev.db');
    
    if (fs.existsSync(seedDbPath)) {
      // Copy pre-seeded database
      logger.info(`📋 Copying pre-seeded database from: ${seedDbPath}`);
      fs.copyFileSync(seedDbPath, dbPath);
      logger.info('✅ Database copied successfully');
    } else {
      // Create empty database and run initial setup using Prisma Client
      logger.info('🔨 Creating new database...');
      
      // Set DATABASE_URL for Prisma Client
      process.env.DATABASE_URL = `file:${dbPath}`;
      
      // Push schema to create tables in production
      logger.info('📋 Pushing database schema...');
      const backendDir = isPackaged 
        ? path.join(resourcesPath, 'backend')
        : path.join(__dirname, '..', '..');
      
      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        cwd: backendDir,
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
        stdio: 'pipe' // Capture output to prevent terminal spam
      });
      
      logger.info('✅ Schema created successfully');
      
      // Now connect and seed
      await prisma.$connect();
      
      // Run production seed
      await seedProductionDatabase();
      
      await prisma.$disconnect();
      
      logger.info('✅ Database created and seeded');
    }
    
    return { success: true, isFirstRun: true };
  } catch (error) {
    logger.error('❌ Production database setup failed:', error);
    throw error;
  }
}

/**
 * Seed production database with essential data
 */
async function seedProductionDatabase(): Promise<void> {
  try {
    logger.info('🌱 Seeding production database...');
    
    // Check if admin user exists
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@build.com' }
    });
    
    if (!adminExists) {
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@build.com',
          passwordHash: hashedPassword,
          fullName: 'Administrator',
          role: 'admin',
          isActive: true
        }
      });
      
      logger.info('👤 Admin user created');
    }
    
    // Create default categories if none exist
    const categoryCount = await prisma.category.count();
    
    if (categoryCount === 0) {
      const categories = [
        { name: 'Electrical Supplies', description: 'Electrical equipment and supplies' },
        { name: 'Plumbing Materials', description: 'Plumbing pipes, fittings, and fixtures' },
        { name: 'Construction Tools', description: 'Hand and power tools for construction' },
        { name: 'Building Materials', description: 'Cement, bricks, and other building materials' },
        { name: 'Safety Equipment', description: 'Personal protective equipment and safety gear' },
        { name: 'Hardware', description: 'Nuts, bolts, screws, and other hardware' }
      ];
      
      for (const category of categories) {
        await prisma.category.create({ data: category });
      }
      
      logger.info('📁 Default categories created');
    }
    
    logger.info('✅ Production database seeded successfully');
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    // Don't throw - the app can still work without seeding
  }
}

/**
 * Create a backup of the database
 */
async function backupDatabase(dbPath: string): Promise<void> {
  try {
    const backupPath = `${dbPath}.backup-${Date.now()}`;
    
    // Copy main database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      logger.info(`💾 Backup created: ${backupPath}`);
    }
    
    // Copy journal file if exists
    const journalPath = `${dbPath}-journal`;
    if (fs.existsSync(journalPath)) {
      fs.copyFileSync(journalPath, `${backupPath}-journal`);
    }
    
    // Keep only last 5 backups
    cleanOldBackups(path.dirname(dbPath));
  } catch (error) {
    logger.error('Failed to create backup:', error);
    // Don't throw - backup failure shouldn't stop the migration
  }
}

/**
 * Restore database from the latest backup
 */
async function restoreBackup(dbPath: string): Promise<void> {
  try {
    const dataDir = path.dirname(dbPath);
    const backups = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('inventory.db.backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 0) {
      const latestBackup = path.join(dataDir, backups[0]);
      
      // Restore main database
      fs.copyFileSync(latestBackup, dbPath);
      logger.info(`♻️ Database restored from backup: ${latestBackup}`);
      
      // Restore journal if exists
      const backupJournal = `${latestBackup}-journal`;
      if (fs.existsSync(backupJournal)) {
        fs.copyFileSync(backupJournal, `${dbPath}-journal`);
      }
    } else {
      logger.warn('No backups found to restore');
    }
  } catch (error) {
    logger.error('Failed to restore backup:', error);
    throw error;
  }
}

/**
 * Clean up old backups, keeping only the 5 most recent
 */
function cleanOldBackups(dataDir: string): void {
  try {
    const backups = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('inventory.db.backup-'))
      .sort()
      .reverse();
    
    // Keep only 5 most recent backups
    backups.slice(5).forEach(backup => {
      const backupPath = path.join(dataDir, backup);
      fs.unlinkSync(backupPath);
      
      // Remove journal file if exists
      const journalPath = `${backupPath}-journal`;
      if (fs.existsSync(journalPath)) {
        fs.unlinkSync(journalPath);
      }
      
      logger.info(`🗑️ Removed old backup: ${backup}`);
    });
  } catch (error) {
    logger.error('Failed to clean old backups:', error);
    // Don't throw - cleanup failure shouldn't stop anything
  }
}

/**
 * Export backup functionality for manual backups
 */
export async function createManualBackup(): Promise<string> {
  const dbPath = getDatabasePath();
  const backupPath = `${dbPath}.manual-backup-${Date.now()}`;
  
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`📦 Manual backup created: ${backupPath}`);
    return backupPath;
  }
  
  throw new Error('Database file not found');
}

/**
 * Verify database integrity
 */
export async function verifyDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`PRAGMA integrity_check`;
    logger.info('✅ Database integrity check passed');
    return true;
  } catch (error) {
    logger.error('❌ Database integrity check failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}
