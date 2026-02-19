import { PrismaClient } from '@prisma/client';
import { execSync, spawnSync } from 'child_process';
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
    
    // Backup before any migration (both dev and production)
    await backupDatabase(dbPath);
  }

  try {
    // Ensure DATABASE_URL is set correctly
    process.env.DATABASE_URL = `file:${dbPath}`;
    
    // Resolve backend directory for both dev and production
    let backendDir: string;
    if (isEmbedded && (process as any).resourcesPath) {
      backendDir = path.join((process as any).resourcesPath, 'backend');
    } else {
      backendDir = path.join(__dirname, '..', '..');
    }

    const migrationsDir = path.join(backendDir, 'prisma', 'migrations');

    if (fs.existsSync(migrationsDir)) {
      // Check if database needs baselining (existing DB created with db push, no migration history)
      if (!isFirstRun) {
        await baselineIfNeeded(dbPath, backendDir);
      }

      logger.info('Running database migrations...');

      if (isEmbedded) {
        // In production: use spawnSync with explicit node + prisma paths
        const nodeExecutable = process.argv[0] || 'node';
        const prismaCliJs = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');

        let migrateResult: ReturnType<typeof spawnSync>;
        if (fs.existsSync(prismaCliJs)) {
          logger.info(`Using Prisma CLI at: ${prismaCliJs}`);
          migrateResult = spawnSync(nodeExecutable, [prismaCliJs, 'migrate', 'deploy'], {
            cwd: backendDir,
            env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
            stdio: 'pipe'
          });
        } else {
          // Fallback: use shell
          const shell = fs.existsSync('/usr/bin/bash') ? '/usr/bin/bash' :
                         fs.existsSync('/bin/bash') ? '/bin/bash' :
                         fs.existsSync('/usr/bin/sh') ? '/usr/bin/sh' : '/bin/sh';
          migrateResult = spawnSync(shell, ['-c', 'npx prisma migrate deploy'], {
            cwd: backendDir,
            env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
            stdio: 'pipe'
          });
        }

        const stdout = migrateResult.stdout?.toString() || '';
        const stderr = migrateResult.stderr?.toString() || '';
        if (stdout) logger.info(`[migrate] ${stdout.trim()}`);
        if (stderr) logger.warn(`[migrate stderr] ${stderr.trim()}`);

        if (migrateResult.status !== 0) {
          logger.error(`Prisma migrate deploy failed (exit ${migrateResult.status})`);
          throw new Error(`Prisma migrate deploy failed: ${stderr || stdout}`);
        }
      } else {
        // In development: use execSync (npx is on PATH)
        execSync('npx prisma migrate deploy', {
          cwd: backendDir,
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'inherit'
        });
      }
    } else if (!isEmbedded) {
      // No migrations folder — only push schema in dev mode
      logger.info('Pushing database schema...');
      execSync('npx prisma db push --accept-data-loss', {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
        stdio: 'inherit'
      });
    } else {
      // Embedded mode with no migrations folder — verify connection only
      logger.info('No migrations found, verifying database connection...');
      await prisma.$connect();
      await prisma.$disconnect();
    }
    
    // Always ensure admin user exists (handles cases where previous setup failed mid-seed)
    try {
      await prisma.$connect();
      await seedProductionDatabase();
      await prisma.$disconnect();
    } catch (seedError) {
      logger.warn('⚠️ Post-migration seed check failed (non-fatal):', seedError);
      try { await prisma.$disconnect(); } catch {}
    }

    logger.info('✅ Database setup completed successfully');
    
    return { success: true, isFirstRun };
  } catch (error) {
    logger.error('❌ Database setup failed:', error);
    
    // Restore backup on failure
    if (!isFirstRun) {
      await restoreBackup(dbPath);
    }
    
    throw error;
  }
}

/**
 * Baseline an existing database that was created with `db push` (no migration history).
 * Creates the _prisma_migrations table and marks all existing migrations as already applied.
 * This allows future `migrate deploy` calls to work correctly on updates.
 */
