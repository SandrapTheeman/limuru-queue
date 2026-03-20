// Unit tests for Triage Service
import { describe, it, expect, vi } from 'vitest';
import { triageService, TriageService, TriageInput } from '../../ai/triage';

describe('TriageService', () => {
  describe('detectRedFlags', () => {
    it('should detect severe hypertension as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Headache',
        symptoms: ['headache'],
        symptomDuration: '1 hour',
        painLevel: 3,
        vitalSigns: {
          bloodPressureSystolic: 185,
          bloodPressureDiastolic: 120,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('hypertension'),
        })
      );
    });

    it('should detect severe hypotension as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Dizziness',
        symptoms: ['dizziness', 'fatigue'],
        symptomDuration: '2 hours',
        painLevel: 2,
        vitalSigns: {
          bloodPressureSystolic: 85,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('Hypotension'),
        })
      );
    });

    it('should detect low oxygen saturation as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Difficulty breathing',
        symptoms: ['shortness of breath'],
        symptomDuration: '30 minutes',
        painLevel: 5,
        vitalSigns: {
          oxygenSaturation: 85,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('oxygen'),
        })
      );
    });

    it('should detect severe tachycardia as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Heart palpitations',
        symptoms: ['palpitations'],
        symptomDuration: '1 hour',
        painLevel: 4,
        vitalSigns: {
          heartRate: 160,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('tachycardia'),
        })
      );
    });

    it('should detect bradycardia as urgent', () => {
      const input: TriageInput = {
        chiefComplaint: 'Fatigue',
        symptoms: ['fatigue', 'dizziness'],
        symptomDuration: '2 days',
        painLevel: 2,
        vitalSigns: {
          heartRate: 45,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'urgent',
          description: expect.stringContaining('Bradycardia'),
        })
      );
    });

    it('should detect very high fever as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'High fever',
        symptoms: ['fever', 'chills'],
        symptomDuration: '1 day',
        painLevel: 6,
        vitalSigns: {
          temperature: 41,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('fever'),
        })
      );
    });

    it('should detect severe pain (9-10) as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Severe abdominal pain',
        symptoms: ['abdominal pain'],
        symptomDuration: '3 hours',
        painLevel: 10,
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('Severe pain'),
        })
      );
    });

    it('should detect chest pain as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Chest pain and pressure',
        symptoms: ['chest tightness'],
        symptomDuration: '20 minutes',
        painLevel: 8,
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags.some(r => r.severity === 'emergency')).toBe(true);
      expect(redFlags.length).toBeGreaterThan(0);
    });

    it('should detect difficulty breathing as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: "Can't breathe",
        symptoms: ['shortness of breath'],
        symptomDuration: '15 minutes',
        painLevel: 7,
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('breathing'),
        })
      );
    });

    it('should detect unconscious state as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Found unconscious',
        symptoms: [],
        symptomDuration: 'Unknown',
        painLevel: 0,
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('Unconscious'),
        })
      );
    });

    it('should detect seizure as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Patient had a seizure',
        symptoms: ['seizure', 'convulsion'],
        symptomDuration: '2 minutes',
        painLevel: 5,
        medicalHistory: ['epilepsy'],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('Seizure'),
        })
      );
    });

    it('should detect stroke symptoms as emergency', () => {
      const input: TriageInput = {
        chiefComplaint: 'Facial droop and arm weakness',
        symptoms: ['facial droop', 'arm weakness'],
        symptomDuration: '1 hour',
        painLevel: 2,
        medicalHistory: ['hypertension'],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toContainEqual(
        expect.objectContaining({
          severity: 'emergency',
          description: expect.stringContaining('stroke'),
        })
      );
    });

    it('should return empty array for normal case', () => {
      const input: TriageInput = {
        chiefComplaint: 'Mild cough and cold',
        symptoms: ['cough', 'runny nose'],
        symptomDuration: '3 days',
        painLevel: 2,
        vitalSigns: {
          temperature: 37.5,
          heartRate: 80,
          bloodPressureSystolic: 120,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags).toHaveLength(0);
    });

    it('should sort emergency flags before urgent', () => {
      const input: TriageInput = {
        chiefComplaint: 'Chest pain with high fever',
        symptoms: ['chest pain', 'fever'],
        symptomDuration: '2 hours',
        painLevel: 9,
        vitalSigns: {
          temperature: 40,
          bloodPressureSystolic: 160,
        },
        medicalHistory: [],
        allergies: [],
      };

      const redFlags = triageService.detectRedFlags(input);

      expect(redFlags[0].severity).toBe('emergency');
    });
  });

  describe('determineDepartment', () => {
    it('should route cardiac complaints to CAR', () => {
      const input: TriageInput = {
        chiefComplaint: 'Heart palpitations and chest discomfort',
        symptoms: ['palpitations'],
        symptomDuration: '1 hour',
        painLevel: 4,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('CAR');
    });

    it('should route pediatric complaints to PED', () => {
      const input: TriageInput = {
        chiefComplaint: 'Child has fever',
        symptoms: ['fever'],
        symptomDuration: '1 day',
        painLevel: 5,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('PED');
    });

    it('should route emergency to EMG', () => {
      const input: TriageInput = {
        chiefComplaint: 'Trauma from accident',
        symptoms: ['injury'],
        symptomDuration: '30 minutes',
        painLevel: 8,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('EMG');
    });

    it('should route orthopedic to ORT', () => {
      const input: TriageInput = {
        chiefComplaint: 'Broken bone in arm',
        symptoms: ['pain', 'swelling'],
        symptomDuration: '2 hours',
        painLevel: 9,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('ORT');
    });

    it('should route dermatology to DER', () => {
      const input: TriageInput = {
        chiefComplaint: 'Rash all over body',
        symptoms: ['rash', 'itching'],
        symptomDuration: '3 days',
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('DER');
    });

    it('should default to MED for general complaints', () => {
      const input: TriageInput = {
        chiefComplaint: 'General checkup',
        symptoms: [],
        symptomDuration: 'N/A',
        painLevel: 1,
        medicalHistory: [],
        allergies: [],
      };

      const department = triageService.determineDepartment(input);
      expect(department).toBe('MED');
    });
  });

  describe('estimateWaitTime', () => {
    it('should return 0 for emergency', () => {
      expect(triageService.estimateWaitTime('emergency')).toBe(0);
    });

    it('should return 15 for urgent', () => {
      expect(triageService.estimateWaitTime('urgent')).toBe(15);
    });

    it('should return 45 for normal', () => {
      expect(triageService.estimateWaitTime('normal')).toBe(45);
    });

    it('should return 90 for low', () => {
      expect(triageService.estimateWaitTime('low')).toBe(90);
    });

    it('should return 30 for unknown level', () => {
      expect(triageService.estimateWaitTime('unknown')).toBe(30);
    });
  });

  describe('assess', () => {
    it('should return emergency for emergency red flags', async () => {
      const input: TriageInput = {
        chiefComplaint: 'Chest pain',
        symptoms: ['chest pain'],
        symptomDuration: '15 minutes',
        painLevel: 9,
        vitalSigns: {
          bloodPressureSystolic: 170,
        },
        medicalHistory: [],
        allergies: [],
      };

      const result = await triageService.assess(input);

      expect(result.triageLevel).toBe('emergency');
      expect(result.waitTimeEstimate).toBe(0);
      expect(result.redFlags.length).toBeGreaterThan(0);
    });

    it('should use AI service when provided', async () => {
      const mockAI = {
        routeRequest: vi.fn().mockResolvedValue({
          content: '{"triage_level": "normal", "recommended_department": "MED", "brief_reasoning": "Assessment complete", "wait_time_estimate": 30}',
        }),
      };

      const input: TriageInput = {
        chiefComplaint: 'Mild cough',
        symptoms: ['cough'],
        symptomDuration: '2 days',
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      const result = await triageService.assess(input, mockAI);

      expect(mockAI.routeRequest).toHaveBeenCalled();
    });

    it('should fallback to rule-based when AI fails', async () => {
      const mockAI = {
        routeRequest: vi.fn().mockRejectedValue(new Error('AI unavailable')),
      };

      const input: TriageInput = {
        chiefComplaint: 'Mild cough',
        symptoms: ['cough'],
        symptomDuration: '2 days',
        painLevel: 2,
        medicalHistory: [],
        allergies: [],
      };

      const result = await triageService.assess(input, mockAI);

      expect(result.triageLevel).toBeDefined();
      expect(result.recommendedDepartment).toBeDefined();
    });

    it('should determine triage from pain level when no AI', async () => {
      const input: TriageInput = {
        chiefComplaint: 'Headache',
        symptoms: ['headache'],
        symptomDuration: '1 hour',
        painLevel: 8,
        medicalHistory: [],
        allergies: [],
      };

      const result = await triageService.assess(input);

      expect(result.triageLevel).toBe('urgent');
    });
  });
});