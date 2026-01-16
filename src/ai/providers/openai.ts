import type { LLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamCallbacks } from './base';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';

  async complete(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    const start = Date.now();

    let response: Response;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens,
        }),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
          throw new Error('Network connection lost. Please check your internet connection and try again.');
        }
        throw new Error(`Connection failed: ${error.message}`);
      }
      throw new Error('Failed to connect to AI service. Please try again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  async stream(
    messages: LLMMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const start = Date.now();
    let content = '';

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const chunk = JSON.parse(trimmed.slice(6));
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
              content += token;
              callbacks.onToken(token);
            }
          } catch {
          }
        }
      }

      callbacks.onComplete({
        content,
        tokensUsed: { prompt: 0, completion: 0 },
        latencyMs: Date.now() - start,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
