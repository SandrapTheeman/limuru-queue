// Unit tests for Wait Time Service
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaitTimeService, WaitTimePrediction } from '../../ai/waitTime';
import { createMockD1 } from '../mocks';

describe('WaitTimeService', () => {
  let waitTimeService: WaitTimeService;
  let mockDb: any;

  beforeEach(() => {
    waitTimeService = new WaitTimeService();
    mockDb = createMockD1();
  });

  describe('predict', () => {
    it('should predict wait time for department', async () => {
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'waiting'",
        { count: 5 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'called'",
        { count: 1 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'in_progress'",
        { count: 1 }
      );
      mockDb.setFirstData(
        "SELECT AVG(wait_time_minutes) as avg FROM queue_tickets WHERE department = 'MED' AND status = 'completed' AND date(completed_at) = date('now')",
        { avg: 25 }
      );

      const prediction = await waitTimeService.predict(mockDb, 'MED');

      expect(prediction.department).toBe('MED');
      expect(prediction.predictedWaitMinutes).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.factors.currentQueueLength).toBe(5);
      expect(prediction.factors.averageConsultationTime).toBe(20);
    });

    it('should use historical data when available', async () => {
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'waiting'",
        { count: 3 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'called'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'in_progress'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT AVG(wait_time_minutes) as avg FROM queue_tickets WHERE department = 'MED' AND status = 'completed' AND date(completed_at) = date('now')",
        { avg: 20 }
      );

      const history = [
        { duration_minutes: 15, hour_of_day: 10, day_of_week: 1 },
        { duration_minutes: 20, hour_of_day: 10, day_of_week: 1 },
        { duration_minutes: 18, hour_of_day: 10, day_of_week: 1 },
      ];

      const prediction = await waitTimeService.predict(mockDb, 'MED', history);

      expect(prediction.factors.averageConsultationTime).toBe(18);
    });

    it('should apply peak hour multiplier', async () => {
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'waiting'",
        { count: 2 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'called'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'in_progress'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT AVG(wait_time_minutes) as avg FROM queue_tickets WHERE department = 'MED' AND status = 'completed' AND date(completed_at) = date('now')",
        { avg: 20 }
      );

      const prediction = await waitTimeService.predict(mockDb, 'MED');

      expect(prediction.predictedWaitMinutes).toBeGreaterThan(0);
    });

    it('should return minimum wait time of 5 minutes', async () => {
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'waiting'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'called'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT COUNT(*) as count FROM queue_tickets WHERE department = 'MED' AND status = 'in_progress'",
        { count: 0 }
      );
      mockDb.setFirstData(
        "SELECT AVG(wait_time_minutes) as avg FROM queue_tickets WHERE department = 'MED' AND status = 'completed' AND date(completed_at) = date('now')",
        { avg: 20 }
      );

      const prediction = await waitTimeService.predict(mockDb, 'MED');

      expect(prediction.predictedWaitMinutes).toBeGreaterThanOrEqual(5);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.setFirstData = () => {
        throw new Error('Database error');
      };

      const prediction = await waitTimeService.predict(mockDb, 'MED');

      expect(prediction.factors.currentQueueLength).toBe(0);
    });
  });

  describe('getPeakMultiplier', () => {
    it('should return higher multiplier for morning peak (9-11)', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(10, 1);
      expect(multiplier).toBe(1.3);
    });

    it('should return higher multiplier for lunch peak (12-14)', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(13, 1);
      expect(multiplier).toBe(1.1);
    });

    it('should return higher multiplier for afternoon peak (15-17)', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(16, 1);
      expect(multiplier).toBe(1.2);
    });

    it('should return lower multiplier for early morning', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(8, 1);
      expect(multiplier).toBe(0.6);
    });

    it('should return lower multiplier for late evening', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(19, 1);
      expect(multiplier).toBe(0.8);
    });

    it('should return lower multiplier for weekends', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(10, 0);
      expect(multiplier).toBe(0.7);
    });

    it('should return 1.1 for afternoon hours (14:00)', () => {
      const multiplier = (waitTimeService as any).getPeakMultiplier(14, 1);
      expect(multiplier).toBe(1.1);
    });
  });

  describe('calculateConfidence', () => {
    it('should return higher confidence with more historical samples', () => {
      const confidenceHigh = (waitTimeService as any).calculateConfidence(20, 3);
      const confidenceLow = (waitTimeService as any).calculateConfidence(5, 3);

      expect(confidenceHigh).toBeGreaterThan(confidenceLow);
    });

    it('should reduce confidence for very long queues', () => {
      const confidenceLong = (waitTimeService as any).calculateConfidence(10, 15);
      const confidenceNormal = (waitTimeService as any).calculateConfidence(10, 5);

      expect(confidenceLong).toBeLessThan(confidenceNormal);
    });

    it('should reduce confidence for empty queue', () => {
      const confidenceEmpty = (waitTimeService as any).calculateConfidence(10, 0);
      const confidenceNormal = (waitTimeService as any).calculateConfidence(10, 5);

      expect(confidenceEmpty).toBeLessThan(confidenceNormal);
    });

    it('should cap confidence at 0.9', () => {
      const confidence = (waitTimeService as any).calculateConfidence(100, 5);
      expect(confidence).toBeLessThanOrEqual(0.9);
    });
  });

  describe('predictAll', () => {
    it('should predict for all departments', async () => {
      mockDb.setFirstData = () => ({ count: 0 });
      mockDb.setFirstData = () => ({ count: 0 });

      const predictions = await waitTimeService.predictAll(mockDb, ['MED', 'PED']);

      expect(predictions).toHaveLength(2);
      expect(predictions[0].department).toBe('MED');
      expect(predictions[1].department).toBe('PED');
    });

    it('should handle errors for individual departments', async () => {
      mockDb.setFirstData = () => {
        throw new Error('Database error');
      };

      const predictions = await waitTimeService.predictAll(mockDb, ['MED', 'PED']);

      expect(predictions).toHaveLength(0);
    });
  });

  describe('defaultConsultationTimes', () => {
    it('should have consultation times for all major departments', () => {
      const times = (waitTimeService as any).defaultConsultationTimes;

      expect(times['MED']).toBe(20);
      expect(times['PED']).toBe(15);
      expect(times['SUR']).toBe(30);
      expect(times['CAR']).toBe(30);
      expect(times['EMG']).toBe(15);
    });
  });
});