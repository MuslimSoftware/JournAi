import type {
  OpenAIMessage,
  OpenAIStreamChunk,
  OpenAIModel,
  OpenAIToolCall,
  OpenAIMessageWithToolCalls,
  OpenAIToolResultMessage,
  ToolCall,
} from '../types/chat';
import type { RAGContext } from '../types/memory';
import { hybridSearch, type SearchResult } from './search';
import { getEntriesByDateRange, getEntriesByIds } from './entries';
import { getAggregatedInsights } from './analytics';
import {
  AGENT_TOOLS,
  executeToolCall,
  formatToolResultForAPI,
  type ToolName,
} from './agentTools';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You help users reflect on their thoughts, answer questions, and provide supportive conversation.
Be warm, empathetic, and encouraging while remaining helpful and informative.`;

const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You have access to two types of information from the user's journal:

1. **Pre-Analyzed Insights** (if present): Aggregated themes, emotions, goals, people mentioned, and behavioral patterns extracted from all journal entries. Use these for questions about patterns, trends, or "how am I doing" type questions.

2. **Relevant Journal Entries**: Specific entries found via semantic search, relevant to the current question. Use these for specific questions, to provide evidence, or to give context with dates.

CRITICAL RULES:
- If the Pre-Analyzed Insights section says "No analytics data available", you MUST tell the user that analytics haven't been generated yet. DO NOT make up or infer patterns from journal entries - only report actual analyzed insights.
- If no journal entries are provided or the context is empty, do NOT claim to have read journal entries. Be honest that you don't have access to specific entries for this query.
- If unsure whether the user wants you to look at their journal, ask for clarification.
- For general conversation or questions not about the journal, respond naturally without referencing journal context.

When answering questions:
- For pattern/trend questions: ONLY use Pre-Analyzed Insights. If none exist, tell the user.
- For specific questions: Reference journal entries by date if provided
- Combine both when useful - insights for the big picture, entries for specific examples
- Be warm and empathetic while providing actionable insights
- If asked about something not covered in the context, say so honestly

CONTEXT FROM JOURNAL:
{context}

Remember: This is the user's private journal. Treat it with care and respect.`;

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

const TEMPORAL_PATTERNS = [
  /\b(this|last|past)\s+(week|month|year)\b/i,
  /\bsummar(y|ize|ise)\b/i,
  /\b(recent|lately|recently)\b/i,
  /\bover(view|all)\b/i,
  /\bhow\s+(have|has|was|did)\s+(i|my)\b/i,
  /\bwhat\s+(have|has)\s+(happened|been)\b/i,
];

const MAX_CONTEXT_CHARS = 30000;

function isTemporalQuery(query: string): boolean {
  return TEMPORAL_PATTERNS.some(pattern => pattern.test(query));
}

function extractDateRange(query: string): { start: string; end: string } | undefined {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const weekMatch = query.match(/\b(this|last|past)\s+week\b/i);
  if (weekMatch) {
    const daysBack = weekMatch[1].toLowerCase() === 'this' ? 7 : 14;
    const start = new Date(now);
    start.setDate(start.getDate() - daysBack);
    return { start: start.toISOString().split('T')[0], end: today };
  }

  const monthMatch = query.match(/\b(this|last|past)\s+month\b/i);
  if (monthMatch) {
    const daysBack = monthMatch[1].toLowerCase() === 'this' ? 30 : 60;
    const start = new Date(now);
    start.setDate(start.getDate() - daysBack);
    return { start: start.toISOString().split('T')[0], end: today };
  }

  const yearMatch = query.match(/\b(this|last|past)\s+year\b/i);
  if (yearMatch) {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    return { start: start.toISOString().split('T')[0], end: today };
  }

  if (/\b(recent|lately|recently)\b/i.test(query)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    return { start: start.toISOString().split('T')[0], end: today };
  }

  if (/\bsummar(y|ize|ise)\b/i.test(query) && !query.match(/\b(month|year)\b/i)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 8);
    return { start: start.toISOString().split('T')[0], end: today };
  }

  return undefined;
}

function getSearchLimit(query: string): number {
  return isTemporalQuery(query) ? 15 : 8;
}

