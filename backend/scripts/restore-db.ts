import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const backupDir = path.join(__dirname, '../backups');
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

async function listBackups(): Promise<string[]> {
  if (!fs.existsSync(backupDir)) {
    console.error('❌ No backup directory found');
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.db'))
    .sort()
    .reverse();

  return files;
}

async function selectBackup(backups: string[]): Promise<string | null> {
  if (backups.length === 0) {
    console.log('❌ No backups found');
    return null;
  }

  console.log('\n📦 Available backups:');
  backups.forEach((backup, index) => {
    const stats = fs.statSync(path.join(backupDir, backup));
    const size = (stats.size / 1024).toFixed(2);
    console.log(`${index + 1}. ${backup} (${size} KB)`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('\nSelect backup number to restore (or 0 to cancel): ', resolve);
  });

  rl.close();

  const selection = parseInt(answer);
  
  if (selection === 0) {
    console.log('❌ Restore cancelled');
    return null;
  }

  if (selection < 1 || selection > backups.length) {
    console.log('❌ Invalid selection');
    return null;
  }

  return backups[selection - 1];
}

async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('\n⚠️  This will overwrite the current database. Continue? (yes/no): ', resolve);
  });

  rl.close();

  return answer.toLowerCase() === 'yes';
}

async function main() {
  try {
    console.log('🔄 Database Restore Utility\n');

    const backups = await listBackups();
    if (backups.length === 0) {
      return;
    }

    const selectedBackup = await selectBackup(backups);
    if (!selectedBackup) {
      return;
    }

    const confirmed = await confirmRestore();
    if (!confirmed) {
      console.log('❌ Restore cancelled');
      return;
    }

    const backupPath = path.join(backupDir, selectedBackup);

    // Create a backup of current database before restoring
    const currentBackupPath = path.join(backupDir, `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, currentBackupPath);
      console.log(`💾 Current database backed up to: ${currentBackupPath}`);
    }

    // Restore the selected backup
    fs.copyFileSync(backupPath, dbPath);
    console.log(`\n✅ Database restored successfully from: ${selectedBackup}`);
    console.log(`📁 Database location: ${dbPath}`);

  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

main();
