const { clearDatabase } = require('./clear-db');
const { seedDatabase } = require('./seed-db');

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database (clear + seed)...\n');
    
    await clearDatabase();
    console.log('');
    await seedDatabase();
    
    console.log('\n🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('\n✨ Reset database script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Reset database script failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
