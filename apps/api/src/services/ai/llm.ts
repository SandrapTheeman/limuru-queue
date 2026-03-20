// AI Service - Unified LLM Provider
// Supports both local Ollama and cloud providers (OpenRouter)

export interface LLMRequest {
  provider: 'ollama' | 'openrouter';
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface UseCaseConfig {
  provider: 'ollama' | 'openrouter';
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

// Use case configurations
export const USE_CASE_CONFIGS: Record<string, UseCaseConfig> = {
  'smart-triage': {
    provider: 'ollama',
    model: 'llama3.2:3b', // Medgemma:27b when available
    systemPrompt: `You are a medical triage assistant. Analyze patient symptoms and provide triage recommendations. 
Output format: {"triage_level": "emergency|urgent|normal|low", "recommendation": "...", "red_flags": [...]}`,
    temperature: 0.3,
    maxTokens: 512,
  },
  'wait-time-prediction': {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    systemPrompt: `You are a healthcare operations analyst. Predict wait times based on queue data.
Consider: current queue length, average consultation time, doctor availability, time of day, day of week.
Output: {"predicted_wait_minutes": number, "confidence": 0.0-1.0, "factors": [...]}`,
    temperature: 0.2,
    maxTokens: 256,
  },
  'soap-assistance': {
    provider: 'ollama',
    model: 'llama3.2:3b',
    systemPrompt: `You are a medical documentation assistant. Help complete SOAP notes based on consultation.
Provide structured suggestions for Subjective, Objective, Assessment, and Plan sections.
Output format: {"subjective": "...", "objective": "...", "assessment": "...", "plan": "...", "suggestions": [...]}`,
    temperature: 0.5,
    maxTokens: 1024,
  },
  'patient-query': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt: `You are a helpful hospital queue system assistant. Answer patient questions about:
- Queue status and wait times
- How to check in
- What to expect during their visit
- General hospital information

Be concise, friendly, and helpful. Do not provide medical advice.`,
    temperature: 0.7,
    maxTokens: 512,
  },
  'analytics-insights': {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    systemPrompt: `You are a healthcare analytics expert. Analyze queue data and provide actionable insights.
Consider: patient flow patterns, peak hours, department performance, improvement recommendations.
Output format: {"insights": [...], "recommendations": [...], "metrics": {...}}`,
    temperature: 0.3,
    maxTokens: 1024,
  },
};

export class AIService {
  private ollamaEndpoint: string;
  private openrouterEndpoint = 'https://openrouter.ai/api/v1';
  private openrouterApiKey: string;

  constructor(ollamaEndpoint?: string, openrouterApiKey?: string) {
    this.ollamaEndpoint = ollamaEndpoint || 'http://localhost:11434';
    this.openrouterApiKey = openrouterApiKey || '';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    if (request.provider === 'ollama') {
      return this.callOllama(request);
    } else {
      return this.callOpenRouter(request);
    }
  }

  private async callOllama(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.max_tokens || 1024,
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${error}`);
      }

      const data = await response.json() as any;
      return {
        content: data.message?.content || '',
        model: request.model,
      };
    } catch (error) {
      console.error('Ollama call failed:', error);
      throw error;
    }
  }

  private async callOpenRouter(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.openrouterEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': 'https://limuruhospital.co.ke',
          'X-Title': 'Limuru Cottage Hospital Queue System',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 1024,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return {
        content: data.choices?.[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      console.error('OpenRouter call failed:', error);
      throw error;
    }
  }

  // Smart routing based on use case
  async routeRequest(useCase: string, userPrompt: string): Promise<LLMResponse> {
    const config = USE_CASE_CONFIGS[useCase];
    
    if (!config) {
      throw new Error(`Unknown use case: ${useCase}`);
    }

    const request: LLMRequest = {
      provider: config.provider,
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    // Try primary provider, fallback to other if fails
    try {
      return await this.generate(request);
    } catch (primaryError) {
      console.error(`Primary provider (${config.provider}) failed, trying fallback...`);
      
      // Try fallback
      const fallbackProvider = config.provider === 'ollama' ? 'openrouter' : 'ollama';
      const fallbackModel = fallbackProvider === 'ollama' ? 'llama3.2:3b' : 'openai/gpt-4o-mini';
      
      request.provider = fallbackProvider;
      request.model = fallbackModel;
      
      return await this.generate(request);
    }
  }

  // Check if Ollama is available
  async isOllamaAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get available models
  async getAvailableModels(): Promise<string[]> {
    const models: string[] = [];
    
    // Check Ollama
    if (await this.isOllamaAvailable()) {
      try {
        const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
        const data = await response.json() as any;
        models.push(...(data.models || []).map((m: any) => `ollama:${m.name}`));
      } catch {
        // Ignore
      }
    }
    
    // Add OpenRouter models (these would be fetched from API in production)
    models.push('openrouter:openai/gpt-4o-mini');
    models.push('openrouter:anthropic/claude-3.5-sonnet');
    models.push('openrouter:google/gemini-pro-1.5');
    
    return models;
  }
}

// Factory function
export function createAIService(env?: {
  OLLAMA_ENDPOINT?: string;
  OPENROUTER_API_KEY?: string;
}): AIService {
  return new AIService(
    env?.OLLAMA_ENDPOINT,
    env?.OPENROUTER_API_KEY
  );
}
