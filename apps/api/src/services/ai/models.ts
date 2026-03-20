// AI Model Management Service
// Model registry, health checks, and smart routing

export type ModelProvider = 'ollama' | 'openrouter';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  supportsVision: boolean;
  costPer1kTokens?: number;
  avgResponseTimeMs?: number;
  useCases: string[];
  isAvailable: boolean;
}

export interface ModelHealth {
  modelId: string;
  isHealthy: boolean;
  lastChecked: string;
  latency?: number;
  error?: string;
}

export interface ModelSelectorConfig {
  useCase: string;
  preferProvider?: ModelProvider;
  fallbackEnabled: boolean;
  maxLatency?: number;
}

// Model registry
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  'llama3.2:3b': {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    provider: 'ollama',
    contextWindow: 128000,
    supportsVision: false,
    avgResponseTimeMs: 2000,
    useCases: ['smart-triage', 'soap-assistance', 'patient-query'],
    isAvailable: false,
  },
  'llama3.2:7b': {
    id: 'llama3.2:7b',
    name: 'Llama 3.2 7B',
    provider: 'ollama',
    contextWindow: 128000,
    supportsVision: false,
    avgResponseTimeMs: 3500,
    useCases: ['smart-triage', 'soap-assistance', 'patient-query'],
    isAvailable: false,
  },
  'medgemma:7b': {
    id: 'medgemma:7b',
    name: 'MedGemma 7B',
    provider: 'ollama',
    contextWindow: 128000,
    supportsVision: false,
    avgResponseTimeMs: 4000,
    useCases: ['smart-triage', 'soap-assistance', 'clinical-notes'],
    isAvailable: false,
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    contextWindow: 128000,
    supportsVision: false,
    costPer1kTokens: 0.00015,
    avgResponseTimeMs: 1500,
    useCases: ['wait-time-prediction', 'patient-query', 'analytics-insights'],
    isAvailable: true,
  },
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    contextWindow: 128000,
    supportsVision: true,
    costPer1kTokens: 0.0025,
    avgResponseTimeMs: 3000,
    useCases: ['smart-triage', 'soap-assistance', 'patient-query', 'analytics-insights'],
    isAvailable: true,
  },
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    contextWindow: 200000,
    supportsVision: true,
    costPer1kTokens: 0.003,
    avgResponseTimeMs: 2500,
    useCases: ['smart-triage', 'soap-assistance', 'patient-query', 'analytics-insights'],
    isAvailable: true,
  },
  'google/gemini-2.0-flash-exp': {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    contextWindow: 1000000,
    supportsVision: true,
    costPer1kTokens: 0.0001,
    avgResponseTimeMs: 1000,
    useCases: ['wait-time-prediction', 'patient-query', 'analytics-insights'],
    isAvailable: true,
  },
};

// Use case to model mapping
export const USE_CASE_MODELS: Record<string, string[]> = {
  'smart-triage': ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'llama3.2:7b'],
  'wait-time-prediction': ['google/gemini-2.0-flash-exp', 'openai/gpt-4o-mini'],
  'soap-assistance': ['anthropic/claude-3.5-sonnet', 'llama3.2:7b'],
  'patient-query': ['anthropic/claude-3.5-sonnet', 'llama3.2:3b', 'openai/gpt-4o-mini'],
  'analytics-insights': ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-exp'],
  'clinical-notes': ['medgemma:7b', 'anthropic/claude-3.5-sonnet'],
};

export class ModelManager {
  private healthCache: Map<string, ModelHealth> = new Map();
  private healthCheckInterval = 60000; // 1 minute

  selectModel(config: ModelSelectorConfig): ModelInfo | null {
    const candidates = USE_CASE_MODELS[config.useCase] || [];
    
    let filtered = candidates;
    if (config.preferProvider) {
      filtered = candidates.filter(id => MODEL_REGISTRY[id]?.provider === config.preferProvider);
    }

    const available = filtered.filter(id => {
      const model = MODEL_REGISTRY[id];
      return model?.isAvailable && (!config.maxLatency || (model.avgResponseTimeMs || 9999) <= config.maxLatency);
    });

    if (available.length === 0 && config.fallbackEnabled) {
      return this.getFirstAvailable(candidates);
    }

    return available[0] ? this.sanitizeModel(MODEL_REGISTRY[available[0]]) : null;
  }

  private getFirstAvailable(candidates: string[]): ModelInfo | null {
    for (const id of candidates) {
      const model = MODEL_REGISTRY[id];
      if (model?.isAvailable) return model;
    }
    return null;
  }

  private sanitizeModel(model: ModelInfo | undefined): ModelInfo | null {
    return model ?? null;
  }

  async checkModelHealth(ollamaEndpoint: string): Promise<Map<string, ModelHealth>> {
    const healthMap = new Map<string, ModelHealth>();

    try {
      const response = await fetch(`${ollamaEndpoint}/api/tags`, { 
        method: 'GET' 
      });
      
      if (response.ok) {
        const data = await response.json() as any;
        const availableModels = (data.models || []).map((m: any) => m.name);
        
        for (const modelId of Object.keys(MODEL_REGISTRY)) {
          const model = MODEL_REGISTRY[modelId];
          if (model?.provider === 'ollama') {
            const health: ModelHealth = {
              modelId,
              isHealthy: availableModels.includes(modelId),
              lastChecked: new Date().toISOString(),
            };
            healthMap.set(modelId, health);
            this.healthCache.set(modelId, health);
          }
        }
      }
    } catch (error) {
      console.error('Model health check failed:', error);
    }

    return healthMap;
  }

  getModelForUseCase(useCase: string, provider?: ModelProvider): ModelInfo | null {
    return this.selectModel({
      useCase,
      preferProvider: provider,
      fallbackEnabled: true,
    });
  }

  getAllModels(): ModelInfo[] {
    return Object.values(MODEL_REGISTRY);
  }

  getModelsByProvider(provider: ModelProvider): ModelInfo[] {
    return Object.values(MODEL_REGISTRY).filter(m => m.provider === provider);
  }
}

export const modelManager = new ModelManager();

export function createModelManager(): ModelManager {
  return new ModelManager();
}