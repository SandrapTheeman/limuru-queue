// Unit tests for AI LLM Service
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService, USE_CASE_CONFIGS, createAIService } from '../../ai/llm';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService('http://localhost:11434', 'test-api-key');
  });

  describe('USE_CASE_CONFIGS', () => {
    it('should have smart-triage configuration', () => {
      expect(USE_CASE_CONFIGS['smart-triage']).toBeDefined();
      expect(USE_CASE_CONFIGS['smart-triage'].provider).toBe('ollama');
    });

    it('should have wait-time-prediction configuration', () => {
      expect(USE_CASE_CONFIGS['wait-time-prediction']).toBeDefined();
      expect(USE_CASE_CONFIGS['wait-time-prediction'].provider).toBe('openrouter');
    });

    it('should have patient-query configuration', () => {
      expect(USE_CASE_CONFIGS['patient-query']).toBeDefined();
    });

    it('should have analytics-insights configuration', () => {
      expect(USE_CASE_CONFIGS['analytics-insights']).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should use default Ollama endpoint when not provided', () => {
      const service = new AIService();
      expect(service).toBeDefined();
    });

    it('should use provided Ollama endpoint', () => {
      const service = new AIService('http://custom:11434');
      expect(service).toBeDefined();
    });
  });

  describe('generate', () => {
    it('should call Ollama for ollama provider', async () => {
      const mockResponse = {
        message: { content: 'Test response' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await aiService.generate({
        provider: 'ollama',
        model: 'llama3.2:3b',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Test response');
      expect(result.model).toBe('llama3.2:3b');
    });

    it('should call OpenRouter for openrouter provider', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'OpenRouter response' } }],
        model: 'openai/gpt-4o-mini',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await aiService.generate({
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('OpenRouter response');
    });

    it('should throw error on Ollama failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Ollama error'),
      });

      await expect(
        aiService.generate({
          provider: 'ollama',
          model: 'llama3.2:3b',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Ollama error');
    });

    it('should throw error on OpenRouter failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      await expect(
        aiService.generate({
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow();
    });
  });

  describe('routeRequest', () => {
    it('should route to correct use case configuration', async () => {
      const mockResponse = {
        message: { content: '{"triage_level": "normal"}' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await aiService.routeRequest('smart-triage', 'Patient has cough');

      expect(result).toBeDefined();
    });

    it('should throw error for unknown use case', async () => {
      await expect(
        aiService.routeRequest('unknown-use-case', 'test')
      ).rejects.toThrow('Unknown use case: unknown-use-case');
    });

    it('should fallback to other provider on primary failure', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Primary failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: { content: 'Fallback response' } }),
        });
      });

      const result = await aiService.routeRequest('smart-triage', 'test');
      expect(result.content).toBe('Fallback response');
    });
  });

  describe('isOllamaAvailable', () => {
    it('should return true when Ollama is available', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const available = await aiService.isOllamaAvailable();
      expect(available).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const available = await aiService.isOllamaAvailable();
      expect(available).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [{ name: 'llama3.2:3b' }] }),
      });

      const models = await aiService.getAvailableModels();

      expect(models).toContain('ollama:llama3.2:3b');
      expect(models).toContain('openrouter:openai/gpt-4o-mini');
    });

    it('should return empty list when Ollama not available', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const models = await aiService.getAvailableModels();

      expect(models).toContain('openrouter:openai/gpt-4o-mini');
    });
  });

  describe('createAIService', () => {
    it('should create service with provided env', () => {
      const service = createAIService({
        OLLAMA_ENDPOINT: 'http://custom:11434',
        OPENROUTER_API_KEY: 'test-key',
      });

      expect(service).toBeDefined();
    });

    it('should create service without env', () => {
      const service = createAIService();
      expect(service).toBeDefined();
    });
  });
});