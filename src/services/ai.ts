import type {
  OpenAIMessage,
  OpenAIMessageWithToolCalls,
  OpenAIToolResultMessage,
  OpenAIStreamChunk,
  OpenAIModel,
  ToolCall,
} from '../types/chat';
import type { RAGContext, FilteredInsight } from '../types/memory';
import { hybridSearch, type SearchResult } from './search';
import { getEntriesByDateRange, getEntriesByIds } from './entries';
import { getAggregatedInsights } from './analytics';
import {
  executeToolCall,
  formatToolResultForAPI,
  AGENT_TOOLS,
  type ToolName,
} from './agentTools';
import { initializeRuntime, JournalAIRuntime } from '../ai';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You help users reflect on their thoughts, answer questions, and provide supportive conversation.
Be warm, empathetic, and encouraging while remaining helpful and informative.`;

const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You have access to two types of information from the user's journal:

1. **Pre-Analyzed Insights** (if present): Aggregated emotions and people mentioned extracted from all journal entries. Use these for questions about emotional patterns or relationships.

2. **Relevant Journal Entries**: Specific entries found via semantic search, relevant to the current question. Use these for specific questions, to provide evidence, or to give context with dates.

CRITICAL RULES:
- If the Pre-Analyzed Insights section says "No analytics data available", you MUST tell the user that analytics haven't been generated yet. DO NOT make up or infer insights from journal entries - only report actual analyzed insights.
- If no journal entries are provided or the context is empty, do NOT claim to have read journal entries. Be honest that you don't have access to specific entries for this query.
- If unsure whether the user wants you to look at their journal, ask for clarification.
- For general conversation or questions not about the journal, respond naturally without referencing journal context.

When answering questions:
- For emotional/relationship questions: ONLY use Pre-Analyzed Insights. If none exist, tell the user.
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

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
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
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      if (error.message.includes('network') || error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
        throw new Error('Network connection lost. Check your internet connection and try again.');
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        throw new Error('Cannot reach OpenAI servers. Check your internet connection or try again later.');
      }
      throw new Error(`Connection failed: ${error.message}`);
    }
    throw new Error('Failed to connect to OpenAI. Please try again.');
  }

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;

    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error?.code) {
        switch (errorData.error.code) {
          case 'invalid_api_key':
            errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
            break;
          case 'insufficient_quota':
            errorMessage = 'OpenAI API quota exceeded. Please check your billing status at OpenAI.';
            break;
          case 'model_not_found':
            errorMessage = 'Selected model not available. Try changing the model in Settings.';
            break;
          case 'context_length_exceeded':
            errorMessage = 'Message too long. Try starting a new conversation.';
            break;
          case 'rate_limit_exceeded':
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            break;
          default:
            errorMessage = `OpenAI error: ${errorData.error.code}`;
        }
      }
    } catch {
      switch (response.status) {
        case 401:
          errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = 'OpenAI servers are experiencing issues. Please try again later.';
          break;
        case 504:
          errorMessage = 'Request timed out. Please try again.';
          break;
        default:
          errorMessage = `API error: ${response.status}`;
      }
    }

    throw new Error(errorMessage);
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
  return /\b(emotion|emotions|feeling|feelings|mood|moods)\b/i.test(query) ||
    /\b(people|person|relationship|relationships)\b/i.test(query) ||
    /\bwhat\s+(do|did|have)\s+(you|i)\s+(notice|see|observe)/i.test(query) ||
    /\bhow\s+(am|have)\s+i\s+(doing|been|changed)/i.test(query);
}

function requiresJournalContext(query: string): boolean {
  const journalIndicators = [
    /\b(my|i|i've|i'm|i'd|i'll)\s+(journal|entries|wrote|write|said|felt|feel|thought|think|did|do|have|had|was|am|been|experienced)/i,
    /\b(journal|entries|entry|diary|logs?)\b/i,
    /\b(yesterday|today|last\s+(week|month|year)|this\s+(week|month|year)|recently|lately)\b/i,
    /\b(remind|remember|recall|mentioned|wrote\s+about|talked\s+about)\b/i,
    /\b(emotion|emotions|feeling|feelings|mood|moods|people|person|relationship|relationships)\b/i,
    /\b(summar|overview|review|reflect|analyze|analysis)\w*\b/i,
    /\b(how\s+(have|has|was|did|am)\s+(i|my))\b/i,
    /\b(what\s+(have|has|did)\s+i)\b/i,
    /\b(when\s+did\s+i|where\s+did\s+i|why\s+did\s+i)\b/i,
    /\b(my\s+(life|health|career|relationship|habit|routine|mood|feeling|emotion))/i,
  ];
  return journalIndicators.some(pattern => pattern.test(query));
}

async function buildInsightsContext(): Promise<{ context: string; hasData: boolean }> {
  const insights = await getAggregatedInsights();

  const hasAnyInsights = insights.emotions.length > 0 || insights.people.length > 0;

  if (!hasAnyInsights) {
    return {
      context: '## Pre-Analyzed Journal Insights\n\n**No analytics data available.** The journal entries have not been analyzed yet. You cannot answer questions about emotions or people until the analytics have been generated.\n\n',
      hasData: false
    };
  }

  let context = '## Pre-Analyzed Journal Insights\n\n';

  if (insights.emotions.length > 0) {
    context += '### Emotional Patterns\n';
    for (const e of insights.emotions.slice(0, 5)) {
      const triggers = e.triggers.length > 0 ? ` - Triggers: ${e.triggers.join(', ')}` : '';
      context += `- ${e.emotion} [${e.sentiment}] (${e.count}x, avg intensity: ${e.avgIntensity}/10)${triggers}\n`;
    }
    context += '\n';
  }

  if (insights.people.length > 0) {
    context += '### Key People\n';
    for (const p of insights.people.slice(0, 5)) {
      const rel = p.relationship ? ` (${p.relationship})` : '';
      const ctx = p.recentContext ? ` - ${p.recentContext}` : '';
      context += `- **${p.name}**${rel} [${p.sentiment}] - ${p.mentions} mentions${ctx}\n`;
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

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
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
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      if (error.message.includes('network') || error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
        throw new Error('Network connection lost. Check your internet connection and try again.');
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        throw new Error('Cannot reach OpenAI servers. Check your internet connection or try again later.');
      }
      throw new Error(`Connection failed: ${error.message}`);
    }
    throw new Error('Failed to connect to OpenAI. Please try again.');
  }

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;

    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error?.code) {
        switch (errorData.error.code) {
          case 'invalid_api_key':
            errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
            break;
          case 'insufficient_quota':
            errorMessage = 'OpenAI API quota exceeded. Please check your billing status at OpenAI.';
            break;
          case 'model_not_found':
            errorMessage = 'Selected model not available. Try changing the model in Settings.';
            break;
          case 'context_length_exceeded':
            errorMessage = 'Message too long. Try starting a new conversation.';
            break;
          case 'rate_limit_exceeded':
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            break;
          default:
            errorMessage = `OpenAI error: ${errorData.error.code}`;
        }
      }
    } catch {
      switch (response.status) {
        case 401:
          errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = 'OpenAI servers are experiencing issues. Please try again later.';
          break;
        case 504:
          errorMessage = 'Request timed out. Please try again.';
          break;
        default:
          errorMessage = `API error: ${response.status}`;
      }
    }

    throw new Error(errorMessage);
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

export interface AgentStreamCallbacks extends StreamCallbacks {
  onToolCallStart?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolCall: ToolCall) => void;
  onContext?: (context: RAGContext) => void;
}

let runtime: JournalAIRuntime | null = null;

async function getRuntime(apiKey: string, model: string): Promise<JournalAIRuntime> {
  if (!runtime) {
    await initializeRuntime();
    runtime = new JournalAIRuntime({
      provider: 'openai',
      llmConfig: { apiKey, model },
    });
  }
  return runtime;
}

export async function sendAgentChatMessage(
  userMessage: string,
  conversationHistory: OpenAIMessage[],
  apiKey: string,
  model: OpenAIModel,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const rt = await getRuntime(apiKey, model);
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];

    // Get system prompt from ChatModule
    const chatModule = await rt.getModule('journal-chat');
    const systemPrompt = chatModule.defaultPrompt.replace('{{currentDate}}', currentDate);

    // Build messages for OpenAI
    const messages: (OpenAIMessage | OpenAIMessageWithToolCalls | OpenAIToolResultMessage)[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // First call with tool support (don't call onComplete yet)
    const firstResponse = await streamWithTools(
      messages,
      apiKey,
      model,
      { ...callbacks, onComplete: () => {} }, // Suppress onComplete for first call
      signal
    );

    // If no tool calls, call onComplete and we're done
    if (!firstResponse.toolCalls || firstResponse.toolCalls.length === 0) {
      callbacks.onComplete();
      return;
    }

    // Execute tools and collect citations
    const toolMessages: OpenAIToolResultMessage[] = [];
    const allCitations: Array<{ entryId: string }> = [];
    const allInsights: FilteredInsight[] = [];
    let contextText = '';

    for (const toolCall of firstResponse.toolCalls) {
      callbacks.onToolCallStart?.(toolCall);

      const result = await executeToolCall(
        toolCall.name as ToolName,
        JSON.parse(toolCall.arguments)
      );

      callbacks.onToolCallComplete?.({
        ...toolCall,
        result: formatToolResultForAPI(result),
        status: 'completed',
      });

      // Handle different tool result types
      if (result.success && Array.isArray(result.data)) {
        const toolName = toolCall.name as ToolName;

        if (toolName === 'query_insights') {
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

          // Extract insights for display and collect all entry IDs
          const allEntryIds = new Set<string>();

          for (const insight of insights) {
            // Handle individual insight with single entryId
            if (insight.entryId) {
              const formattedInsight: FilteredInsight = insight.type === 'person'
                ? {
                    type: 'person',
                    name: insight.name || '',
                    relationship: insight.relationship,
                    sentiment: insight.sentiment || 'neutral',
                    context: insight.context,
                    entryId: insight.entryId,
                    entryDate: insight.entryDate || '',
                  }
                : {
                    type: 'emotion',
                    emotion: insight.emotion || '',
                    intensity: insight.intensity || 5,
                    trigger: insight.trigger,
                    sentiment: (insight.sentiment || 'neutral') as 'positive' | 'negative' | 'neutral',
                    entryId: insight.entryId,
                    entryDate: insight.entryDate || '',
                  };
              allInsights.push(formattedInsight);
              allEntryIds.add(insight.entryId);
            }

            // Handle grouped results with multiple entry IDs - only create ONE insight for display
            if (insight.entryIds && Array.isArray(insight.entryIds) && insight.entryIds.length > 0) {
              const displayDate = insight.mostRecentDate || insight.entryDate || '';
              const firstEntryId = insight.entryIds[0];

              // Create ONE insight for display using the first entry ID
              const formattedInsight: FilteredInsight = insight.type === 'person'
                ? {
                    type: 'person',
                    name: insight.name || '',
                    relationship: insight.relationship,
                    sentiment: insight.sentiment || 'neutral',
                    context: insight.context,
                    entryId: firstEntryId,
                    entryDate: displayDate,
                  }
                : {
                    type: 'emotion',
                    emotion: insight.emotion || '',
                    intensity: insight.intensity || 5,
                    trigger: insight.trigger,
                    sentiment: (insight.sentiment || 'neutral') as 'positive' | 'negative' | 'neutral',
                    entryId: firstEntryId,
                    entryDate: displayDate,
                  };
              allInsights.push(formattedInsight);

              // Only cite the entry we're actually displaying the insight for
              allEntryIds.add(firstEntryId);
            }
          }

          // Add all entry IDs to citations
          for (const entryId of allEntryIds) {
            if (!allCitations.some(c => c.entryId === entryId)) {
              allCitations.push({ entryId });
            }
          }

          // Build formatted context text with ONLY insights (no full entries)
          // Insights already contain context/triggers which are detailed summaries
          const contextParts: string[] = ['INSIGHTS:'];
          for (const insight of allInsights) {
            if (insight.type === 'person') {
              const rel = insight.relationship ? ` (${insight.relationship})` : '';
              contextParts.push(`\n• ${insight.name}${rel} [${insight.sentiment}] on ${insight.entryDate}`);
              if (insight.context) {
                contextParts.push(`  Context: ${insight.context}`);
              }
            } else {
              contextParts.push(`\n• ${insight.emotion} (intensity: ${insight.intensity}/10) [${insight.sentiment}] on ${insight.entryDate}`);
              if (insight.trigger) {
                contextParts.push(`  Trigger: ${insight.trigger}`);
              }
            }
          }
          contextText = contextParts.join('\n');
        } else if (toolName === 'query_entries' || toolName === 'get_entries_by_ids') {
          // Extract entry IDs and build context
          const entryData = result.data as Array<{
            entryId?: string;
            date?: string;
            content?: string;
            snippet?: string;
          }>;

          for (const item of entryData) {
            if (item.entryId && !allCitations.some(c => c.entryId === item.entryId)) {
              allCitations.push({ entryId: item.entryId });
            }
          }

          // Build context text from entries
          const contextParts: string[] = ['JOURNAL ENTRIES:'];
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
          contextText = contextParts.join('\n');
        }
      }

      toolMessages.push({
        role: 'tool',
        content: formatToolResultForAPI(result),
        tool_call_id: toolCall.id,
      });
    }

    // Provide context/citations/insights if we have any
    if (allCitations.length > 0 || allInsights.length > 0 || contextText) {
      callbacks.onContext?.({
        citations: allCitations,
        entities: [],
        contextText: contextText || JSON.stringify(allCitations),
        insights: allInsights.length > 0 ? allInsights : undefined,
      });
    }

    // Second call with tool results (this one will call onComplete)
    const messagesWithTools: (OpenAIMessage | OpenAIMessageWithToolCalls | OpenAIToolResultMessage)[] = [
      ...messages,
      {
        role: 'assistant',
        content: firstResponse.content || '',
        tool_calls: firstResponse.toolCalls.map((tc) => ({
          index: 0,
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      },
      ...toolMessages,
    ];

    await streamWithTools(
      messagesWithTools,
      apiKey,
      model,
      callbacks, // This call will properly call onComplete
      signal
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

interface StreamWithToolsResult {
  content: string;
  toolCalls?: ToolCall[];
}

async function streamWithTools(
  messages: (OpenAIMessage | OpenAIMessageWithToolCalls | OpenAIToolResultMessage)[],
  apiKey: string,
  model: string,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal
): Promise<StreamWithToolsResult> {
  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        stream: true,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      if (error.message.includes('network') || error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
        throw new Error('Network connection lost. Check your internet connection and try again.');
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        throw new Error('Cannot reach OpenAI servers. Check your internet connection or try again later.');
      }
      throw new Error(`Connection failed: ${error.message}`);
    }
    throw new Error('Failed to connect to OpenAI. Please try again.');
  }

  if (!response.ok) {
    let errorMessage = `API error (${response.status})`;

    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.error?.code) {
        // Handle specific OpenAI error codes
        switch (errorData.error.code) {
          case 'invalid_api_key':
            errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
            break;
          case 'insufficient_quota':
            errorMessage = 'OpenAI API quota exceeded. Please check your billing status at OpenAI.';
            break;
          case 'model_not_found':
            errorMessage = 'Selected model not available. Try changing the model in Settings.';
            break;
          case 'context_length_exceeded':
            errorMessage = 'Message too long. Try starting a new conversation.';
            break;
          case 'rate_limit_exceeded':
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            break;
          default:
            errorMessage = `OpenAI error: ${errorData.error.code}`;
        }
      }
    } catch {
      // If parsing fails, use status-based messages
      switch (response.status) {
        case 401:
          errorMessage = 'Invalid API key. Please check your OpenAI API key in Settings.';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = 'OpenAI servers are experiencing issues. Please try again later.';
          break;
        case 504:
          errorMessage = 'Request timed out. Please try again.';
          break;
        default:
          errorMessage = `API error: ${response.status}`;
      }
    }

    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const toolCalls: ToolCall[] = [];

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
          const delta = chunk.choices[0]?.delta;

          // Handle content
          if (delta?.content) {
            content += delta.content;
            callbacks.onToken(delta.content);
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: '',
                  status: 'running',
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
        } catch {
          // Skip malformed JSON
        }
      }
    }

    callbacks.onComplete();
    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw error;
  }
}
