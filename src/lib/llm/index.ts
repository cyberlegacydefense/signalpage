import type { LLMProvider } from '@/types';
import type { LLMProviderInterface, LLMCompletionOptions, LLMCompletionResult } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { DEFAULT_MODELS } from './types';

export * from './types';

class LLMClient {
  private providers: Map<LLMProvider, LLMProviderInterface> = new Map();
  private defaultProvider: LLMProvider;

  constructor() {
    this.defaultProvider = (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'openai';
  }

  private getProvider(provider?: LLMProvider): LLMProviderInterface {
    const p = provider ?? this.defaultProvider;

    if (!this.providers.has(p)) {
      switch (p) {
        case 'openai':
          this.providers.set(p, new OpenAIProvider());
          break;
        case 'anthropic':
          this.providers.set(p, new AnthropicProvider());
          break;
        default:
          throw new Error(`Unknown LLM provider: ${p}`);
      }
    }

    return this.providers.get(p)!;
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const provider = this.getProvider(options.config?.provider);
    return provider.complete(options);
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<string> {
    const provider = this.getProvider(options.config?.provider);
    yield* provider.streamComplete(options);
  }

  getDefaultModel(provider?: LLMProvider): string {
    return DEFAULT_MODELS[provider ?? this.defaultProvider];
  }
}

// Singleton instance
let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}

// Convenience function for simple completions
export async function complete(
  prompt: string,
  options?: Partial<LLMCompletionOptions>
): Promise<string> {
  const client = getLLMClient();
  const result = await client.complete({
    messages: [
      ...(options?.messages ?? []),
      { role: 'user', content: prompt },
    ],
    config: options?.config,
  });
  return result.content;
}
