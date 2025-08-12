const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...');

    // Delete in the correct order to respect foreign key constraints
    await prisma.message.deleteMany({});
    console.log('✅ Cleared messages');

    await prisma.groupMember.deleteMany({});
    console.log('✅ Cleared group members');

    await prisma.group.deleteMany({});
    console.log('✅ Cleared groups');

    await prisma.friendship.deleteMany({});
    console.log('✅ Cleared friendships');

    await prisma.user.deleteMany({});
    console.log('✅ Cleared users');

    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearDatabase()
    .then(() => {
      console.log('✨ Clear database script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Clear database script failed:', error);
      process.exit(1);
    });
}

module.exports = { clearDatabase };
