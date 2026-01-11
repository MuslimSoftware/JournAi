import { select, execute } from '../lib/db';
import { getApiKey } from '../lib/secureStorage';
import type {
  JournalInsight,
  InsightType,
  AnalyticsQueueItem,
  AnalyticsStats,
  AggregatedInsights,
  EmotionMetadata,
  PersonMetadata,
  RelationshipSentiment,
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
   Example: {"emotion": "frustrated", "intensity": 7, "trigger": "Tried to wake up at 6am for the third day in a row but failed again because I stayed up until 2am watching YouTube videos. This is part of an ongoing struggle to fix my sleep schedule before starting the new job next month.", "sentiment": "negative"}

2. people: Who is mentioned?
   - name: Person's name
   - relationship: How they relate to the writer (if clear)
   - sentiment: "positive", "negative", "neutral", "tense", or "mixed"
   - context: A detailed summary (2-3 sentences) explaining what happened with this person and the nature of the interaction. Include enough context that someone reading this a year later would fully understand the situation without needing to read the original entry.
   Example: {"name": "Fatima", "relationship": "wife", "sentiment": "tense", "context": "Had a heated discussion about whether to buy new furniture for the living room. She wants to spend $3000 on a new couch but I think we should wait until after we pay off the car loan next year."}

Return format:
{
  "emotions": [{"emotion": "frustrated", "intensity": 7, "trigger": "detailed 2-3 sentence summary with full context", "sentiment": "negative"}],
  "people": [{"name": "Name", "relationship": "friend", "sentiment": "tense", "context": "detailed 2-3 sentence summary with full context"}]
}

Only include categories clearly present. Empty arrays for missing categories.`;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function analyzeEntry(
  entryId: string,
  entryDate: string,
  content: string
): Promise<JournalInsight[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured');
  if (content.length < 100) return [];

  const prompt = ANALYSIS_PROMPT
    .replace('{date}', entryDate)
    .replace('{content}', content.slice(0, 8000));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
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
        intensity: e.intensity || 5,
        trigger: e.trigger,
        sentiment: e.sentiment || 'neutral',
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
}

export async function queueEntryForAnalysis(entryId: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const existing = await select<{ id: string }>(
    'SELECT id FROM analytics_queue WHERE entry_id = $1 AND status IN ($2, $3)',
    [entryId, 'pending', 'processing']
  );

  if (existing.length > 0) return;

  await execute(
    `INSERT INTO analytics_queue (id, entry_id, status, retry_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [generateId(), entryId, 'pending', 0, timestamp, timestamp]
  );
}

export async function processAnalyticsQueue(
  onProgress?: (current: number, total: number, insightCount?: number) => void
): Promise<{ success: number; failed: number }> {
  const pending = await select<AnalyticsQueueItem & { content: string; date: string }>(
    `SELECT q.id, q.entry_id as entryId, q.status, q.retry_count as retryCount, q.error, q.created_at as createdAt, q.updated_at as updatedAt, e.content, e.date
     FROM analytics_queue q
     JOIN entries e ON e.id = q.entry_id
     WHERE q.status = 'pending' AND q.retry_count < 3
     ORDER BY q.created_at ASC`
  );

  let success = 0;
  let failed = 0;
  const total = pending.length;

  for (let i = 0; i < pending.length; i++) {
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
    } catch (error) {
      failed++;
      await execute(
        'UPDATE analytics_queue SET status = $1, retry_count = retry_count + 1, error = $2, updated_at = $3 WHERE id = $4',
        ['pending', error instanceof Error ? error.message : String(error), new Date().toISOString(), item.id]
      );
      onProgress?.(i + 1, total, 0);
    }
  }

  return { success, failed };
}

export async function getInsightsByType(
  insightType: InsightType,
  limit: number = 50
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

export async function getAggregatedInsights(): Promise<AggregatedInsights> {
  const emotionsRaw = await select<{ content: string; metadata: string; entry_date: string }>(
    `SELECT content, metadata, entry_date
     FROM journal_insights WHERE insight_type = 'emotion'
     ORDER BY entry_date DESC`
  );

  const emotionMap = new Map<string, { count: number; totalIntensity: number; triggers: Set<string>; sentiment: string }>();
  for (const e of emotionsRaw) {
    const key = e.content.toLowerCase();
    const meta: EmotionMetadata | null = e.metadata ? JSON.parse(e.metadata) : null;
    const existing = emotionMap.get(key) || { count: 0, totalIntensity: 0, triggers: new Set<string>(), sentiment: 'neutral' };
    existing.count++;
    existing.totalIntensity += meta?.intensity || 5;
    if (meta?.trigger) existing.triggers.add(meta.trigger);
    if (meta?.sentiment) existing.sentiment = meta.sentiment;
    emotionMap.set(key, existing);
  }

  const emotions = Array.from(emotionMap.entries())
    .map(([emotion, data]) => ({
      emotion,
      avgIntensity: Math.round((data.totalIntensity / data.count) * 10) / 10,
      count: data.count,
      triggers: Array.from(data.triggers).slice(0, 3),
      sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const peopleRaw = await select<{ content: string; metadata: string; entry_date: string }>(
    `SELECT content, metadata, entry_date
     FROM journal_insights WHERE insight_type = 'person'
     ORDER BY entry_date DESC`
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
    .slice(0, 10);

  return { emotions, people };
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const total = await select<{ count: number }>('SELECT COUNT(*) as count FROM journal_insights');
  const byType = await select<{ insight_type: string; count: number }>(
    'SELECT insight_type, COUNT(*) as count FROM journal_insights GROUP BY insight_type'
  );
  const analyzed = await select<{ count: number }>(
    'SELECT COUNT(DISTINCT entry_id) as count FROM journal_insights'
  );
  const pending = await select<{ count: number }>(
    "SELECT COUNT(*) as count FROM analytics_queue WHERE status = 'pending'"
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
    entriesAnalyzed: analyzed[0]?.count ?? 0,
    entriesPending: pending[0]?.count ?? 0,
    lastAnalyzedAt: lastAnalyzed[0]?.created_at,
  };
}

export async function queueAllEntriesForAnalysis(): Promise<number> {
  const unanalyzed = await select<{ id: string }>(
    `SELECT e.id FROM entries e
     WHERE e.id NOT IN (SELECT DISTINCT entry_id FROM journal_insights)
     AND LENGTH(e.content) > 100`
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
      intensity: meta?.intensity || 5,
      trigger: meta?.trigger,
      sentiment: meta?.sentiment || 'neutral',
    };
  });
}

export interface PersonOccurrence {
  entryId: string;
  entryDate: string;
  relationship?: string;
  sentiment: RelationshipSentiment;
  context?: string;
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
    };
  });
}
