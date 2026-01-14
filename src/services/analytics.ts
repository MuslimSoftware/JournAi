import { select, execute } from '../lib/db';
import { getApiKey } from '../lib/secureStorage';
import { fuzzySearch } from 'levenshtein-search';

const MAX_CONTENT_LENGTH = 8000;
const API_TEMPERATURE = 0.3;
const API_MODEL = 'gpt-4o-mini';
const MAX_RETRY_COUNT = 3;
const DEFAULT_INTENSITY = 5;
const MAX_AGGREGATED_ITEMS = 20;
const MAX_TRIGGERS_PER_EMOTION = 3;
const DEFAULT_INSIGHTS_LIMIT = 50;
const DEFAULT_RAW_INSIGHTS_LIMIT = 100;

import type {
  JournalInsight,
  InsightType,
  AnalyticsQueueItem,
  AnalyticsStats,
  AggregatedInsights,
  EmotionMetadata,
  PersonMetadata,
  RelationshipSentiment,
  TimeGroupedInsight,
  TimeGroupedPerson,
  SourceRange,
} from '../types/analytics';

const ANALYSIS_PROMPT = `Analyze this journal entry. Return JSON only.

Entry Date: {date}
Entry Content:
{content}

Extract the following:

1. emotions: What emotions are present? Be precise.
   - emotion: The feeling (1 word)
   - intensity: Rate 1-10 (1=barely noticeable, 5=moderate, 10=overwhelming)
   - trigger: A detailed summary (2-3 sentences) explaining WHY this emotion was felt. Include enough context that someone reading this a year later would fully understand the situation without needing to read the original entry. Mention specific events, people involved, and circumstances.
   - sentiment: "positive", "negative", or "neutral"
   - source_quote: Copy the exact verbatim text from the entry. When detailed context exists, include 2-4 complete sentences. For brief mentions in lists, schedules, or abstract entries, just copy the relevant text as-is (even if short). Must match the entry exactly including typos/punctuation.
   Examples:
   - Detailed: {"emotion": "anxious", "intensity": 6, "trigger": "Had an important presentation at work that didn't go as planned.", "sentiment": "negative", "source_quote": "The presentation did not go well at all. I fumbled through the Q&A section and could tell the client wasn't impressed. I should have prepared more."}
   - Brief: {"emotion": "stressed", "intensity": 5, "trigger": "Busy day with many tasks to complete.", "sentiment": "negative", "source_quote": "so much to do is making me stressed"}

2. people: Who is mentioned?
   - name: Person's name (use the exact name/nickname from the entry)
   - relationship: How they relate to the writer (if clear)
   - sentiment: "positive", "negative", "neutral", "tense", or "mixed"
   - context: A detailed summary (2-3 sentences) explaining what happened with this person and the nature of the interaction. Include enough context that someone reading this a year later would fully understand the situation without needing to read the original entry.
   - source_quote: Copy the exact verbatim text from the entry. When detailed context exists, include 2-4 complete sentences. For brief mentions in lists, schedules, or nicknames, just copy the relevant text as-is (even if short). Must match the entry exactly including typos/punctuation.
   Examples:
   - Detailed: {"name": "Sarah", "relationship": "coworker", "sentiment": "positive", "context": "Sarah helped review the project proposal and provided valuable feedback before the deadline.", "source_quote": "Sarah stayed late to help me finish the proposal. She caught several errors I had missed and suggested improvements to the structure."}
   - Brief: {"name": "Mom", "relationship": "family", "sentiment": "neutral", "context": "Mentioned spending time with Mom as part of daily schedule.", "source_quote": "Mom"}
   - Nickname: {"name": "AJ", "relationship": "friend", "sentiment": "positive", "context": "Hung out with friend known as AJ.", "source_quote": "chilled with AJ"}

Return format:
{
  "emotions": [{"emotion": "frustrated", "intensity": 7, "trigger": "summary", "sentiment": "negative", "source_quote": "2-4 complete sentences from entry"}],
  "people": [{"name": "Name", "relationship": "friend", "sentiment": "tense", "context": "summary", "source_quote": "2-4 complete sentences from entry"}]
}

Only include categories clearly present. Empty arrays for missing categories.
If the entry is too short, vague, or lacks meaningful content to extract insights from, return empty arrays for both.`;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function findSourceRange(content: string, quote: string | undefined): SourceRange | undefined {
  if (!quote || quote.length < 3) return undefined;

  const maxDistance = Math.max(3, Math.floor(quote.length * 0.15));
  const matches = [...fuzzySearch(quote, content, maxDistance)];

  if (matches.length === 0) return undefined;

  const best = matches.reduce((a, b) => (a.dist < b.dist ? a : b));
  return {
    start: best.start,
    end: best.end,
    quote: content.slice(best.start, best.end),
  };
}

