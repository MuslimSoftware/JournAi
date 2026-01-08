import type { OpenAIMessage, OpenAIStreamChunk, OpenAIModel } from '../types/chat';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You help users reflect on their thoughts, answer questions, and provide supportive conversation.
Be warm, empathetic, and encouraging while remaining helpful and informative.`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function sendChatMessage(
  messages: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const messagesWithSystem: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messagesWithSystem,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

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
          const chunk: OpenAIStreamChunk = JSON.parse(trimmed.slice(6));
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            callbacks.onToken(content);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    callbacks.onComplete();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export function formatMessagesForAPI(
  messages: { role: 'user' | 'assistant'; content: string }[]
): OpenAIMessage[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
}