async function baselineIfNeeded(dbPath: string, backendDir: string): Promise<void> {
  try {
    // Check if _prisma_migrations table exists
    const result = await prisma.$queryRawUnsafe<any[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'`
    );

    if (result.length > 0) {
      logger.info('Migration history exists, no baselining needed');
      return;
    }

    logger.info('⚠️ Database has no migration history — baselining existing database...');

    // Create the _prisma_migrations table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Read all migration directories and mark them as applied
    const migrationsDir = path.join(backendDir, 'prisma', 'migrations');
    const migrationDirs = fs.readdirSync(migrationsDir)
      .filter(f => {
        const fullPath = path.join(migrationsDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'migration_lock.toml';
      })
      .sort();

    for (const migrationName of migrationDirs) {
      // Read migration SQL to compute a simple checksum
      const sqlPath = path.join(migrationsDir, migrationName, 'migration.sql');
      let checksum = '0000000000000000';
      if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf8');
        // Simple hash — sum of char codes mod hex
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
        }
        checksum = Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
      }

      const id = require('crypto').randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "started_at", "applied_steps_count")
         VALUES (?, ?, ?, ?, ?, 1)`,
        id, checksum, migrationName, now, now
      );

      logger.info(`  ✓ Baselined: ${migrationName}`);
    }

    logger.info(`✅ Baselined ${migrationDirs.length} migrations`);
  } catch (error) {
    logger.error('Baselining failed:', error);
    // Don't throw — let migrate deploy try anyway; it may still work
  } finally {
    // Disconnect so migrate deploy can get an exclusive lock
    await prisma.$disconnect();
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
    // Resolve backend directory (works in both Electron and standalone node)
    let backendDir: string;
    if (isPackaged && (process as any).resourcesPath) {
      backendDir = path.join((process as any).resourcesPath, 'backend');
    } else {
      // __dirname is backend/dist/utils/, so go up 2 levels to get backend/
      backendDir = path.join(__dirname, '..', '..');
    }

    const seedDbPath = path.join(backendDir, 'prisma', 'dev.db');
    
    if (fs.existsSync(seedDbPath)) {
      // Copy pre-seeded database
      logger.info(`📋 Copying pre-seeded database from: ${seedDbPath}`);
      fs.copyFileSync(seedDbPath, dbPath);
      logger.info('✅ Database copied successfully');
    } else {
      // Create empty database and run initial setup using migrations
      logger.info('🔨 Creating new database...');
      
      // Set DATABASE_URL for Prisma Client
      process.env.DATABASE_URL = `file:${dbPath}`;
      
      // Run migrations to create tables (preserves migration history for future updates)
      logger.info('📋 Running initial database migrations...');
      
      // Find node executable for spawning prisma CLI
      const nodeExecutable = process.argv[0] || 'node';

      // Use spawnSync with explicit node and prisma paths to avoid shell issues
      const prismaCliJs = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
      const migrationsDir = path.join(backendDir, 'prisma', 'migrations');
      
      let pushResult: ReturnType<typeof spawnSync>;

      // Prefer migrate deploy if migrations exist (tracks migration history)
      if (fs.existsSync(migrationsDir) && fs.existsSync(prismaCliJs)) {
        logger.info(`Using Prisma CLI at: ${prismaCliJs}`);
        pushResult = spawnSync(nodeExecutable, [prismaCliJs, 'migrate', 'deploy'], {
          cwd: backendDir,
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'pipe'
        });
      } else if (fs.existsSync(prismaCliJs)) {
        logger.info(`Using Prisma CLI at: ${prismaCliJs} (db push fallback)`);
        pushResult = spawnSync(nodeExecutable, [prismaCliJs, 'db', 'push', '--accept-data-loss', '--skip-generate'], {
          cwd: backendDir,
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'pipe'
        });
      } else {
        // Approach 2: Use npx with explicit shell
        logger.info('Falling back to npx...');
        const shell = fs.existsSync('/usr/bin/bash') ? '/usr/bin/bash' : 
                       fs.existsSync('/bin/bash') ? '/bin/bash' :
                       fs.existsSync('/usr/bin/sh') ? '/usr/bin/sh' : '/bin/sh';
        pushResult = spawnSync(shell, ['-c', 'npx prisma db push --accept-data-loss --skip-generate'], {
          cwd: backendDir,
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'pipe'
        });
      }
      
      if (pushResult.status !== 0) {
        const stderr = pushResult.stderr?.toString() || '';
        const stdout = pushResult.stdout?.toString() || '';
        logger.error(`Prisma db push failed (exit ${pushResult.status}): ${stderr} ${stdout}`);
        throw new Error(`Prisma db push failed: ${stderr || stdout}`);
      }
      
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
      where: { email: 'project@primeinfraa.com' }
    });
    
    if (!adminExists) {
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Xtrim@Q6', 10);
      
      await prisma.user.create({
        data: {
          email: 'project@primeinfraa.com',
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
