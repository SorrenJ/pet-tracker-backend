require('dotenv').config();
const { pool } = require('../config/database');

async function run() {
  try {
    console.log('Running migration: add google_id to users');

    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;");
    console.log('Ensured column google_id exists');

    await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id);");
    console.log('Ensured unique index on google_id');

    // Make password_hash nullable if it exists
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;");
      console.log('Made password_hash nullable');
    } catch (err) {
      console.warn('Could not alter password_hash nullability (may not exist or already nullable):', err.message);
    }

    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
