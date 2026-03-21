import { createHMSService, HMSService } from './hms';
import { generateId } from '../utils';

export interface SyncJobConfig {
  hmsType: string;
  hmsBaseUrl?: string;
  hmsUsername?: string;
  hmsPassword?: string;
  hmsFacilityId?: string;
  intervalMinutes: number;
  maxRetries: number;
}

interface SyncJobState {
  lastRun: string | null;
  status: 'idle' | 'running' | 'error';
  error?: string;
  results: {
    patients: { synced: number; failed: number };
    appointments: { synced: number; failed: number };
  };
}

export class HMSSyncJob {
  private service: HMSService;
  private config: SyncJobConfig;
  private state: SyncJobState = {
    lastRun: null,
    status: 'idle',
    results: {
      patients: { synced: 0, failed: 0 },
      appointments: { synced: 0, failed: 0 },
    },
  };
  private retryCount = 0;

  constructor(db: D1Database, config: SyncJobConfig) {
    this.config = config;
    this.service = createHMSService({
      type: config.hmsType as any,
      baseUrl: config.hmsBaseUrl,
      username: config.hmsUsername,
      password: config.hmsPassword,
      facilityId: config.hmsFacilityId,
    });
  }

  getState(): SyncJobState {
    return { ...this.state };
  }

  async run(): Promise<SyncJobState> {
    if (this.state.status === 'running') {
      console.log('[HMS Sync] Sync already in progress, skipping');
      return this.state;
    }

    this.state.status = 'running';
    console.log('[HMS Sync] Starting sync job...');

    try {
      await this.syncPatients();
      await this.syncAppointments();
      
      this.state.lastRun = new Date().toISOString();
      this.state.status = 'idle';
      this.retryCount = 0;
      console.log('[HMS Sync] Sync completed successfully');
    } catch (error) {
      console.error('[HMS Sync] Sync failed:', error);
      this.state.status = 'error';
      this.state.error = String(error);
      
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.log(`[HMS Sync] Retrying... attempt ${this.retryCount}/${this.config.maxRetries}`);
      }
    }

    return this.state;
  }

  private async syncPatients(): Promise<void> {
    console.log('[HMS Sync] Syncing patients...');
    
    try {
      const result = await this.service.getAdapter().searchPatients('');
      
      this.state.results.patients.synced = result.length;
      this.state.results.patients.failed = 0;
      console.log(`[HMS Sync] Synced ${result.length} patients`);
    } catch (error) {
      console.error('[HMS Sync] Patient sync failed:', error);
      this.state.results.patients.failed++;
      throw error;
    }
  }

  private async syncAppointments(): Promise<void> {
    console.log('[HMS Sync] Syncing appointments...');
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const result = await this.service.getAdapter().getAppointments(today);
      
      this.state.results.appointments.synced = result.length;
      this.state.results.appointments.failed = 0;
      console.log(`[HMS Sync] Synced ${result.length} appointments`);
    } catch (error) {
      console.error('[HMS Sync] Appointment sync failed:', error);
      this.state.results.appointments.failed++;
      throw error;
    }
  }
}

export function createHMSSyncJob(env: Record<string, string>, db: D1Database): HMSSyncJob {
  return new HMSSyncJob(db, {
    hmsType: env.HMS_TYPE || 'mock',
    hmsBaseUrl: env.HMS_BASE_URL,
    hmsUsername: env.HMS_USERNAME,
    hmsPassword: env.HMS_PASSWORD,
    hmsFacilityId: env.HMS_FACILITY_ID,
    intervalMinutes: parseInt(env.HMS_SYNC_INTERVAL || '15'),
    maxRetries: parseInt(env.HMS_SYNC_RETRIES || '3'),
  });
}