import { RateLimiter } from './rate-limiter';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private apiKey: string;
  private baseUrl: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY!;
    this.baseUrl = 'https://api.openai.com/v1';
    this.rateLimiter = new RateLimiter({ requestsPerMinute: 60 });

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for AI operations. Please set OPENAI_API_KEY in your .env file.');
    }
  }

  async chat(messages: ChatMessage[], config: AIConfig = {}): Promise<AIResponse> {
    // Apply rate limiting
    await this.rateLimiter.waitIfNeeded();

    const requestConfig = {
      model: config.model || 'gpt-3.5-turbo',
      messages,
      temperature: config.temperature ?? 0.1,
      max_tokens: config.maxTokens || 3000,
      ...(config.responseFormat === 'json' ? { response_format: { type: "json_object" } } : {})
    };

    const response = await this.makeRequest('/chat/completions', requestConfig);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    return {
      content,
      usage: result.usage ? {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      } : undefined
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/models');
      return response.ok;
    } catch (error) {
      console.log(`❌ AI service health check failed: ${error}`);
      return false;
    }
  }

  private async makeRequest(endpoint: string, body?: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      throw new Error(`Network error calling OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}