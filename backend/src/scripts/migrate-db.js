require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

async function migrateDatabase() {
  const dataDir = path.join(__dirname, '../../data');
  fs.mkdirSync(dataDir, { recursive: true });

  console.log('Running database migrations...');
  const [batch, migrations] = await db.migrate.latest();
  console.log(`Database migrations complete (batch ${batch}, ${migrations.length} applied).`);
}

migrateDatabase()
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
