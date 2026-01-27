import type {
  OpenAIMessage,
  OpenAIMessageWithToolCalls,
  OpenAIToolResultMessage,
  OpenAIStreamChunk,
  OpenAIModel,
  ToolCall,
} from "../types/chat";
import type { RAGContext, FilteredInsight } from "../types/memory";
import {
  executeToolCall,
  formatToolResultForAPI,
  AGENT_TOOLS,
  type ToolName,
  type ToolResult,
} from "./agentTools";
import { AGENT_SYSTEM_PROMPT } from "../ai/prompts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const MODEL_CONTEXT_LIMITS: Record<OpenAIModel, number> = {
  "gpt-5.2": 400_000,
  "gpt-5.1": 400_000,
  "gpt-4.1-mini": 1_000_000,
  "gpt-4.1-nano": 1_000_000,
};

const DEFAULT_CONTEXT_LIMIT = 128_000;
const COMPACTION_THRESHOLD_PERCENT = 0.75;

export function getModelContextLimit(model: OpenAIModel): number {
  return MODEL_CONTEXT_LIMITS[model] ?? DEFAULT_CONTEXT_LIMIT;
}

export function getCompactionThreshold(model: OpenAIModel): number {
  return getModelContextLimit(model) * COMPACTION_THRESHOLD_PERCENT;
}

export function shouldCompact(
  promptTokens: number,
  model: OpenAIModel,
): boolean {
  return promptTokens >= getCompactionThreshold(model);
}

const COMPACTION_SUMMARY_PROMPT = `Summarize this conversation for continuation. Include:
1. User's original goals and preferences
2. Key decisions made and rationale
3. Important facts discovered (dates, names, journal entries referenced)
4. Current task state and next steps

Keep under 1000 tokens. Be factual and concise, not conversational.
Format as a structured summary that can serve as context for continuing the conversation.`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function formatMessagesForAPI(
  messages: { role: "user" | "assistant"; content: string }[],
): OpenAIMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export async function compactConversation(
  messages: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
): Promise<{ summary: string; usage?: TokenUsage }> {
  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: COMPACTION_SUMMARY_PROMPT,
        },
        {
          role: "user",
          content: `Here is the conversation to summarize:\n\n${conversationText}`,
        },
      ],
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Compaction failed: ${response.status}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content || "";
  const usage: TokenUsage | undefined = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      }
    : undefined;

  return { summary, usage };
}

export function clearOldToolResults(
  messages: (
    | OpenAIMessage
    | OpenAIMessageWithToolCalls
    | OpenAIToolResultMessage
  )[],
  keepRecentCount: number = 5,
): (OpenAIMessage | OpenAIMessageWithToolCalls | OpenAIToolResultMessage)[] {
  const toolResultIndices: number[] = [];

  messages.forEach((msg, idx) => {
    if (msg.role === "tool") {
      toolResultIndices.push(idx);
    }
  });

  const indicesToClear = toolResultIndices.slice(0, -keepRecentCount);

  return messages.map((msg, idx) => {
    if (indicesToClear.includes(idx) && msg.role === "tool") {
      return {
        ...msg,
        content: "[Tool result cleared to save context space]",
      };
    }
    return msg;
  });
}

export interface AgentStreamCallbacks extends StreamCallbacks {
  onToolCallStart?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolCall: ToolCall) => void;
  onContext?: (context: RAGContext) => void;
  onUsage?: (usage: TokenUsage) => void;
}

export interface AgentOptions {
  dryRun?: boolean;
  toolExecutor?: (
    name: ToolName,
    args: Record<string, unknown>,
  ) => Promise<ToolResult>;
}

