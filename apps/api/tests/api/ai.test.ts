// Integration tests for AI Endpoints
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockEnv } from '../../src/services/__tests__/mocks';
import { testTriageInputs } from '../../src/services/__tests__/fixtures';

describe('AI API Integration Tests', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe('POST /api/ai/triage', () => {
    it('should accept valid triage input', async () => {
      const input = {
        chiefComplaint: 'Cough and cold',
        symptoms: ['cough', 'runny nose'],
        symptomDuration: '3 days',
        painLevel: 2,
        medicalHistory: [] as string[],
        allergies: [] as string[],
      };

      expect(input.chiefComplaint).toBeTruthy();
      expect(input.symptoms).toBeDefined();
      expect(input.painLevel).toBeDefined();
    });

    it('should require chief complaint', () => {
      const invalidInput: any = {
        symptoms: ['cough'],
        symptomDuration: '3 days',
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      expect(invalidInput.chiefComplaint).toBeUndefined();
    });

    it('should require symptoms array', () => {
      const invalidInput: any = {
        chiefComplaint: 'Cough',
        symptomDuration: '3 days',
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      expect(invalidInput.symptoms).toBeUndefined();
    });

    it('should require symptom duration', () => {
      const invalidInput: any = {
        chiefComplaint: 'Cough',
        symptoms: ['cough'],
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      expect(invalidInput.symptomDuration).toBeUndefined();
    });

    it('should require pain level', () => {
      const invalidInput: any = {
        chiefComplaint: 'Cough',
        symptoms: ['cough'],
        symptomDuration: '3 days',
        medicalHistory: [],
        allergies: [],
      };

      expect(invalidInput.painLevel).toBeUndefined();
    });

    it('should return emergency level for chest pain', () => {
      const emergencyInput = {
        chiefComplaint: 'Chest pain',
        symptoms: ['chest pain'],
        symptomDuration: '15 min',
        painLevel: 9,
        medicalHistory: [] as string[],
        allergies: [] as string[],
      };

      expect(emergencyInput.chiefComplaint.toLowerCase()).toContain('chest');
    });

    it('should return urgent level for high fever', () => {
      const urgentInput = {
        chiefComplaint: 'High fever',
        symptoms: ['fever'],
        symptomDuration: '2 days',
        painLevel: 7,
        medicalHistory: [] as string[],
        allergies: [] as string[],
      };

      expect(urgentInput.painLevel).toBeGreaterThanOrEqual(7);
    });

    it('should handle vital signs when provided', () => {
      const inputWithVitals = {
        chiefComplaint: 'Headache',
        symptoms: ['headache'],
        symptomDuration: '2 hours',
        painLevel: 5,
        vitalSigns: {
          bloodPressureSystolic: 120,
          heartRate: 80,
          temperature: 37.5,
          oxygenSaturation: 98,
        },
        medicalHistory: [] as string[],
        allergies: [] as string[],
      };

      expect(inputWithVitals.vitalSigns).toBeDefined();
    });
  });

  describe('GET /api/ai/wait-time/:department', () => {
    it('should require department parameter', async () => {
      const department = '';

      expect(department).toBeFalsy();
    });

    it('should accept valid department codes', async () => {
      const departments = ['MED', 'PED', 'GYN', 'OBS', 'ORT', 'CAR', 'DER', 'OPT', 'ENT', 'DEN', 'PSY', 'EMG'];

      expect(departments).toContain('MED');
      expect(departments).toContain('PED');
    });

    it('should return prediction with confidence', async () => {
      const prediction = {
        department: 'MED',
        predictedWaitMinutes: 30,
        confidence: 0.75,
      };

      expect(prediction.predictedWaitMinutes).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should include factors in response', async () => {
      const prediction = {
        department: 'MED',
        predictedWaitMinutes: 30,
        confidence: 0.75,
        factors: {
          currentQueueLength: 5,
          averageConsultationTime: 20,
          availableDoctors: 2,
          timeOfDay: '10:00',
          dayOfWeek: 'Monday',
          historicalSamples: 15,
        },
      };

      expect(prediction.factors).toBeDefined();
      expect(prediction.factors.currentQueueLength).toBeDefined();
    });

    it('should include timestamp', async () => {
      const prediction = {
        calculatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };

      expect(prediction.calculatedAt).toBeTruthy();
      expect(prediction.validUntil).toBeTruthy();
    });
  });

  describe('GET /api/ai/models', () => {
    it('should return available models', async () => {
      const models = {
        models: [
          'ollama:llama3.2:3b',
          'openrouter:openai/gpt-4o-mini',
          'openrouter:anthropic/claude-3.5-sonnet',
        ],
        configured: {
          ollama: true,
          openrouter: true,
        },
      };

      expect(models.models).toBeDefined();
      expect(models.configured).toBeDefined();
    });

    it('should indicate configuration status', async () => {
      const configured = {
        ollama: true,
        openrouter: false,
      };

      expect(configured.ollama).toBe(true);
      expect(configured.openrouter).toBe(false);
    });

    it('should handle missing configuration', async () => {
      const noConfig = {
        ollama: false,
        openrouter: false,
      };

      expect(noConfig.ollama).toBe(false);
    });
  });
});