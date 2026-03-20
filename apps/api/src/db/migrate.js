const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const logger = pino({ level: 'info' });

// Database configuration from environment
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hospital_queue',
  user: process.env.DB_USER || 'hospital_queue',
  password: process.env.DB_PASSWORD
});

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations() {
  const result = await pool.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(r => r.name);
}

async function runMigrations() {
  await ensureMigrationsTable();
  
  const executed = await getExecutedMigrations();
  const migrationsDir = path.join(__dirname, 'migrations');
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  let migrationsRun = 0;
  
  for (const file of migrationFiles) {
    if (executed.includes(file)) {
      logger.info(`Skipping ${file} (already executed)`);
      continue;
    }
    
    logger.info(`Running migration: ${file}`);
    
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info(`Completed: ${file}`);
      migrationsRun++;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ msg: `Failed: ${file}`, error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }
  
  if (migrationsRun === 0) {
    logger.info('No new migrations to run');
  } else {
    logger.info(`${migrationsRun} migration(s) completed`);
  }
  
  await pool.end();
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations, ensureMigrationsTable };
