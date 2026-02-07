import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface BackupMetadata {
  timestamp: string;
  version: string;
  recordCounts: Record<string, number>;
}

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get current database path
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

  // Copy database file
  fs.copyFileSync(dbPath, backupPath);

  // Get record counts for verification
  const counts = await getRecordCounts();

  // Save metadata
  const metadata: BackupMetadata = {
    timestamp,
    version: await getCurrentMigrationVersion(),
    recordCounts: counts
  };

  fs.writeFileSync(
    path.join(backupDir, `backup-${timestamp}.json`),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`📊 Record counts:`, counts);

  return backupPath;
}

async function getRecordCounts(): Promise<Record<string, number>> {
  const [
    users,
    categories,
    items,
    attributes,
    attributeValues,
    suppliers,
    projects,
    purchaseOrders,
    gatePasses
  ] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.item.count(),
    prisma.attribute.count(),
    prisma.itemAttributeValue.count(),
    prisma.supplier.count(),
    prisma.project.count(),
    prisma.purchaseOrder.count(),
    prisma.billing.count()
  ]);

  return {
    users,
    categories,
    items,
    attributes,
    attributeValues,
    suppliers,
    projects,
    purchaseOrders,
    gatePasses
  };
}

async function getCurrentMigrationVersion(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 1
    `;
    return result[0]?.migration_name || 'unknown';
  } catch {
    return 'no-migrations';
  }
}

async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    if (stderr && !stderr.includes('warnings')) {
      throw new Error(stderr);
    }
    
    console.log(stdout);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function verifyDataIntegrity(preBackupCounts: Record<string, number>): Promise<boolean> {
  const postMigrationCounts = await getRecordCounts();
  
  console.log('\n📊 Data Integrity Check:');
  let isValid = true;

  for (const [table, preCount] of Object.entries(preBackupCounts)) {
    const postCount = postMigrationCounts[table];
    const status = postCount >= preCount ? '✅' : '⚠️';
    
    console.log(`${status} ${table}: ${preCount} → ${postCount}`);
    
    if (postCount < preCount) {
      console.warn(`⚠️ Warning: ${table} lost ${preCount - postCount} records`);
      isValid = false;
    }
  }

  return isValid;
}

async function restoreBackup(backupPath: string): Promise<void> {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
  
  console.log(`🔄 Restoring backup from ${backupPath}...`);
  fs.copyFileSync(backupPath, dbPath);
  console.log('✅ Backup restored successfully');
}

async function main() {
  try {
    console.log('🚀 Starting safe migration process...\n');

    // Step 1: Create backup
    const backupPath = await createBackup();
    const preBackupCounts = await getRecordCounts();

    // Step 2: Run migrations
    await runMigrations();

    // Step 3: Verify data integrity
    const isValid = await verifyDataIntegrity(preBackupCounts);

    if (!isValid) {
      console.log('\n⚠️ Data integrity check failed!');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question('Do you want to restore the backup? (yes/no): ', resolve);
      });

      readline.close();

      if (answer.toLowerCase() === 'yes') {
        await restoreBackup(backupPath);
        process.exit(1);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`💾 Backup saved at: ${backupPath}`);

  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
