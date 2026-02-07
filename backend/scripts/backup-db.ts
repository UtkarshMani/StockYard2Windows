import * as fs from 'fs';
import * as path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '../backups');
const backupPath = path.join(backupDir, `manual-backup-${timestamp}.db`);
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found: ${dbPath}`);
  process.exit(1);
}

fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Manual backup created: ${backupPath}`);
console.log(`📁 Original database: ${dbPath}`);
console.log(`💾 Backup location: ${backupPath}`);
