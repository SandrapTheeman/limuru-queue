// Smart Triage Service
// AI-powered triage assessment with rule-based red flag detection

export interface TriageInput {
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration: string;
  painLevel: number; // 1-10
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
  medicalHistory: string[];
  allergies: string[];
}

export interface TriageOutput {
  triageLevel: 'emergency' | 'urgent' | 'normal' | 'low';
  recommendedDepartment: string;
  redFlags: string[];
  waitTimeEstimate: number;
  aiReasoning: string;
}

export interface RedFlag {
  severity: 'emergency' | 'urgent';
  description: string;
  category: string;
}

// Red flag detection rules
const RED_FLAG_RULES: Array<{
  condition: (input: TriageInput) => boolean;
  severity: 'emergency' | 'urgent';
  description: string;
  category: string;
}> = [
  // Vital signs - Emergency
  {
    condition: (i) => i.vitalSigns?.bloodPressureSystolic ? i.vitalSigns.bloodPressureSystolic >= 180 : false,
    severity: 'emergency',
    description: 'Severe hypertension (BP >= 180/120 mmHg)',
    category: 'vital-signs',
  },
  {
    condition: (i) => i.vitalSigns?.bloodPressureSystolic ? i.vitalSigns.bloodPressureSystolic < 90 : false,
    severity: 'emergency',
    description: 'Hypotension (BP < 90 mmHg)',
    category: 'vital-signs',
  },
  {
    condition: (i) => i.vitalSigns?.oxygenSaturation ? i.vitalSigns.oxygenSaturation < 90 : false,
    severity: 'emergency',
    description: 'Low oxygen saturation (<90%)',
    category: 'vital-signs',
  },
  {
    condition: (i) => i.vitalSigns?.heartRate ? i.vitalSigns.heartRate > 150 : false,
    severity: 'emergency',
    description: 'Severe tachycardia (HR > 150 bpm)',
    category: 'vital-signs',
  },
  {
    condition: (i) => i.vitalSigns?.heartRate ? i.vitalSigns.heartRate < 50 : false,
    severity: 'urgent',
    description: 'Bradycardia (HR < 50 bpm)',
    category: 'vital-signs',
  },
  {
    condition: (i) => i.vitalSigns?.temperature ? i.vitalSigns.temperature > 40 : false,
    severity: 'emergency',
    description: 'Very high fever (>40°C)',
    category: 'vital-signs',
  },
  // Pain level
  {
    condition: (i) => i.painLevel >= 9,
    severity: 'emergency',
    description: 'Severe pain (9-10/10)',
    category: 'pain',
  },
  // Emergency symptoms
  {
    condition: (i) => /chest pain|chest tightness|pressure in chest/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Chest pain/tightness - possible cardiac emergency',
    category: 'symptoms',
  },
  {
    condition: (i) => /difficulty breathing|shortness of breath|can't breathe|breathing difficulty/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Difficulty breathing - respiratory emergency',
    category: 'symptoms',
  },
  {
    condition: (i) => /severe bleeding|uncontrolled bleeding|bleeding won't stop/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Severe bleeding',
    category: 'symptoms',
  },
  {
    condition: (i) => /unconscious|unresponsive|collapsed|lost consciousness/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Unconscious/collapsed',
    category: 'symptoms',
  },
  {
    condition: (i) => /seizure|convulsion|fitting/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Seizure activity',
    category: 'symptoms',
  },
  {
    condition: (i) => /stroke|facial droop|arm weakness|slurred speech|asymmetric/i.test(i.chiefComplaint),
    severity: 'emergency',
    description: 'Possible stroke symptoms (FAST)',
    category: 'symptoms',
  },
  // Urgent symptoms
  {
    condition: (i) => /high fever|fever.*child|fever.*baby/i.test(i.chiefComplaint) && (i.vitalSigns?.temperature ?? 0) > 39,
    severity: 'urgent',
    description: 'High fever (>39°C)',
    category: 'symptoms',
  },
  {
    condition: (i) => /severe headache|migraine.*worst|headache.*vomiting/i.test(i.chiefComplaint),
    severity: 'urgent',
    description: 'Severe headache with vomiting',
    category: 'symptoms',
  },
  {
    condition: (i) => /abdominal pain|belly pain|stomach pain/i.test(i.chiefComplaint) && i.painLevel >= 7,
    severity: 'urgent',
    description: 'Severe abdominal pain',
    category: 'symptoms',
  },
  {
    condition: (i) => /dehydration|dry mouth|no urine|not drinking/i.test(i.chiefComplaint),
    severity: 'urgent',
    description: 'Signs of dehydration',
    category: 'symptoms',
  },
];

