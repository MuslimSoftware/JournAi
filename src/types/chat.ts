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
