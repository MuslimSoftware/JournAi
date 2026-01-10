import { select, execute } from '../lib/db';
import { getApiKey } from '../lib/secureStorage';
import type {
  JournalInsight,
  InsightType,
  AnalyticsQueueItem,
  AnalyticsStats,
  AggregatedInsights
} from '../types/analytics';

const ANALYSIS_PROMPT = `Analyze this journal entry and extract structured insights. Return JSON only.

Entry Date: {date}
Entry Content:
{content}

Extract:
1. themes: Main topics discussed (1-3 words each, max 3)
2. emotions: Emotional states expressed (1 word each, max 2)
3. goals: Any goals, intentions, or plans mentioned (short phrase, max 2)
4. people: People mentioned with brief context (name + relationship if clear, max 3)
5. patterns: Recurring behaviors or habits mentioned (short phrase, max 2)
6. milestones: Achievements or significant events (short phrase, max 1)

Return format:
{
  "themes": ["theme1", "theme2"],
  "emotions": [{"emotion": "frustrated", "sentiment": "negative"}],
  "goals": ["get new job by May"],
  "people": [{"name": "Fatima", "context": "wife, had conflict"}],
  "patterns": ["struggling with morning routine"],
  "milestones": ["completed Umrah trip"]
}

Only include categories that are clearly present. Empty arrays for missing categories.`;

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

  for (const theme of analysis.themes || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'theme',
      content: theme,
      createdAt: timestamp,
    });
  }

  for (const e of analysis.emotions || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'emotion',
      content: e.emotion,
      metadata: { sentiment: e.sentiment },
      createdAt: timestamp,
    });
  }

  for (const goal of analysis.goals || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'goal',
      content: goal,
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
      metadata: { sentiment: person.context },
      createdAt: timestamp,
    });
  }

  for (const pattern of analysis.patterns || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'pattern',
      content: pattern,
      createdAt: timestamp,
    });
  }

  for (const milestone of analysis.milestones || []) {
    insights.push({
      id: generateId(),
      entryId,
      entryDate,
      insightType: 'milestone',
      content: milestone,
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
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const pending = await select<AnalyticsQueueItem & { content: string; date: string }>(
    `SELECT q.id, q.entry_id as entryId, q.status, q.retry_count as retryCount, q.error, q.created_at as createdAt, q.updated_at as updatedAt, e.content, e.date
     FROM analytics_queue q
     JOIN entries e ON e.id = q.entry_id
     WHERE q.status = 'pending' AND q.retry_count < 3
     ORDER BY q.created_at ASC
     LIMIT 50`
  );

  let success = 0;
  let failed = 0;
  const total = pending.length;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    onProgress?.(i + 1, total);

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
    } catch (error) {
      failed++;
      await execute(
        'UPDATE analytics_queue SET status = $1, retry_count = retry_count + 1, error = $2, updated_at = $3 WHERE id = $4',
        ['pending', error instanceof Error ? error.message : String(error), new Date().toISOString(), item.id]
      );
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
  const themes = await select<{ content: string; count: number; recent_date: string }>(
    `SELECT content, COUNT(*) as count, MAX(entry_date) as recent_date
     FROM journal_insights WHERE insight_type = 'theme'
     GROUP BY LOWER(content) ORDER BY count DESC LIMIT 10`
  );

  const emotions = await select<{ content: string; count: number; metadata: string }>(
    `SELECT content, COUNT(*) as count, metadata
     FROM journal_insights WHERE insight_type = 'emotion'
     GROUP BY LOWER(content) ORDER BY count DESC LIMIT 10`
  );

  const goals = await select<{ content: string; count: number; recent_date: string }>(
    `SELECT content, COUNT(*) as count, MAX(entry_date) as recent_date
     FROM journal_insights WHERE insight_type = 'goal'
     GROUP BY content ORDER BY recent_date DESC LIMIT 10`
  );

  const people = await select<{ content: string; count: number; metadata: string }>(
    `SELECT content, COUNT(*) as count, metadata
     FROM journal_insights WHERE insight_type = 'person'
     GROUP BY LOWER(content) ORDER BY count DESC LIMIT 10`
  );

  const patterns = await select<{ content: string; count: number; first_date: string; last_date: string }>(
    `SELECT content, COUNT(*) as count, MIN(entry_date) as first_date, MAX(entry_date) as last_date
     FROM journal_insights WHERE insight_type = 'pattern'
     GROUP BY content ORDER BY count DESC LIMIT 10`
  );

  return {
    themes: themes.map(t => ({ theme: t.content, count: t.count, recentDate: t.recent_date })),
    emotions: emotions.map(e => ({
      emotion: e.content,
      trend: 'stable' as const,
      count: e.count
    })),
    goals: goals.map(g => ({
      goal: g.content,
      status: 'active' as const,
      mentions: g.count
    })),
    people: people.map(p => ({
      name: p.content,
      sentiment: p.metadata ? JSON.parse(p.metadata).sentiment || 'neutral' : 'neutral',
      mentions: p.count
    })),
    patterns: patterns.map(p => ({
      pattern: p.content,
      frequency: `${p.count} times`,
      firstSeen: p.first_date,
      lastSeen: p.last_date
    })),
  };
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

  const insightsByType: Record<InsightType, number> = {
    theme: 0, emotion: 0, goal: 0, person: 0, pattern: 0, milestone: 0
  };
  for (const row of byType) {
    insightsByType[row.insight_type as InsightType] = row.count;
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
