import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const DB_PATH = path.join(__dirname, '../prisma/dev.db');
const BACKUP_PATH = path.join(__dirname, '../prisma/backups');

async function main() {
  console.log('🧹 Starting production database cleanup...\n');

  try {
    // Step 1: Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
      console.log('✓ Created backup directory');
    }

    // Step 2: Backup current database
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_PATH, `pre-cleanup-${timestamp}.db`);
    
    if (fs.existsSync(DB_PATH)) {
      console.log('📦 Creating backup of current database...');
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`✓ Backup created: ${backupFile}\n`);
    } else {
      console.log('ℹ️  No existing database found\n');
    }

    // Step 3: Close Prisma connection
    await prisma.$disconnect();
    console.log('✓ Disconnected from database');

    // Step 4: Delete old database
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('✓ Removed old database\n');
    }

    // Step 5: Run migrations to create fresh schema
    console.log('🔄 Running migrations to create fresh schema...');
    await execAsync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });
    console.log('✓ Migrations completed successfully\n');

    // Step 6: Reconnect to new database
    const newPrisma = new PrismaClient();

    // Step 7: Create production admin user
    console.log('👤 Creating production admin user...');
    const adminPasswordHash = await bcrypt.hash('Xtrim@Q6', 12);
    const admin = await newPrisma.user.create({
      data: {
        email: 'project@primeinfraa.com',
        passwordHash: adminPasswordHash,
        fullName: 'System Administrator',
        role: 'admin',
        phone: '+1234567890',
        isActive: true,
      },
    });

    // Create full permissions for admin
    const resources = [
      'inventory',
      'projects',
      'gatepass',
      'purchase_orders',
      'suppliers',
      'users',
      'analytics',
      'settings'
    ];

    for (const resource of resources) {
      await newPrisma.userPermission.create({
        data: {
          userId: admin.id,
          resource,
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
      });
    }

    console.log('✓ Admin user created:', admin.email);
    console.log('  Email: project@primeinfraa.com');
    console.log('  Password: Xtrim@Q6');
    console.log('  ⚠️  IMPORTANT: Change this password after first login!\n');

    // Step 8: Create default categories
    console.log('📁 Creating default categories...');
    const categories = [
      { name: 'General', description: 'General inventory items' },
      { name: 'Electrical', description: 'Electrical equipment and supplies' },
      { name: 'Plumbing', description: 'Plumbing materials and fittings' },
      { name: 'Construction', description: 'Building and construction materials' },
      { name: 'Tools', description: 'Hand tools and power tools' },
      { name: 'Safety', description: 'Safety equipment and wearables' },
    ];

    for (const category of categories) {
      await newPrisma.category.create({
        data: category,
      });
    }
    console.log(`✓ Created ${categories.length} default categories\n`);

    await newPrisma.$disconnect();

    // Step 9: Summary
    console.log('✅ Production cleanup completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  • Fresh database created');
    console.log('  • Admin user configured');
    console.log('  • Default categories added');
    console.log('  • Ready for production deployment');
    console.log('\n🚀 The application is now ready to be packaged as installable software.');
    console.log('\n⚠️  Next Steps:');
    console.log('  1. Test the application thoroughly');
    console.log('  2. Change default admin password');
    console.log('  3. Build the desktop application');
    console.log('  4. Create installer package');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
