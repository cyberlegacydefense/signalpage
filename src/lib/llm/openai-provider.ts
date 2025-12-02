import OpenAI from 'openai';
import type { LLMProviderInterface, LLMCompletionOptions, LLMCompletionResult } from './types';
import { DEFAULT_MODELS } from './types';

export class OpenAIProvider implements LLMProviderInterface {
  provider = 'openai' as const;
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const { messages, config } = options;

    const response = await this.client.chat.completions.create({
      model: config?.model ?? DEFAULT_MODELS.openai,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens ?? 4096,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content ?? '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<string> {
    const { messages, config } = options;

    const stream = await this.client.chat.completions.create({
      model: config?.model ?? DEFAULT_MODELS.openai,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