function isSummaryQuery(query: string): boolean {
  return /\bsummar(y|ize|ise)\b/i.test(query) ||
    /\b(overview|review)\s+(of\s+)?(my|this|last|past)\s+(week|month)\b/i.test(query) ||
    /\bhow\s+(was|did|have)\s+(my|this|last)\s+(week|month)\b/i.test(query);
}

function isInsightQuery(query: string): boolean {
  return /\b(pattern|patterns|trend|trends|theme|themes|insight|insights)\b/i.test(query) ||
    /\b(notice|observe|see)\s+(any|a)?\s*(pattern|trend|theme)/i.test(query) ||
    /\bwhat\s+(do|did|have)\s+(you|i)\s+(notice|see|observe)/i.test(query) ||
    /\bhow\s+(am|have)\s+i\s+(doing|been|changed)/i.test(query);
}

function requiresJournalContext(query: string): boolean {
  const journalIndicators = [
    /\b(my|i|i've|i'm|i'd|i'll)\s+(journal|entries|wrote|write|said|felt|feel|thought|think|did|do|have|had|was|am|been|experienced)/i,
    /\b(journal|entries|entry|diary|logs?)\b/i,
    /\b(yesterday|today|last\s+(week|month|year)|this\s+(week|month|year)|recently|lately)\b/i,
    /\b(remind|remember|recall|mentioned|wrote\s+about|talked\s+about)\b/i,
    /\b(pattern|patterns|trend|trends|theme|themes|insight|insights)\b/i,
    /\b(summar|overview|review|reflect|analyze|analysis)\w*\b/i,
    /\b(how\s+(have|has|was|did|am)\s+(i|my))\b/i,
    /\b(what\s+(have|has|did)\s+i)\b/i,
    /\b(when\s+did\s+i|where\s+did\s+i|why\s+did\s+i)\b/i,
    /\b(my\s+(life|health|career|relationship|goal|progress|habit|routine|mood|feeling|emotion))/i,
  ];
  return journalIndicators.some(pattern => pattern.test(query));
}

async function buildInsightsContext(): Promise<{ context: string; hasData: boolean }> {
  const insights = await getAggregatedInsights();

  const hasAnyInsights = insights.themes.length > 0 ||
    insights.emotions.length > 0 ||
    insights.goals.length > 0 ||
    insights.people.length > 0 ||
    insights.patterns.length > 0;

  if (!hasAnyInsights) {
    return {
      context: '## Pre-Analyzed Journal Insights\n\n**No analytics data available.** The journal entries have not been analyzed yet. You cannot answer questions about patterns, trends, or insights until the analytics have been generated.\n\n',
      hasData: false
    };
  }

  let context = '## Pre-Analyzed Journal Insights\n\n';

  if (insights.themes.length > 0) {
    context += '### Recurring Themes\n';
    for (const t of insights.themes.slice(0, 5)) {
      context += `- **${t.theme}** (${t.count} entries, most recent: ${t.recentDate})\n`;
    }
    context += '\n';
  }

  if (insights.emotions.length > 0) {
    context += '### Emotional Patterns\n';
    for (const e of insights.emotions.slice(0, 5)) {
      context += `- ${e.emotion} (${e.count} occurrences)\n`;
    }
    context += '\n';
  }

  if (insights.goals.length > 0) {
    context += '### Goals & Intentions\n';
    for (const g of insights.goals.slice(0, 5)) {
      context += `- ${g.goal} (mentioned ${g.mentions} times)\n`;
    }
    context += '\n';
  }

  if (insights.people.length > 0) {
    context += '### Key People\n';
    for (const p of insights.people.slice(0, 5)) {
      context += `- **${p.name}** - ${p.mentions} mentions\n`;
    }
    context += '\n';
  }

  if (insights.patterns.length > 0) {
    context += '### Behavioral Patterns\n';
    for (const p of insights.patterns.slice(0, 5)) {
      context += `- ${p.pattern} (${p.frequency}, ${p.firstSeen} to ${p.lastSeen})\n`;
    }
    context += '\n';
  }

  return { context, hasData: true };
}

function buildContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No relevant journal entries found for this query.';
  }

  const sortedResults = [...results].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let contextParts: string[] = [];
  let totalLength = 0;

  for (const r of sortedResults) {
    const entryText = `[${r.date}]\n${r.content}`;
    if (totalLength + entryText.length > MAX_CONTEXT_CHARS) {
      const remaining = MAX_CONTEXT_CHARS - totalLength;
      if (remaining > 500) {
        contextParts.push(`[${r.date}]\n${r.content.slice(0, remaining - 50)}...`);
      }
      break;
    }
    contextParts.push(entryText);
    totalLength += entryText.length;
  }

  return contextParts.join('\n\n---\n\n');
}

export interface RAGStreamCallbacks extends StreamCallbacks {
  onContext?: (context: RAGContext) => void;
}

export interface RAGOptions {
  existingEntryIds?: string[];
}

export async function sendRAGChatMessage(
  userMessage: string,
  conversationHistory: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
  callbacks: RAGStreamCallbacks,
  signal?: AbortSignal,
  options?: RAGOptions
): Promise<void> {
  let searchResults: SearchResult[] = [];
  let insightsContext = '';
  const dateRange = extractDateRange(userMessage);
  const summaryQuery = isSummaryQuery(userMessage);
  const hasExistingContext = options?.existingEntryIds && options.existingEntryIds.length > 0;
  const insightQuery = isInsightQuery(userMessage);
  const needsJournalContext = requiresJournalContext(userMessage);

  if (insightQuery) {
    try {
      const { context } = await buildInsightsContext();
      insightsContext = context;
    } catch (error) {
      console.error('Failed to build insights context:', error);
    }
  }

  const shouldFetchEntries = (needsJournalContext && !insightQuery) || summaryQuery || hasExistingContext;

  if (shouldFetchEntries) {
    try {
      let newResults: SearchResult[] = [];

      if (summaryQuery && dateRange) {
        const entries = await getEntriesByDateRange(dateRange.start, dateRange.end);
        newResults = entries.map(e => ({
          id: e.id,
          entryId: e.id,
          date: e.date,
          content: e.content,
          snippet: e.content,
          score: 1,
          source: 'hybrid' as const,
        }));
      } else if (needsJournalContext && !insightQuery) {
        const searchLimit = getSearchLimit(userMessage);
        newResults = await hybridSearch(userMessage, { limit: searchLimit, dateRange });
      }

      if (hasExistingContext) {
        const existingIds = new Set(options.existingEntryIds);
        const newIds = new Set(newResults.map(r => r.entryId));
        const idsToFetch = [...existingIds].filter(id => !newIds.has(id));

        if (idsToFetch.length > 0) {
          const existingEntries = await getEntriesByIds(idsToFetch);
          const existingResults = existingEntries.map(e => ({
            id: e.id,
            entryId: e.id,
            date: e.date,
            content: e.content,
            snippet: e.content,
            score: 0.5,
            source: 'hybrid' as const,
          }));
          searchResults = [...newResults, ...existingResults];
        } else {
          searchResults = newResults;
        }
      } else {
        searchResults = newResults;
      }
    } catch (error) {
      console.error('Search failed, continuing without context:', error);
    }
  }

  let contextText = '';
  if (insightsContext) {
    contextText = insightsContext;
  }
  if (searchResults.length > 0) {
    const entriesContext = buildContextFromResults(searchResults);
    contextText = contextText ? contextText + '\n---\n\n' + entriesContext : entriesContext;
  }
  if (!contextText) {
    contextText = 'No journal context loaded for this query.';
  }
  const context: RAGContext = {
    citations: searchResults.map(r => ({
      entryId: r.entryId,
    })),
    entities: [],
    contextText,
  };

  callbacks.onContext?.(context);

  const systemPrompt = RAG_SYSTEM_PROMPT.replace('{context}', contextText);

  const messagesWithContext: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messagesWithContext,
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

function getAgentSystemPrompt(): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  return `You are a helpful AI assistant for a journaling app called JournAi.
You have access to tools to search and analyze the user's journal entries.

TODAY'S DATE: ${dateStr} (${dayName})

WHEN TO USE TOOLS:
- Use search_journal when the user asks about specific topics, events, or things they wrote
- Use get_insights for questions about patterns, trends, themes, or "how am I doing"
- Use get_entries_by_date for time-based summaries like "this week" or "last month"
- For general conversation not about the journal, respond directly without tools

DATE CALCULATIONS:
- "this week" = last 7 days from today
- "last week" = 7-14 days ago
- "this month" = last 30 days from today
- "last month" = 30-60 days ago

IMPORTANT:
- Only use tools when the question relates to the user's journal
- If tools return no results or empty data, tell the user honestly
- Reference specific dates when citing journal entries
- Be warm, empathetic, and supportive
- This is the user's private journal - treat it with care and respect`;
}

