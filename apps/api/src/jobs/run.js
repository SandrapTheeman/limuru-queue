const { Pool } = require('pg');
const JobScheduler = require('./scheduler');
const { 
  recordWaitTimeStats, 
  sendDailyReport, 
  cleanOldQueueEntries, 
  updatePredictions,
  systemHealthCheck 
} = require('./index');
const { EmailService } = require('../services/email');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hospital_queue',
  user: process.env.DB_USER || 'hospital_queue',
  password: process.env.DB_PASSWORD
});

const emailService = new EmailService();
const scheduler = new JobScheduler(pool);

// Schedule jobs
// Every hour: Record wait time stats
scheduler.schedule('wait-time-stats', '0 * * * *', () => recordWaitTimeStats(pool));

// Every day at 8 AM: Send daily report
scheduler.schedule('daily-report', '0 8 * * *', () => sendDailyReport(pool, emailService));

// Every day at midnight: Clean old entries
scheduler.schedule('clean-old-entries', '0 0 * * *', () => cleanOldQueueEntries(pool));

// Every 15 minutes: Update predictions
scheduler.schedule('update-predictions', '*/15 * * * *', () => updatePredictions(pool));

// Every 5 minutes: Health check
scheduler.schedule('health-check', '*/5 * * * *', () => systemHealthCheck(pool));

// Start scheduler
scheduler.start();
console.log('Job scheduler started');

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Stopping job scheduler...');
  scheduler.stop();
  pool.end();
  process.exit(0);
});
