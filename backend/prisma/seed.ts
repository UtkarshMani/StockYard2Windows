import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@build.com' },
    update: {},
    create: {
      email: 'admin@build.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      role: 'admin',
      phone: '+1234567890',
    },
  });
  console.log('✓ Admin user created:', admin.email);

  // Create warehouse staff user
  const warehousePasswordHash = await bcrypt.hash('warehouse123', 12);
  const warehouse = await prisma.user.upsert({
    where: { email: 'warehouse@example.com' },
    update: {},
    create: {
      email: 'warehouse@example.com',
      passwordHash: warehousePasswordHash,
      fullName: 'Warehouse Manager',
      role: 'warehouse_staff',
      phone: '+1234567891',
    },
  });
  console.log('✓ Warehouse user created:', warehouse.email);

  // Create billing staff user
  const billingPasswordHash = await bcrypt.hash('billing123', 12);
  const billing = await prisma.user.upsert({
    where: { email: 'billing@example.com' },
    update: {},
    create: {
      email: 'billing@example.com',
      passwordHash: billingPasswordHash,
      fullName: 'Billing Manager',
      role: 'billing_staff',
      phone: '+1234567892',
    },
  });
  console.log('✓ Billing user created:', billing.email);

  // Create project manager user
  const pmPasswordHash = await bcrypt.hash('project123', 12);
  const projectManager = await prisma.user.upsert({
    where: { email: 'project@example.com' },
    update: {},
    create: {
      email: 'project@example.com',
      passwordHash: pmPasswordHash,
      fullName: 'Project Manager',
      role: 'project_manager',
      phone: '+1234567893',
    },
  });
  console.log('✓ Project Manager user created:', projectManager.email);

  // Create sample categories
  const electricalCategory = await prisma.category.upsert({
    where: { id: '1' },
    update: {},
    create: {
      name: 'Electrical',
      description: 'Electrical equipment and supplies',
    },
  });
  console.log('✓ Electrical category created');

  const constructionCategory = await prisma.category.upsert({
    where: { id: '2' },
    update: {},
    create: {
      name: 'Construction Materials',
      description: 'Building and construction materials',
    },
  });
  console.log('✓ Construction category created');

  const toolsCategory = await prisma.category.upsert({
    where: { id: '3' },
    update: {},
    create: {
      name: 'Tools',
      description: 'Hand tools and power tools',
    },
  });
  console.log('✓ Tools category created');

  const safetyWearablesCategory = await prisma.category.upsert({
    where: { id: '4' },
    update: {},
    create: {
      name: 'Safety Wearables',
      description: 'Personal protective equipment and safety gear',
    },
  });
  console.log('✓ Safety Wearables category created');

  // Create attributes for Electrical category
  try {
    await prisma.attribute.createMany({
      data: [
        {
          categoryId: electricalCategory.id,
          name: 'voltage',
          label: 'Voltage (V)',
          inputType: 'number',
          required: true,
          validationRules: JSON.stringify({ min: 0, max: 1000 }),
          helpText: 'Operating voltage in volts',
          displayOrder: 1,
        },
        {
          categoryId: electricalCategory.id,
          name: 'wattage',
          label: 'Wattage (W)',
          inputType: 'number',
          required: false,
          validationRules: JSON.stringify({ min: 0 }),
          helpText: 'Power consumption in watts',
          displayOrder: 2,
        },
        {
          categoryId: electricalCategory.id,
          name: 'wire_type',
          label: 'Wire Type',
          inputType: 'dropdown',
          required: false,
          options: JSON.stringify(['Copper', 'Aluminum', 'Fiber Optic', 'Mixed']),
          displayOrder: 3,
        },
        {
          categoryId: electricalCategory.id,
          name: 'certification',
          label: 'Certification',
          inputType: 'text',
          required: false,
          helpText: 'e.g., UL, CE, CSA',
          displayOrder: 4,
        },
      ],
    });
    console.log('✓ Electrical attributes created');
  } catch (e: any) {
    if (e.code !== 'P2002') throw e;
    console.log('✓ Electrical attributes already exist');
  }

  // Create attributes for Construction Materials category
  // First, delete old attributes to allow recreation with new schema
  await prisma.attribute.deleteMany({
    where: { categoryId: constructionCategory.id },
  });
  
  await prisma.attribute.createMany({
    data: [
      {
        categoryId: constructionCategory.id,
        name: 'material_type',
        label: 'Material Type',
        inputType: 'dropdown',
        required: true,
        options: JSON.stringify(['Brass', 'CPVC', 'GI', 'MS', 'PVC', 'PPR', 'SS', 'UPVC']),
        displayOrder: 1,
      },
      {
        categoryId: constructionCategory.id,
        name: 'threading',
        label: 'Threading',
        inputType: 'dropdown',
        required: false,
        options: JSON.stringify(['Threaded', 'Not Threaded']),
        helpText: 'For MS, SS, GI, Brass materials only',
        displayOrder: 2,
      },
      {
        categoryId: constructionCategory.id,
        name: 'grade',
        label: 'Grade/Quality',
        inputType: 'text',
        required: false,
        helpText: 'e.g., Grade A, Premium, Standard',
        displayOrder: 3,
      },
      {
        categoryId: constructionCategory.id,
        name: 'dimensions',
        label: 'Dimensions',
        inputType: 'text',
        required: false,
        helpText: 'Length x Width x Height',
        displayOrder: 4,
      },
      {
        categoryId: constructionCategory.id,
        name: 'weight_per_unit',
        label: 'Weight per Unit (kg)',
        inputType: 'number',
        required: false,
        validationRules: JSON.stringify({ min: 0 }),
        displayOrder: 5,
      },
    ],
  });
  console.log('✓ Construction Materials attributes created');

  // Create attributes for Tools category
  try {
    await prisma.attribute.createMany({
      data: [
        {
          categoryId: toolsCategory.id,
          name: 'tool_type',
          label: 'Tool Type',
          inputType: 'dropdown',
          required: true,
          options: JSON.stringify(['Hand Tool', 'Power Tool', 'Measuring Tool', 'Cutting Tool', 'Other']),
          displayOrder: 1,
        },
        {
          categoryId: toolsCategory.id,
          name: 'power_source',
          label: 'Power Source',
          inputType: 'dropdown',
          required: false,
          options: JSON.stringify(['Manual', 'Electric', 'Battery', 'Pneumatic', 'Hydraulic']),
          displayOrder: 2,
        },
        {
          categoryId: toolsCategory.id,
          name: 'warranty_months',
          label: 'Warranty (Months)',
          inputType: 'number',
          required: false,
          validationRules: JSON.stringify({ min: 0, max: 120 }),
          displayOrder: 3,
        },
      ],
    });
    console.log('✓ Tools attributes created');
  } catch (e: any) {
    if (e.code !== 'P2002') throw e;
    console.log('✓ Tools attributes already exist');
  }

  // Create attributes for Safety Wearables category
  try {
    await prisma.attribute.createMany({
      data: [
        {
          categoryId: safetyWearablesCategory.id,
          name: 'ppe_type',
          label: 'PPE Type',
          inputType: 'dropdown',
          required: true,
          options: JSON.stringify(['Helmet', 'Gloves', 'Goggles', 'Vest', 'Boots', 'Mask', 'Harness', 'Other']),
          displayOrder: 1,
        },
        {
          categoryId: safetyWearablesCategory.id,
          name: 'safety_standard',
          label: 'Safety Standard',
          inputType: 'text',
          required: false,
          helpText: 'e.g., ANSI Z87.1, EN 397',
          displayOrder: 2,
        },
        {
          categoryId: safetyWearablesCategory.id,
          name: 'expiry_date',
          label: 'Expiry Date',
          inputType: 'date',
          required: false,
          helpText: 'For items with limited lifespan',
          displayOrder: 3,
        },
      ],
    });
    console.log('✓ Safety Wearables attributes created');
  } catch (e: any) {
    if (e.code !== 'P2002') throw e;
    console.log('✓ Safety Wearables attributes already exist');
  }

  // Create sample supplier
  const supplier = await prisma.supplier.upsert({
    where: { id: '1' },
    update: {},
    create: {
      name: 'ABC Electrical Supplies',
      supplierCode: 'SUP-2026-00001',
      email: 'contact@abcelectrical.com',
      phone: '+1234567894',
      address: '123 Industrial Ave, New York, NY 10001, USA',
      contactPerson: 'John Smith',
      paymentTerms: 'Net 30',
    },
  });
  console.log('✓ Sample supplier created');

  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📝 Default Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:           admin@example.com / admin123');
  console.log('Warehouse Staff: warehouse@example.com / warehouse123');
  console.log('Billing Staff:   billing@example.com / billing123');
  console.log('Project Manager: project@example.com / project123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