export interface AgentStreamCallbacks extends StreamCallbacks {
  onToolCallStart?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolCall: ToolCall) => void;
  onContext?: (context: RAGContext) => void;
}

type AgentMessage = OpenAIMessage | OpenAIMessageWithToolCalls | OpenAIToolResultMessage;

interface AgentStreamResult {
  content: string;
  toolCalls: OpenAIToolCall[] | null;
  finishReason: string | null;
}

async function processAgentStream(
  response: Response,
  callbacks: AgentStreamCallbacks,
  _signal?: AbortSignal
): Promise<AgentStreamResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const toolCallsMap = new Map<number, OpenAIToolCall>();
  let finishReason: string | null = null;

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
          const choice = chunk.choices[0];

          if (choice?.finish_reason) {
            finishReason = choice.finish_reason;
          }

          const delta = choice?.delta;
          if (!delta) continue;

          if (delta.content) {
            content += delta.content;
            callbacks.onToken(delta.content);
          }

          if (delta.tool_calls) {
            for (const tcDelta of delta.tool_calls) {
              const index = tcDelta.index;

              if (!toolCallsMap.has(index)) {
                toolCallsMap.set(index, {
                  index,
                  id: '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                });
              }

              const tc = toolCallsMap.get(index)!;

              if (tcDelta.id) tc.id += tcDelta.id;
              if (tcDelta.function?.name) tc.function.name += tcDelta.function.name;
              if (tcDelta.function?.arguments) tc.function.arguments += tcDelta.function.arguments;
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { content, toolCalls: null, finishReason: 'abort' };
    }
    throw error;
  }

  const toolCalls =
    toolCallsMap.size > 0
      ? Array.from(toolCallsMap.values()).sort((a, b) => a.index - b.index)
      : null;

  return { content, toolCalls, finishReason };
}

export async function sendAgentChatMessage(
  userMessage: string,
  conversationHistory: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
  maxIterations: number = 5
): Promise<void> {
  const messages: AgentMessage[] = [
    { role: 'system', content: getAgentSystemPrompt() },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const citedEntryIds = new Set<string>();
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        stream: true,
        parallel_tool_calls: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const { content, toolCalls, finishReason } = await processAgentStream(
      response,
      callbacks,
      signal
    );

    if (finishReason === 'stop' || !toolCalls || toolCalls.length === 0) {
      callbacks.onComplete();

      if (citedEntryIds.size > 0) {
        callbacks.onContext?.({
          citations: Array.from(citedEntryIds).map((id) => ({ entryId: id })),
          entities: [],
        });
      }
      return;
    }

    const assistantMessage: OpenAIMessageWithToolCalls = {
      role: 'assistant',
      content: content || '',
      tool_calls: toolCalls,
    };
    messages.push(assistantMessage);

    for (const toolCall of toolCalls) {
      const toolCallState: ToolCall = {
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        status: 'running',
      };

      callbacks.onToolCallStart?.(toolCallState);

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(toolCall.function.name as ToolName, args);

        if (result.success && Array.isArray(result.data)) {
          for (const item of result.data as Array<{ entryId?: string; id?: string }>) {
            if (item.entryId) citedEntryIds.add(item.entryId);
            if (item.id) citedEntryIds.add(item.id);
          }
        }

        const resultContent = formatToolResultForAPI(result);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: resultContent,
        });

        toolCallState.result = resultContent;
        toolCallState.status = 'completed';
        callbacks.onToolCallComplete?.(toolCallState);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: errorMsg }),
        });

        toolCallState.result = errorMsg;
        toolCallState.status = 'error';
        callbacks.onToolCallComplete?.(toolCallState);
      }
    }
  }

  callbacks.onError(new Error('Max iterations reached'));
}
