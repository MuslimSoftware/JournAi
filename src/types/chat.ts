import type { Citation, RAGContext } from './memory';

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
  citations?: Citation[];
  ragContext?: RAGContext;
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

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

export interface OpenAIToolCall {
  index: number;
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface OpenAIStreamDelta {
  role?: string;
  content?: string;
  tool_calls?: OpenAIToolCallDelta[];
}

export interface OpenAIMessageWithToolCalls extends OpenAIMessage {
  role: 'assistant';
  tool_calls?: OpenAIToolCall[];
}

export interface OpenAIToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
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
