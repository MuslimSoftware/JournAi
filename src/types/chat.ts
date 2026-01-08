export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ThinkingBlock {
  id: string;
  content: string;
  isExpanded: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  isStreaming?: boolean;
  thinking?: ThinkingBlock;
  toolCalls?: ToolCall[];
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isThinking: boolean;
  error: string | null;
}

export type OpenAIModel = 'gpt-5.2' | 'gpt-5.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIStreamDelta {
  role?: string;
  content?: string;
}

export interface OpenAIStreamChoice {
  index: number;
  delta: OpenAIStreamDelta;
  finish_reason: string | null;
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
}

export interface AISettings {
  apiKey: string;
  model: OpenAIModel;
}