export async function sendAgentChatMessage(
  userMessage: string,
  conversationHistory: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
  options?: AgentOptions,
): Promise<void> {
  try {
    const today = new Date();
    const currentDate = today.toISOString().split("T")[0];
    const systemPrompt = AGENT_SYSTEM_PROMPT.replace(
      "{{currentDate}}",
      currentDate,
    );

    const messages: (
      | OpenAIMessage
      | OpenAIMessageWithToolCalls
      | OpenAIToolResultMessage
    )[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const firstResponse = await streamWithTools(
      messages,
      apiKey,
      model,
      { ...callbacks, onComplete: () => {} },
      signal,
    );

    if (!firstResponse.toolCalls || firstResponse.toolCalls.length === 0) {
      callbacks.onComplete();
      return;
    }

    if (options?.dryRun) {
      for (const toolCall of firstResponse.toolCalls) {
        callbacks.onToolCallStart?.(toolCall);
        callbacks.onToolCallComplete?.({
          ...toolCall,
          result: JSON.stringify({ dryRun: true }),
          status: "completed",
        });
      }
      callbacks.onComplete();
      return;
    }

    const toolMessages: OpenAIToolResultMessage[] = [];
    const allCitations: Array<{ entryId: string }> = [];
    const allInsights: FilteredInsight[] = [];
    let contextText = "";

    const executor = options?.toolExecutor ?? executeToolCall;

    for (const toolCall of firstResponse.toolCalls) {
      callbacks.onToolCallStart?.(toolCall);

      const result = await executor(
        toolCall.name as ToolName,
        JSON.parse(toolCall.arguments),
      );

      callbacks.onToolCallComplete?.({
        ...toolCall,
        result: formatToolResultForAPI(result),
        status: "completed",
      });

      if (result.success && Array.isArray(result.data)) {
        const toolName = toolCall.name as ToolName;

        if (toolName === "query_insights") {
          const insights = result.data as Array<{
            type: string;
            name?: string;
            emotion?: string;
            entryId?: string;
            entryIds?: string[];
            entryDate?: string;
            mostRecentDate?: string;
            relationship?: string;
            sentiment?: string;
            context?: string;
            intensity?: number;
            trigger?: string;
          }>;

          const allEntryIds = new Set<string>();

          for (const insight of insights) {
            if (insight.entryId) {
              const formattedInsight: FilteredInsight =
                insight.type === "person"
                  ? {
                      type: "person",
                      name: insight.name || "",
                      relationship: insight.relationship,
                      sentiment: insight.sentiment || "neutral",
                      context: insight.context,
                      entryId: insight.entryId,
                      entryDate: insight.entryDate || "",
                    }
                  : {
                      type: "emotion",
                      emotion: insight.emotion || "",
                      intensity: insight.intensity || 5,
                      trigger: insight.trigger,
                      sentiment: (insight.sentiment || "neutral") as
                        | "positive"
                        | "negative"
                        | "neutral",
                      entryId: insight.entryId,
                      entryDate: insight.entryDate || "",
                    };
              allInsights.push(formattedInsight);
              allEntryIds.add(insight.entryId);
            }

            if (
              insight.entryIds &&
              Array.isArray(insight.entryIds) &&
              insight.entryIds.length > 0
            ) {
              const displayDate =
                insight.mostRecentDate || insight.entryDate || "";
              const firstEntryId = insight.entryIds[0];

              const formattedInsight: FilteredInsight =
                insight.type === "person"
                  ? {
                      type: "person",
                      name: insight.name || "",
                      relationship: insight.relationship,
                      sentiment: insight.sentiment || "neutral",
                      context: insight.context,
                      entryId: firstEntryId,
                      entryDate: displayDate,
                    }
                  : {
                      type: "emotion",
                      emotion: insight.emotion || "",
                      intensity: insight.intensity || 5,
                      trigger: insight.trigger,
                      sentiment: (insight.sentiment || "neutral") as
                        | "positive"
                        | "negative"
                        | "neutral",
                      entryId: firstEntryId,
                      entryDate: displayDate,
                    };
              allInsights.push(formattedInsight);
              allEntryIds.add(firstEntryId);
            }
          }

          for (const entryId of allEntryIds) {
            if (!allCitations.some((c) => c.entryId === entryId)) {
              allCitations.push({ entryId });
            }
          }

          const contextParts: string[] = ["INSIGHTS:"];
          for (const insight of allInsights) {
            if (insight.type === "person") {
              const rel = insight.relationship
                ? ` (${insight.relationship})`
                : "";
              contextParts.push(
                `\n• ${insight.name}${rel} [${insight.sentiment}] on ${insight.entryDate}`,
              );
              if (insight.context) {
                contextParts.push(`  Context: ${insight.context}`);
              }
            } else {
              contextParts.push(
                `\n• ${insight.emotion} (intensity: ${insight.intensity}/10) [${insight.sentiment}] on ${insight.entryDate}`,
              );
              if (insight.trigger) {
                contextParts.push(`  Trigger: ${insight.trigger}`);
              }
            }
          }
          contextText = contextParts.join("\n");
        } else if (
          toolName === "query_entries" ||
          toolName === "get_entries_by_ids"
        ) {
          const entryData = result.data as Array<{
            entryId?: string;
            date?: string;
            content?: string;
            snippet?: string;
          }>;

          for (const item of entryData) {
            if (
              item.entryId &&
              !allCitations.some((c) => c.entryId === item.entryId)
            ) {
              allCitations.push({ entryId: item.entryId });
            }
          }

          const contextParts: string[] = ["JOURNAL ENTRIES:"];
          for (const item of entryData) {
            if (item.date) {
              contextParts.push(`\n--- Entry from ${item.date} ---`);
              if (item.content) {
                contextParts.push(item.content);
              } else if (item.snippet) {
                contextParts.push(item.snippet);
              }
            }
          }
          contextText = contextParts.join("\n");
        }
      }

      toolMessages.push({
        role: "tool",
        content: formatToolResultForAPI(result),
        tool_call_id: toolCall.id,
      });
    }

    if (allCitations.length > 0 || allInsights.length > 0 || contextText) {
      callbacks.onContext?.({
        citations: allCitations,
        entities: [],
        contextText: contextText || JSON.stringify(allCitations),
        insights: allInsights.length > 0 ? allInsights : undefined,
      });
    }

    const messagesWithTools: (
      | OpenAIMessage
      | OpenAIMessageWithToolCalls
      | OpenAIToolResultMessage
    )[] = [
      ...messages,
      {
        role: "assistant",
        content: firstResponse.content || "",
        tool_calls: firstResponse.toolCalls.map((tc, idx) => ({
          index: idx,
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      },
      ...toolMessages,
    ];

    await streamWithTools(messagesWithTools, apiKey, model, callbacks, signal);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

interface StreamWithToolsResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
}

async function streamWithTools(
  messages: (
    | OpenAIMessage
    | OpenAIMessageWithToolCalls
    | OpenAIToolResultMessage
  )[],
  apiKey: string,
  model: string,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<StreamWithToolsResult> {
  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw error;
      }
      if (
        error.message.includes("network") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("Load failed")
      ) {
        throw new Error(
          "Network connection lost. Check your internet connection and try again.",
        );
      }
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ETIMEDOUT")
      ) {
        throw new Error(
          "Cannot reach OpenAI servers. Check your internet connection or try again later.",
        );
      }
      throw new Error(`Connection failed: ${error.message}`);
    }
    throw new Error("Failed to connect to OpenAI. Please try again.");
  }

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;

    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error?.code) {
        switch (errorData.error.code) {
          case "invalid_api_key":
            errorMessage =
              "Invalid API key. Please check your OpenAI API key in Settings.";
            break;
          case "insufficient_quota":
            errorMessage =
              "OpenAI API quota exceeded. Please check your billing status at OpenAI.";
            break;
          case "model_not_found":
            errorMessage =
              "Selected model not available. Try changing the model in Settings.";
            break;
          case "context_length_exceeded":
            errorMessage = "Message too long. Try starting a new conversation.";
            break;
          case "rate_limit_exceeded":
            errorMessage =
              "Rate limit exceeded. Please wait a moment and try again.";
            break;
          default:
            errorMessage = `OpenAI error: ${errorData.error.code}`;
        }
      }
    } catch {
      switch (response.status) {
        case 401:
          errorMessage =
            "Invalid API key. Please check your OpenAI API key in Settings.";
          break;
        case 429:
          errorMessage =
            "Rate limit exceeded. Please wait a moment and try again.";
          break;
        case 500:
        case 502:
        case 503:
          errorMessage =
            "OpenAI servers are experiencing issues. Please try again later.";
          break;
        case 504:
          errorMessage = "Request timed out. Please try again.";
          break;
        default:
          errorMessage = `API error: ${response.status}`;
      }
    }

    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls: ToolCall[] = [];
  let usage: TokenUsage | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const chunk = JSON.parse(trimmed.slice(6)) as OpenAIStreamChunk & {
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          };
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            content += delta.content;
            callbacks.onToken(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || "",
                  name: tc.function?.name || "",
                  arguments: "",
                  status: "running",
                };
              }
              if (tc.function?.name) {
                toolCalls[tc.index].name = tc.function.name;
              }
              if (tc.function?.arguments) {
                toolCalls[tc.index].arguments += tc.function.arguments;
              }
            }
          }

          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
            callbacks.onUsage?.(usage);
          }
        } catch {}
      }
    }

    callbacks.onComplete();
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw error;
  }
}
