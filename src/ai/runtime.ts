import {
  getModule,
  ChatModule,
  ToolRouterModule,
  type ChatInput,
  type ChatOutput,
  type ToolRouterInput,
  type ToolRouterOutput,
  type ModuleContext,
} from './modules';
import { getProvider, type LLMConfig, type StreamCallbacks as ProviderStreamCallbacks } from './providers';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

let initialized = false;

export async function initializeRuntime(): Promise<void> {
  if (initialized) return;

  initialized = true;
}

export interface RuntimeConfig {
  provider: string;
  llmConfig: LLMConfig;
}

export class JournalAIRuntime {
  private readonly ctx: ModuleContext;
  private readonly chatModule: ChatModule;
  private readonly toolRouter: ToolRouterModule;

  constructor(config: RuntimeConfig) {
    this.ctx = {
      provider: getProvider(config.provider),
      config: config.llmConfig,
    };
    this.chatModule = getModule<ChatModule>('journal-chat');
    this.toolRouter = getModule<ToolRouterModule>('tool-router');
  }

  getModule(moduleId: string) {
    if (moduleId === 'journal-chat') return this.chatModule;
    if (moduleId === 'tool-router') return this.toolRouter;
    throw new Error(`Unknown module: ${moduleId}`);
  }

  async routeQuery(query: string, currentDate: string): Promise<ToolRouterOutput> {
    const input: ToolRouterInput = {
      query,
      availableTools: ['search_journal', 'get_insights', 'get_entries_by_date'],
      currentDate,
    };
    return this.toolRouter.forward(this.ctx, input);
  }

  async generateResponse(
    query: string,
    context: string,
    conversationHistory: string,
    currentDate: string
  ): Promise<ChatOutput> {
    const input: ChatInput = {
      query,
      context,
      conversationHistory,
      currentDate,
    };
    return this.chatModule.forward(this.ctx, input);
  }

  async streamResponse(
    query: string,
    context: string,
    conversationHistory: string,
    currentDate: string,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const messages = [
      { role: 'system' as const, content: this.chatModule.activePrompt.replace('{{currentDate}}', currentDate) },
      {
        role: 'user' as const,
        content: `Question: ${query}\n\nJournal Context:\n${context}\n\nConversation History:\n${conversationHistory}`,
      },
    ];

    const wrappedCallbacks: ProviderStreamCallbacks = {
      onToken: callbacks.onToken,
      onComplete: (_response) => callbacks.onComplete(),
      onError: callbacks.onError,
    };

    await this.ctx.provider.stream(messages, this.ctx.config, wrappedCallbacks, signal);
  }
}
