const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupProduction() {
  try {
    console.log('Setting up production database...');
    
    // Run migrations
    console.log('Running database migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('Production database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up production database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupProduction();
