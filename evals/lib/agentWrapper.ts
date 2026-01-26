import type { OpenAIMessage, OpenAIModel, ToolCall } from '../../src/types/chat';
import type { ConversationTurn, AgentResponse } from './types';
import { sendAgentChatMessage } from '../../src/services/ai';
import { executeToolCall, cleanup, type ToolName, type ToolResult } from './toolExecutor';

export interface AgentRunOptions {
  dryRun?: boolean;
  mockToolResults?: Record<string, unknown>;
}

export async function runAgent(
  input: string,
  conversation: ConversationTurn[] | undefined,
  apiKey: string,
  model: OpenAIModel,
  options: AgentRunOptions = {}
): Promise<AgentResponse> {
  const conversationHistory: OpenAIMessage[] = (conversation || []).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  const toolCalls: ToolCall[] = [];
  let response = '';

  const realToolExecutor = async (name: ToolName, args: Record<string, unknown>): Promise<ToolResult> => {
    if (options.mockToolResults?.[name] !== undefined) {
      return {
        success: true,
        data: options.mockToolResults[name],
      };
    }
    return executeToolCall(name, args);
  };

  await sendAgentChatMessage(
    input,
    conversationHistory,
    apiKey,
    model,
    {
      onToken: (token) => {
        response += token;
      },
      onToolCallStart: (tc) => {
        toolCalls.push({ ...tc });
      },
      onToolCallComplete: (tc) => {
        const idx = toolCalls.findIndex((t) => t.id === tc.id);
        if (idx !== -1) {
          toolCalls[idx] = tc;
        }
      },
      onComplete: () => {},
      onError: (err) => {
        throw err;
      },
    },
    undefined,
    {
      dryRun: options.dryRun,
      toolExecutor: options.dryRun ? undefined : realToolExecutor,
    }
  );

  if (options.dryRun && response === '') {
    response = '[Tool calls captured - dry run mode]';
  }

  return { response, toolCalls };
}

export function cleanupEvalResources(): void {
  cleanup();
}
