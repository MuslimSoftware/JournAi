export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
  };
  latencyMs: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (response: LLMResponse) => void;
  onError: (error: Error) => void;
}

export interface LLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
  stream(
    messages: LLMMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void>;
}