// Department routing based on chief complaint
const DEPARTMENT_ROUTING: Array<{
  keywords: RegExp[];
  department: string;
  priority: number;
}> = [
  { keywords: [/cardiac|heart|chest pain|palpitations/i], department: 'CAR', priority: 1 },
  { keywords: [/emergency|trauma|accident|injury|cut|burn/i], department: 'EMG', priority: 1 },
  { keywords: [/child|baby|infant|pediatric|childhood/i], department: 'PED', priority: 1 },
  { keywords: [/pregnant|delivery|baby|labour|obstetric|gynecology|vaginal bleeding.*pregnant/i], department: 'OBS', priority: 1 },
  { keywords: [/bone|fracture|joint|orthopedic|back pain|neck pain/i], department: 'ORT', priority: 1 },
  { keywords: [/skin|rash|dermatology|itch/i], department: 'DER', priority: 1 },
  { keywords: [/eye|vision|optic|eye pain/i], department: 'OPT', priority: 1 },
  { keywords: [/ear|hearing|nose|throat|sinus|ENT/i], department: 'ENT', priority: 1 },
  { keywords: [/dental|tooth|teeth|mouth/i], department: 'DEN', priority: 1 },
  { keywords: [/mental|psych|anxiety|depression|suicide/i], department: 'PSY', priority: 1 },
  { keywords: [/diabetes|thyroid|hormone|metabolic/i], department: 'END', priority: 2 },
  { keywords: [/kidney|urinary|bladder|urine|pelvic/i], department: 'URO', priority: 2 },
  { keywords: [/general|checkup|fever|cough|cold|headache|stomach|flu/i], department: 'MED', priority: 3 },
];

export class TriageService {
  // Detect red flags based on rules
  detectRedFlags(input: TriageInput): RedFlag[] {
    const redFlags: RedFlag[] = [];
    
    for (const rule of RED_FLAG_RULES) {
      if (rule.condition(input)) {
        redFlags.push({
          severity: rule.severity,
          description: rule.description,
          category: rule.category,
        });
      }
    }
    
    // Sort by severity (emergency first)
    return redFlags.sort((a, b) => {
      if (a.severity === 'emergency' && b.severity === 'urgent') return -1;
      if (a.severity === 'urgent' && b.severity === 'emergency') return 1;
      return 0;
    });
  }

  // Determine recommended department
  determineDepartment(input: TriageInput): string {
    const matches = DEPARTMENT_ROUTING.filter(r => 
      r.keywords.some(kw => kw.test(input.chiefComplaint))
    );
    
    if (matches.length > 0) {
      // Return highest priority match
      matches.sort((a, b) => a.priority - b.priority);
      return matches[0].department;
    }
    
    return 'MED'; // Default to General Medicine
  }

  // Estimate wait time based on triage level
  estimateWaitTime(triageLevel: string): number {
    switch (triageLevel) {
      case 'emergency': return 0; // Immediate
      case 'urgent': return 15; // 15 minutes
      case 'normal': return 45; // 45 minutes
      case 'low': return 90; // 90 minutes
      default: return 30;
    }
  }

  // Full triage assessment
  async assess(input: TriageInput, aiService?: any): Promise<TriageOutput> {
    // Step 1: Rule-based red flag detection
    const redFlags = this.detectRedFlags(input);
    
    // If emergency red flags, bypass AI and return immediately
    if (redFlags.some(r => r.severity === 'emergency')) {
      return {
        triageLevel: 'emergency',
        recommendedDepartment: this.determineDepartment(input),
        redFlags: redFlags.map(r => r.description),
        waitTimeEstimate: 0,
        aiReasoning: 'Emergency red flag detected - immediate medical attention required',
      };
    }
    
    // Step 2: If AI service available, get AI assessment
    let aiAssessment: any = null;
    if (aiService) {
      try {
        const aiPrompt = `
          Assess the following patient for triage level:
          
          Chief Complaint: ${input.chiefComplaint}
          Symptoms: ${input.symptoms.join(', ')}
          Duration: ${input.symptomDuration}
          Pain Level: ${input.painLevel}/10
          Vital Signs: ${JSON.stringify(input.vitalSigns || 'Not provided')}
          Medical History: ${input.medicalHistory.join(', ') || 'None'}
          Allergies: ${input.allergies.join(', ') || 'None'}
          
          Consider:
          - Pain levels above 7 indicate urgency
          - Vital signs outside normal ranges
          - Duration of symptoms
          - Presence of red flags
          
          Provide a JSON response with:
          - triage_level: emergency|urgent|normal|low
          - recommended_department: department code
          - brief_reasoning: 1-2 sentences
          - wait_time_estimate: number in minutes
        `;
        
        const response = await aiService.routeRequest('smart-triage', aiPrompt);
        aiAssessment = this.parseAIResponse(response.content);
      } catch (error) {
        console.error('AI triage failed, using rule-based:', error);
      }
    }
    
    // Step 3: Combine rule-based and AI assessment
    const hasUrgentRedFlags = redFlags.some(r => r.severity === 'urgent');
    const triageLevel = aiAssessment?.triage_level || 
      (hasUrgentRedFlags ? 'urgent' : this.determineTriageFromPain(input.painLevel));
    
    return {
      triageLevel,
      recommendedDepartment: aiAssessment?.recommended_department || this.determineDepartment(input),
      redFlags: redFlags.map(r => r.description),
      waitTimeEstimate: aiAssessment?.wait_time_estimate || this.estimateWaitTime(triageLevel),
      aiReasoning: aiAssessment?.brief_reasoning || 'Assessment completed using clinical guidelines',
    };
  }

  private determineTriageFromPain(painLevel: number): 'emergency' | 'urgent' | 'normal' | 'low' {
    if (painLevel >= 8) return 'urgent';
    if (painLevel >= 5) return 'normal';
    return 'low';
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  }
}

export const triageService = new TriageService();
