import type { OpenAIMessage, OpenAIStreamChunk, OpenAIModel } from '../types/chat';
import type { RAGContext } from '../types/memory';
import { hybridSearch, type SearchResult } from './search';
import { getEntriesByDateRange, getEntriesByIds } from './entries';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You help users reflect on their thoughts, answer questions, and provide supportive conversation.
Be warm, empathetic, and encouraging while remaining helpful and informative.`;

const RAG_SYSTEM_PROMPT = `You are a helpful AI assistant for a journaling app called JournAi.
You have access to the user's journal entries and can reference them to provide personalized insights.

When answering questions:
1. Reference specific journal entries by date when relevant
2. Identify patterns across multiple entries
3. Be warm and empathetic while providing actionable insights
4. If asked about something not in the journal, say so honestly

CONTEXT FROM JOURNAL:
{context}

Remember: The above context is from the user's private journal. Treat it with care and respect.`;

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
  const dateRange = extractDateRange(userMessage);
  const summaryQuery = isSummaryQuery(userMessage);
  const hasExistingContext = options?.existingEntryIds && options.existingEntryIds.length > 0;

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
    } else {
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

  const contextText = buildContextFromResults(searchResults);
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
