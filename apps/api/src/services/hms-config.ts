import { createHMSAdapter, validateHMSConfig, HMS_ADAPTER_TYPES, HMSAdapterType } from '@limuru-queue/shared/hms-adapters';

export interface HMSConnectionTestResult {
  success: boolean;
  adapterType: string;
  latency?: number;
  error?: string;
  capabilities?: string[];
}

export interface HMSCredentialValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class HMSConfigurationService {
  private adapterType: HMSAdapterType;
  private baseUrl: string;
  private username?: string;
  private password?: string;
  private facilityId?: string;

  constructor(config: {
    type: HMSAdapterType;
    baseUrl: string;
    username?: string;
    password?: string;
    facilityId?: string;
  }) {
    this.adapterType = config.type;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.facilityId = config.facilityId;
  }

  validateCredentials(): HMSCredentialValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validation = validateHMSConfig({
      type: this.adapterType,
      baseUrl: this.baseUrl,
      username: this.username,
      password: this.password,
      facilityId: this.facilityId,
    });

    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    if (this.adapterType === HMS_ADAPTER_TYPES.OPENMRS || this.adapterType === HMS_ADAPTER_TYPES.BAHMNI) {
      if (!this.username || !this.password) {
        warnings.push('Username and password recommended for OpenMRS/Bahmni');
      }
    }

    if (this.adapterType === HMS_ADAPTER_TYPES.OPENELIS) {
      if (!this.username || !this.password) {
        warnings.push('Username and password recommended for OpenELIS');
      }
    }

    if (this.baseUrl.startsWith('http://')) {
      warnings.push('Using HTTP is not recommended for production. Consider using HTTPS.');
    }

    if (this.baseUrl.includes('localhost')) {
      warnings.push('Using localhost is not recommended for production');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async testConnection(): Promise<HMSConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      const adapter = createHMSAdapter({
        type: this.adapterType,
        baseUrl: this.baseUrl,
        username: this.username,
        password: this.password,
        facilityId: this.facilityId,
      });

      const doctors = await adapter.getDoctors();
      const latency = Date.now() - startTime;

      const capabilities = this.getCapabilities(adapter.name);

      return {
        success: true,
        adapterType: adapter.name,
        latency,
        capabilities,
      };
    } catch (error) {
      return {
        success: false,
        adapterType: this.adapterType,
        error: String(error),
      };
    }
  }

  private getCapabilities(adapterName: string): string[] {
    const capabilities: Record<string, string[]> = {
      mock: [
        'patient_search',
        'patient_retrieval',
        'appointment_management',
        'doctor_listing',
        'lab_order_submission',
        'lab_result_retrieval',
      ],
      openmrs: [
        'patient_search',
        'patient_retrieval',
        'patient_creation',
        'patient_update',
        'appointment_management',
        'provider_listing',
        'lab_order_submission',
        'lab_result_retrieval',
      ],
      bahmni: [
        'patient_search',
        'patient_retrieval',
        'patient_creation',
        'patient_update',
        'appointment_management',
        'provider_listing',
        'lab_order_submission',
        'lab_result_retrieval',
      ],
      openelis: [
        'lab_order_submission',
        'lab_result_retrieval',
        'sample_tracking',
      ],
    };

    return capabilities[adapterName] || [];
  }

  getEndpoints(): Record<string, string> {
    const endpoints: Record<string, string> = {};
    
    switch (this.adapterType) {
      case HMS_ADAPTER_TYPES.OPENMRS:
        endpoints.restApi = `${this.baseUrl}/ws/rest/v1`;
        endpoints.fhirApi = `${this.baseUrl}/ws/fhir/v2`;
        break;
      case HMS_ADAPTER_TYPES.BAHMNI:
        endpoints.restApi = `${this.baseUrl}/openmrs/ws/rest/v1`;
        endpoints.bahmniApi = `${this.baseUrl}/bahmnicore`;
        break;
      case HMS_ADAPTER_TYPES.OPENELIS:
        endpoints.restApi = `${this.baseUrl}/rest`;
        break;
      default:
        break;
    }

    return endpoints;
  }

  static getSupportedAdapters(): Array<{ type: HMSAdapterType; name: string; description: string }> {
    return [
      {
        type: HMS_ADAPTER_TYPES.MOCK,
        name: 'Mock HMS',
        description: 'Mock adapter for testing without a real HMS',
      },
      {
        type: HMS_ADAPTER_TYPES.OPENMRS,
        name: 'OpenMRS',
        description: 'OpenMRS EMR system integration',
      },
      {
        type: HMS_ADAPTER_TYPES.BAHMNI,
        name: 'Bahmni',
        description: 'Bahmni EMR system integration',
      },
      {
        type: HMS_ADAPTER_TYPES.OPENELIS,
        name: 'OpenELIS',
        description: 'OpenELIS laboratory information system',
      },
    ];
  }
}