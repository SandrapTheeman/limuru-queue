// Rollback last migration
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hospital_queue',
  user: process.env.DB_USER || 'hospital_queue',
  password: process.env.DB_PASSWORD
});

async function rollback() {
  const result = await pool.query(
    'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
  );
  
  if (result.rows.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const lastMigration = result.rows[0].name;
  console.log(`Rolling back: ${lastMigration}`);
  
  // In production, implement proper down() functions for each migration
  await pool.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
  console.log('Rollback complete. Note: Manual schema changes may be needed.');
  
  await pool.end();
}

if (require.main === module) {
  rollback()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { rollback };
