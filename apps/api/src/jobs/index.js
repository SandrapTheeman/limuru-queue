const JobScheduler = require('./scheduler');

// Job: Record wait time statistics
async function recordWaitTimeStats(pool) {
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();
  const hourOfDay = new Date().getHours();
  
  // Get stats by department
  const stats = await pool.query(`
    SELECT 
      department_id,
      COUNT(*) as patient_count,
      AVG(wait_time) as avg_wait
    FROM queue
    WHERE DATE(created_at) = $1 AND status = 'completed'
    GROUP BY department_id
  `, [today]);
  
  // Insert into history
  for (const stat of stats.rows) {
    await pool.query(`
      INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
      VALUES ($1, $2, $3, $4, $5)
    `, [stat.department_id, dayOfWeek, hourOfDay, Math.round(parseFloat(stat.avg_wait) || 0), parseInt(stat.patient_count)]);
  }
  
  console.log(`Recorded wait time stats for ${stats.rows.length} departments`);
}

// Job: Send daily report to admin
async function sendDailyReport(pool, emailService) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const stats = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
      AVG(wait_time) FILTER (WHERE status = 'completed') as avg_wait
    FROM queue
    WHERE DATE(created_at) = $1
  `, [yesterday]);
  
  const departmentStats = await pool.query(`
    SELECT d.name, COUNT(q.id) as patients
    FROM departments d
    LEFT JOIN queue q ON d.id = q.department_id AND DATE(q.created_at) = $1
    GROUP BY d.id, d.name
  `, [yesterday]);
  
  // Get admin email
  const admin = await pool.query(`
    SELECT email FROM users WHERE role = 'admin' LIMIT 1
  `);
  
  if (admin.rows.length > 0 && emailService.enabled) {
    await emailService.sendDailyReport(admin.rows[0].email, {
      date: yesterday,
      totalPatients: parseInt(stats.rows[0].total),
      avgWaitTime: Math.round(parseFloat(stats.rows[0].avg_wait) || 0),
      departmentStats: departmentStats.rows.map(d => ({
        name: d.name,
        patients: parseInt(d.patients) || 0
      }))
    });
    console.log('Daily report sent');
  }
}

// Job: Clean old queue entries
async function cleanOldQueueEntries(pool) {
  const daysToKeep = 90;
  const cutoffDate = new Date(Date.now() - daysToKeep * 86400000).toISOString().split('T')[0];
  
  const result = await pool.query(`
    DELETE FROM queue 
    WHERE DATE(created_at) < $1 
    AND status IN ('completed', 'no_show')
  `, [cutoffDate]);
  
  console.log(`Cleaned ${result.rowCount} old queue entries`);
}

// Job: Update predictions
async function updatePredictions(pool) {
  // Recalculate average wait times based on recent data
  await pool.query(`
    INSERT INTO wait_time_history (department_id, day_of_week, hour_of_day, avg_wait_time, patient_count)
    SELECT 
      department_id,
      EXTRACT(DOW FROM created_at)::INTEGER,
      EXTRACT(HOUR FROM created_at)::INTEGER,
      AVG(wait_time)::INTEGER,
      COUNT(*)
    FROM queue
    WHERE status = 'completed'
    AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY department_id, EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
    ON CONFLICT DO NOTHING
  `);
  
  console.log('Predictions updated');
}

// Job: Check for system health
async function systemHealthCheck(pool, broadcastNotification) {
  const checks = {
    database: false,
    api: true,
    queue: false
  };
  
  try {
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (e) {
    checks.database = false;
  }
  
  const queueStats = await pool.query(`
    SELECT COUNT(*) FILTER (WHERE status = 'waiting') as waiting FROM queue
  `);
  checks.queue = parseInt(queueStats.rows[0].waiting) < 100;
  
  // Log health status
  console.log('Health check:', checks);
  
  // Could send alert if critical
  if (!checks.database) {
    console.error('CRITICAL: Database unavailable');
  }
}

module.exports = {
  recordWaitTimeStats,
  sendDailyReport,
  cleanOldQueueEntries,
  updatePredictions,
  systemHealthCheck,
  JobScheduler
};
