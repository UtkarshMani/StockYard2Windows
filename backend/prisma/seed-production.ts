import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...\n');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@build.com' },
    update: {},
    create: {
      email: 'admin@build.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      role: 'admin',
      phone: '+1234567890',
      isActive: true,
    },
  });
  console.log('✓ Admin user created:', admin.email);

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
    await prisma.userPermission.upsert({
      where: {
        userId_resource: {
          userId: admin.id,
          resource,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        resource,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      },
    });
  }
  console.log('✓ Admin permissions configured\n');

  // Create default categories
  const categories = [
    { name: 'General', description: 'General inventory items' },
    { name: 'Electrical', description: 'Electrical equipment and supplies' },
    { name: 'Plumbing', description: 'Plumbing materials and fittings' },
    { name: 'Construction', description: 'Building and construction materials' },
    { name: 'Tools', description: 'Hand tools and power tools' },
    { name: 'Safety', description: 'Safety equipment and wearables' },
  ];

  for (const category of categories) {
    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: { name: category.name },
    });

    if (!existing) {
      await prisma.category.create({
        data: category,
      });
    }
  }
  console.log(`✓ Created ${categories.length} default categories\n`);

  console.log('✅ Production database seeded successfully!');
  console.log('\n📝 Default Admin Credentials:');
  console.log('   Email: admin@build.com');
  console.log('   Password: admin123');
  console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