export async function analyzeEntry(
  entryId: string,
  entryDate: string,
  content: string
): Promise<JournalInsight[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const prompt = ANALYSIS_PROMPT
    .replace('{date}', entryDate)
    .replace('{content}', content.slice(0, MAX_CONTENT_LENGTH));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: API_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: API_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const analysis = JSON.parse(data.choices[0].message.content);
  const insights: JournalInsight[] = [];
  const timestamp = new Date().toISOString();

  for (const e of analysis.emotions || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'emotion',
      content: e.emotion,
      metadata: {
        intensity: e.intensity || DEFAULT_INTENSITY,
        trigger: e.trigger,
        sentiment: e.sentiment || 'neutral',
        source: findSourceRange(content, e.source_quote),
      },
      createdAt: timestamp,
    });
  }

  for (const person of analysis.people || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'person',
      content: person.name,
      metadata: {
        relationship: person.relationship,
        sentiment: person.sentiment || 'neutral',
        context: person.context,
        source: findSourceRange(content, person.source_quote),
      },
      createdAt: timestamp,
    });
  }

  return insights;
}

export async function saveInsights(insights: JournalInsight[]): Promise<void> {
  for (const insight of insights) {
    await execute(
      `INSERT INTO journal_insights (id, entry_id, entry_date, insight_type, content, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        insight.id,
        insight.entryId,
        insight.entryDate,
        insight.insightType,
        insight.content,
        insight.metadata ? JSON.stringify(insight.metadata) : null,
        insight.createdAt,
      ]
    );
  }
}

export async function deleteEntryInsights(entryId: string): Promise<void> {
  await execute('DELETE FROM journal_insights WHERE entry_id = $1', [entryId]);
}

export async function clearAllInsights(): Promise<void> {
  await execute('DELETE FROM journal_insights');
  await execute('DELETE FROM analytics_queue');
  window.dispatchEvent(new CustomEvent('insights-changed'));
}

export async function queueEntryForAnalysis(entryId: string): Promise<void> {
  const hasInsights = await select<{ count: number }>(
    'SELECT COUNT(*) as count FROM journal_insights WHERE entry_id = $1',
    [entryId]
  );
  if (hasInsights[0]?.count > 0) return;

  const existing = await select<{ id: string }>(
    'SELECT id FROM analytics_queue WHERE entry_id = $1',
    [entryId]
  );
  if (existing.length > 0) return;

  const timestamp = new Date().toISOString();
  await execute(
    `INSERT INTO analytics_queue (id, entry_id, status, retry_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [generateId(), entryId, 'pending', 0, timestamp, timestamp]
  );
}

export async function processAnalyticsQueue(
  onProgress?: (current: number, total: number, insightCount?: number) => void,
  signal?: AbortSignal
): Promise<{ success: number; failed: number; cancelled: boolean }> {
  const pending = await select<AnalyticsQueueItem & { content: string; date: string }>(
    `SELECT q.id, q.entry_id as entryId, q.status, q.retry_count as retryCount, q.error, q.created_at as createdAt, q.updated_at as updatedAt, e.content, e.date
     FROM analytics_queue q
     JOIN entries e ON e.id = q.entry_id
     WHERE q.status = 'pending' AND q.retry_count < ${MAX_RETRY_COUNT}
     ORDER BY q.created_at ASC`
  );

  let success = 0;
  let failed = 0;
  const total = pending.length;

  onProgress?.(0, total);

  for (let i = 0; i < pending.length; i++) {
    if (signal?.aborted) {
      return { success, failed, cancelled: true };
    }

    const item = pending[i];

    try {
      await execute(
        'UPDATE analytics_queue SET status = $1, updated_at = $2 WHERE id = $3',
        ['processing', new Date().toISOString(), item.id]
      );

      await deleteEntryInsights(item.entryId);
      const insights = await analyzeEntry(item.entryId, item.date, item.content);
      await saveInsights(insights);

      await execute(
        'UPDATE analytics_queue SET status = $1, updated_at = $2 WHERE id = $3',
        ['completed', new Date().toISOString(), item.id]
      );
      success++;
      onProgress?.(i + 1, total, insights.length);
      window.dispatchEvent(new CustomEvent('insights-changed'));
    } catch (error) {
      failed++;
      await execute(
        'UPDATE analytics_queue SET status = $1, retry_count = retry_count + 1, error = $2, updated_at = $3 WHERE id = $4',
        ['pending', error instanceof Error ? error.message : String(error), new Date().toISOString(), item.id]
      );
      onProgress?.(i + 1, total, undefined);
    }
  }

  return { success, failed, cancelled: false };
}

export async function getInsightsByType(
  insightType: InsightType,
  limit: number = DEFAULT_INSIGHTS_LIMIT
): Promise<JournalInsight[]> {
  const rows = await select<{
    id: string;
    entry_id: string;
    entry_date: string;
    insight_type: string;
    content: string;
    metadata: string | null;
    created_at: string;
  }>(
    `SELECT * FROM journal_insights WHERE insight_type = $1 ORDER BY entry_date DESC LIMIT $2`,
    [insightType, limit]
  );

  return rows.map(r => ({
    id: r.id,
    entryId: r.entry_id,
    entryDate: r.entry_date,
    insightType: r.insight_type as InsightType,
    content: r.content,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    createdAt: r.created_at,
  }));
}

export async function getAggregatedInsights(startDate?: string, endDate?: string): Promise<AggregatedInsights> {
  const dateFilter = startDate && endDate ? ' AND entry_date >= $1 AND entry_date <= $2' : '';
  const dateParams = startDate && endDate ? [startDate, endDate] : [];

  const emotionsRaw = await select<{ content: string; metadata: string; entry_date: string }>(
    `SELECT content, metadata, entry_date
     FROM journal_insights WHERE insight_type = 'emotion'${dateFilter}
     ORDER BY entry_date DESC`,
    dateParams
  );

  const emotionMap = new Map<string, { count: number; totalIntensity: number; triggers: Set<string>; sentiment: string }>();
  for (const e of emotionsRaw) {
    const key = e.content.toLowerCase();
    const meta: EmotionMetadata | null = e.metadata ? JSON.parse(e.metadata) : null;
    const existing = emotionMap.get(key) || { count: 0, totalIntensity: 0, triggers: new Set<string>(), sentiment: 'neutral' };
    existing.count++;
    existing.totalIntensity += meta?.intensity || DEFAULT_INTENSITY;
    if (meta?.trigger) existing.triggers.add(meta.trigger);
    if (meta?.sentiment) existing.sentiment = meta.sentiment;
    emotionMap.set(key, existing);
  }

  const emotions = Array.from(emotionMap.entries())
    .map(([emotion, data]) => ({
      emotion,
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      count: data.count,
      triggers: Array.from(data.triggers).slice(0, MAX_TRIGGERS_PER_EMOTION),
      sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_AGGREGATED_ITEMS);

  const peopleRaw = await select<{ content: string; metadata: string; entry_date: string }>(
    `SELECT content, metadata, entry_date
     FROM journal_insights WHERE insight_type = 'person'${dateFilter}
     ORDER BY entry_date DESC`,
    dateParams
  );

  const personMap = new Map<string, { count: number; relationship?: string; sentiment: RelationshipSentiment; recentContext?: string }>();
  for (const p of peopleRaw) {
    const key = p.content.toLowerCase();
    const meta: PersonMetadata | null = p.metadata ? JSON.parse(p.metadata) : null;
    if (!personMap.has(key)) {
      personMap.set(key, {
        count: 1,
        relationship: meta?.relationship,
        sentiment: meta?.sentiment || 'neutral',
        recentContext: meta?.context,
      });
    } else {
      const existing = personMap.get(key)!;
      existing.count++;
    }
  }

  const people = Array.from(personMap.entries())
    .map(([name, data]) => ({
      name,
      relationship: data.relationship,
      sentiment: data.sentiment,
      mentions: data.count,
      recentContext: data.recentContext,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, MAX_AGGREGATED_ITEMS);

  return { emotions, people };
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const total = await select<{ count: number }>('SELECT COUNT(*) as count FROM journal_insights');
  const byType = await select<{ insight_type: string; count: number }>(
    'SELECT insight_type, COUNT(*) as count FROM journal_insights GROUP BY insight_type'
  );
  const entriesProcessed = await select<{ count: number }>(
    `SELECT COUNT(*) as count FROM (
      SELECT entry_id FROM journal_insights
      UNION
      SELECT entry_id FROM analytics_queue WHERE status = 'completed'
    )`
  );
  const pending = await select<{ count: number }>(
    `SELECT COUNT(*) as count FROM analytics_queue WHERE status = 'pending' AND retry_count < ${MAX_RETRY_COUNT}`
  );
  const lastAnalyzed = await select<{ created_at: string }>(
    'SELECT created_at FROM journal_insights ORDER BY created_at DESC LIMIT 1'
  );

  const insightsByType: Record<InsightType, number> = { emotion: 0, person: 0 };
  for (const row of byType) {
    if (row.insight_type === 'emotion' || row.insight_type === 'person') {
      insightsByType[row.insight_type] = row.count;
    }
  }

  return {
    totalInsights: total[0]?.count ?? 0,
    insightsByType,
    entriesAnalyzed: entriesProcessed[0]?.count ?? 0,
    entriesPending: pending[0]?.count ?? 0,
    lastAnalyzedAt: lastAnalyzed[0]?.created_at,
  };
}

export interface FailedAnalysisEntry {
  id: string;
  entryId: string;
  entryDate: string;
  error: string | null;
  retryCount: number;
}

export async function getFailedAnalysisEntries(): Promise<FailedAnalysisEntry[]> {
  const rows = await select<{
    id: string;
    entry_id: string;
    error: string | null;
    retry_count: number;
    date: string;
  }>(
    `SELECT q.id, q.entry_id, q.error, q.retry_count, e.date
     FROM analytics_queue q
     JOIN entries e ON e.id = q.entry_id
     WHERE q.status = 'pending' AND q.retry_count > 0
     ORDER BY e.date DESC`
  );

  return rows.map(r => ({
    id: r.id,
    entryId: r.entry_id,
    entryDate: r.date,
    error: r.error,
    retryCount: r.retry_count,
  }));
}

export async function retryFailedEntry(queueId: string): Promise<void> {
  await execute(
    'UPDATE analytics_queue SET retry_count = 0, status = $1, updated_at = $2 WHERE id = $3',
    ['pending', new Date().toISOString(), queueId]
  );
}

export async function dismissFailedEntry(queueId: string): Promise<void> {
  await execute('DELETE FROM analytics_queue WHERE id = $1', [queueId]);
}

export async function queueAllEntriesForAnalysis(): Promise<number> {
  const unanalyzed = await select<{ id: string }>(
    `SELECT e.id FROM entries e
     WHERE e.id NOT IN (SELECT DISTINCT entry_id FROM journal_insights)`
  );

  for (const entry of unanalyzed) {
    await queueEntryForAnalysis(entry.id);
  }

  return unanalyzed.length;
}

export interface EmotionOccurrence {
  entryId: string;
  entryDate: string;
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source?: SourceRange;
}

export async function getEmotionOccurrences(emotion: string): Promise<EmotionOccurrence[]> {
  const rows = await select<{
    entry_id: string;
    entry_date: string;
    metadata: string;
  }>(
    `SELECT entry_id, entry_date, metadata
     FROM journal_insights
     WHERE insight_type = 'emotion' AND LOWER(content) = LOWER($1)
     ORDER BY entry_date DESC`,
    [emotion]
  );

  return rows.map(r => {
    const meta: EmotionMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
    return {
      entryId: r.entry_id,
      entryDate: r.entry_date,
      intensity: meta?.intensity || DEFAULT_INTENSITY,
      trigger: meta?.trigger,
      sentiment: meta?.sentiment || 'neutral',
      source: meta?.source,
    };
  });
}

export interface PersonOccurrence {
  entryId: string;
  entryDate: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
  source?: SourceRange;
}

export async function getPersonOccurrences(name: string): Promise<PersonOccurrence[]> {
  const rows = await select<{
    entry_id: string;
    entry_date: string;
    metadata: string;
  }>(
    `SELECT entry_id, entry_date, metadata
     FROM journal_insights
     WHERE insight_type = 'person' AND LOWER(content) = LOWER($1)
     ORDER BY entry_date DESC`,
    [name]
  );

  return rows.map(r => {
    const meta: PersonMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
    return {
      entryId: r.entry_id,
      entryDate: r.entry_date,
      relationship: meta?.relationship,
      sentiment: meta?.sentiment || 'neutral',
      context: meta?.context,
      source: meta?.source,
    };
  });
}

export async function getRawEmotionInsights(limit: number = DEFAULT_RAW_INSIGHTS_LIMIT, startDate?: string, endDate?: string): Promise<TimeGroupedInsight[]> {
  const dateFilter = startDate && endDate ? ' AND entry_date >= $2 AND entry_date <= $3' : '';
  const params = startDate && endDate ? [limit, startDate, endDate] : [limit];

  const rows = await select<{
    content: string;
    metadata: string;
    entry_id: string;
    entry_date: string;
  }>(
    `SELECT content, metadata, entry_id, entry_date
     FROM journal_insights
     WHERE insight_type = 'emotion'${dateFilter}
     ORDER BY entry_date DESC
     LIMIT $1`,
    params
  );

  return rows.map(r => {
    const meta: EmotionMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
    return {
      emotion: r.content,
      intensity: meta?.intensity || DEFAULT_INTENSITY,
      trigger: meta?.trigger,
      sentiment: meta?.sentiment || 'neutral',
      entryId: r.entry_id,
      entryDate: r.entry_date,
      source: meta?.source,
    };
  });
}

export async function getRawPersonInsights(limit: number = DEFAULT_RAW_INSIGHTS_LIMIT, startDate?: string, endDate?: string): Promise<TimeGroupedPerson[]> {
  const dateFilter = startDate && endDate ? ' AND entry_date >= $2 AND entry_date <= $3' : '';
  const params = startDate && endDate ? [limit, startDate, endDate] : [limit];

  const rows = await select<{
    content: string;
    metadata: string;
    entry_id: string;
    entry_date: string;
  }>(
    `SELECT content, metadata, entry_id, entry_date
     FROM journal_insights
     WHERE insight_type = 'person'${dateFilter}
     ORDER BY entry_date DESC
     LIMIT $1`,
    params
  );

  return rows.map(r => {
    const meta: PersonMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
    return {
      name: r.content,
      relationship: meta?.relationship,
      sentiment: meta?.sentiment || 'neutral',
      context: meta?.context,
      entryId: r.entry_id,
      entryDate: r.entry_date,
      source: meta?.source,
    };
  });
}

export interface FilteredInsightsOptions {
  type?: 'emotion' | 'person';
  name?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'tense' | 'mixed';
  limit?: number;
}

export interface FilteredEmotionInsight {
  type: 'emotion';
  emotion: string;
  intensity: number;
  trigger?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  entryId: string;
  entryDate: string;
}

export interface FilteredPersonInsight {
  type: 'person';
  name: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
  entryId: string;
  entryDate: string;
}

export type FilteredInsight = FilteredEmotionInsight | FilteredPersonInsight;

export async function getFilteredInsights(options: FilteredInsightsOptions = {}): Promise<FilteredInsight[]> {
  const { type, name, sentiment, limit = 20 } = options;
  const results: FilteredInsight[] = [];

  if (!type || type === 'person') {
    let query = `SELECT content, metadata, entry_id, entry_date FROM journal_insights WHERE insight_type = 'person'`;
    const params: (string | number)[] = [];

    if (name) {
      params.push(name.toLowerCase());
      query += ` AND LOWER(content) LIKE '%' || $${params.length} || '%'`;
    }

    if (sentiment) {
      params.push(sentiment);
      query += ` AND json_extract(metadata, '$.sentiment') = $${params.length}`;
    }

    query += ` ORDER BY entry_date DESC LIMIT ${limit}`;

    const rows = await select<{
      content: string;
      metadata: string;
      entry_id: string;
      entry_date: string;
    }>(query, params);

    for (const r of rows) {
      const meta: PersonMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
      results.push({
        type: 'person',
        name: r.content,
        relationship: meta?.relationship,
        sentiment: meta?.sentiment || 'neutral',
        context: meta?.context,
        entryId: r.entry_id,
        entryDate: r.entry_date,
      });
    }
  }

  if (!type || type === 'emotion') {
    let query = `SELECT content, metadata, entry_id, entry_date FROM journal_insights WHERE insight_type = 'emotion'`;
    const params: (string | number)[] = [];

    if (name) {
      params.push(name.toLowerCase());
      query += ` AND LOWER(content) LIKE '%' || $${params.length} || '%'`;
    }

    if (sentiment && (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral')) {
      params.push(sentiment);
      query += ` AND json_extract(metadata, '$.sentiment') = $${params.length}`;
    }

    query += ` ORDER BY entry_date DESC LIMIT ${limit}`;

    const rows = await select<{
      content: string;
      metadata: string;
      entry_id: string;
      entry_date: string;
    }>(query, params);

    for (const r of rows) {
      const meta: EmotionMetadata | null = r.metadata ? JSON.parse(r.metadata) : null;
      results.push({
        type: 'emotion',
        emotion: r.content,
        intensity: meta?.intensity || DEFAULT_INTENSITY,
        trigger: meta?.trigger,
        sentiment: meta?.sentiment || 'neutral',
        entryId: r.entry_id,
        entryDate: r.entry_date,
      });
    }
  }

  results.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  return results.slice(0, limit);
}
