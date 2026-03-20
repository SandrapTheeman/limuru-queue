const cron = require('node-cron');
const pino = require('pino');

const logger = pino({ level: 'info' });

class JobScheduler {
  constructor(pool) {
    this.pool = pool;
    this.jobs = new Map();
  }
  
  // Schedule a job
  schedule(name, cronExpression, handler) {
    const task = cron.schedule(cronExpression, async () => {
      logger.info({ msg: `Job started: ${name}` });
      try {
        await handler(this.pool);
        logger.info({ msg: `Job completed: ${name}` });
      } catch (err) {
        logger.error({ msg: `Job failed: ${name}`, error: err.message });
      }
    });
    
    this.jobs.set(name, task);
    logger.info(`Scheduled job: ${name} (${cronExpression})`);
    return task;
  }
  
  // Start all jobs
  start() {
    this.jobs.forEach((task, name) => {
      task.start();
      logger.info(`Started job: ${name}`);
    });
  }
  
  // Stop all jobs
  stop() {
    this.jobs.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped job: ${name}`);
    });
  }
  
  // Run a specific job immediately
  async runNow(name) {
    const job = this.jobs.get(name);
    if (job) {
      await job.invoke();
    }
  }
}

module.exports = JobScheduler;
