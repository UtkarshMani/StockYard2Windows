import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategories() {
  console.log('📋 Checking Categories in Database\n');

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`Found ${categories.length} categories:\n`);
  
  categories.forEach((cat, index) => {
    console.log(`${index + 1}. Name: "${cat.name}"`);
    console.log(`   Description: "${cat.description}"`);
    console.log(`   ID: ${cat.id}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkCategories();
