const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      name TEXT NOT NULL,
      distance_unit TEXT NOT NULL DEFAULT 'km',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      weight REAL,
      weight_unit TEXT NOT NULL DEFAULT 'kg',
      birth_date TEXT,
      photo TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_type TEXT NOT NULL,
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      cost REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_reminders (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      time TEXT NOT NULL,
      days TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_budgets (
      id TEXT PRIMARY KEY,
      pet_id TEXT UNIQUE NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      monthly_budget REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT '$'
    );

    CREATE TABLE IF NOT EXISTS exercise_sessions (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      steps INTEGER,
      distance_km REAL,
      duration_minutes INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS exercise_reminders (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      time TEXT NOT NULL,
      days TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS health_documents (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_name TEXT,
      notes TEXT,
      amount REAL,
      created_at TEXT NOT NULL
    );
  `);
}

module.exports = { pool, initSchema };
