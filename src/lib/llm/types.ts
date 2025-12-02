import type { LLMProvider, LLMConfig } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  config?: Partial<LLMConfig>;
  stream?: boolean;
}

export interface LLMCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProviderInterface {
  provider: LLMProvider;
  complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
  streamComplete(options: LLMCompletionOptions): AsyncIterable<string>;
}

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  model: DEFAULT_MODELS.openai,
  temperature: 0.7,
  maxTokens: 4096,
};
