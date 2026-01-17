import { select, execute } from '../lib/db';

const DEFAULT_INTENSITY = 5;
const MAX_AGGREGATED_ITEMS = 20;
const MAX_TRIGGERS_PER_EMOTION = 3;
const DEFAULT_INSIGHTS_LIMIT = 50;
const DEFAULT_RAW_INSIGHTS_LIMIT = 100;

import type {
  JournalInsight,
  InsightType,
  AggregatedInsights,
  EmotionMetadata,
  PersonMetadata,
  RelationshipSentiment,
  TimeGroupedInsight,
  TimeGroupedPerson,
  SourceRange,
} from '../types/analytics';

export async function saveInsights(insights: JournalInsight[]): Promise<void> {
  for (const insight of insights) {
    await execute(
      `INSERT INTO journal_insights (id, entry_id, entry_date, insight_type, content, metadata, created_at, source_text, source_start, source_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        insight.id,
        insight.entryId,
        insight.entryDate,
        insight.insightType,
        insight.content,
        insight.metadata ? JSON.stringify(insight.metadata) : null,
        insight.createdAt,
        insight.sourceText ?? null,
        insight.sourceStart ?? null,
        insight.sourceEnd ?? null,
      ]
    );
  }
}

export async function deleteEntryInsights(entryId: string): Promise<void> {
  await execute('DELETE FROM journal_insights WHERE entry_id = $1', [entryId]);
}

export async function clearAllInsights(): Promise<void> {
  await execute('DELETE FROM journal_insights');
  window.dispatchEvent(new CustomEvent('insights-changed'));
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
