import Anthropic from '@anthropic-ai/sdk';
import type { LLMProviderInterface, LLMCompletionOptions, LLMCompletionResult, LLMMessage } from './types';
import { DEFAULT_MODELS } from './types';

export class AnthropicProvider implements LLMProviderInterface {
  provider = 'anthropic' as const;
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private formatMessages(messages: LLMMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    return {
      system: systemMessage?.content,
      messages: nonSystemMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const { messages, config } = options;
    const { system, messages: formattedMessages } = this.formatMessages(messages);

    const response = await this.client.messages.create({
      model: config?.model ?? DEFAULT_MODELS.anthropic,
      max_tokens: config?.maxTokens ?? 4096,
      ...(system && { system }),
      messages: formattedMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');

    return {
      content: textBlock?.type === 'text' ? textBlock.text : '',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<string> {
    const { messages, config } = options;
    const { system, messages: formattedMessages } = this.formatMessages(messages);

    const stream = await this.client.messages.stream({
      model: config?.model ?? DEFAULT_MODELS.anthropic,
      max_tokens: config?.maxTokens ?? 4096,
      ...(system && { system }),
      messages: formattedMessages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }
}
