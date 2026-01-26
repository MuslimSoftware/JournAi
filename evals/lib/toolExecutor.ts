import { select, searchFTS, closeDb } from './db';

export type ToolName = 'query_insights' | 'query_entries' | 'get_entries_by_ids';

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

interface QueryInsightsFilters {
  category?: ('people' | 'emotions')[];
  sentiment?: string[];
  dateRange?: { start: string; end: string };
  search?: string;
  name?: string;
}

interface QueryInsightsArgs {
  filters?: QueryInsightsFilters;
  groupBy?: 'entity' | 'category' | 'sentiment' | 'date';
  orderBy?: { field: 'count' | 'date' | 'intensity'; direction: 'asc' | 'desc' };
  limit?: number;
  includeEntryIds?: boolean;
}

interface QueryEntriesFilters {
  dateRange?: { start: string; end: string };
  search?: string;
  hasInsights?: boolean;
}

interface QueryEntriesArgs {
  filters?: QueryEntriesFilters;
  orderBy?: { field: 'date' | 'relevance'; direction: 'asc' | 'desc' };
  limit?: number;
  returnFullText?: boolean;
}

interface GetEntriesByIdsArgs {
  entryIds: string[];
}

function generateSnippet(content: string, query: string, maxLength: number = 3000): string {
  if (content.length <= maxLength) {
    return content.trim();
  }

  const lower = content.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  let bestStart = 0;
  for (const term of queryTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) {
      bestStart = Math.max(0, idx - 200);
      break;
    }
  }

  const snippet = content.slice(bestStart, bestStart + maxLength);
  return (bestStart > 0 ? '...' : '') + snippet.trim() + (bestStart + maxLength < content.length ? '...' : '');
}

async function executeQueryInsights(args: QueryInsightsArgs): Promise<unknown> {
  const limit = Math.min(args.limit || 10, 50);
  const includeEntryIds = args.includeEntryIds !== false;
  const filters = args.filters || {};

  if (args.filters?.search) {
    const searchResults = await searchFTS(args.filters.search, limit * 2);
    const entryIds = searchResults.map(r => r.id);

    if (entryIds.length === 0) {
      return [];
    }

    const placeholders = entryIds.map((_, i) => `?`).join(',');
    let query = `SELECT ji.content, ji.metadata, ji.entry_id, ji.entry_date, ji.insight_type
                 FROM journal_insights ji
                 WHERE ji.entry_id IN (${placeholders})`;
    const params: unknown[] = [...entryIds];

    if (filters.category) {
      const types = filters.category.map(c => c === 'people' ? 'person' : 'emotion');
      query += ` AND ji.insight_type IN (${types.map(() => `?`).join(',')})`;
      params.push(...types);
    }

    if (filters.sentiment) {
      query += ` AND json_extract(ji.metadata, '$.sentiment') IN (${filters.sentiment.map(() => `?`).join(',')})`;
      params.push(...filters.sentiment);
    }

    query += ` ORDER BY ji.entry_date DESC LIMIT ?`;
    params.push(limit);

    const rows = await select<{
      content: string;
      metadata: string;
      entry_id: string;
      entry_date: string;
      insight_type: string;
    }>(query, params);

    return rows.map(r => {
      const meta = r.metadata ? JSON.parse(r.metadata) : {};
      const result: Record<string, unknown> = {
        type: r.insight_type,
        name: r.content,
        entryDate: r.entry_date,
        ...(includeEntryIds && { entryId: r.entry_id }),
      };

      if (r.insight_type === 'person') {
        if (meta.relationship) result.relationship = meta.relationship;
        if (meta.sentiment) result.sentiment = meta.sentiment;
        if (meta.context) result.context = meta.context;
      } else {
        if (meta.intensity) result.intensity = meta.intensity;
        if (meta.trigger) result.trigger = meta.trigger;
        if (meta.sentiment) result.sentiment = meta.sentiment;
      }

      return result;
    });
  }

  if (args.groupBy === 'entity') {
    const categoryFilter = filters.category || ['people', 'emotions'];
    const types = categoryFilter.map(c => c === 'people' ? 'person' : 'emotion');

    const placeholders = types.map(() => `?`).join(',');
    let query = `SELECT ji.content, ji.insight_type, ji.metadata, ji.entry_id, ji.entry_date
                 FROM journal_insights ji
                 WHERE ji.insight_type IN (${placeholders})`;
    const params: unknown[] = [...types];

    if (filters.sentiment) {
      query += ` AND json_extract(ji.metadata, '$.sentiment') IN (${filters.sentiment.map(() => `?`).join(',')})`;
      params.push(...filters.sentiment);
    }

    if (filters.dateRange) {
      query += ` AND ji.entry_date >= ? AND ji.entry_date <= ?`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.name) {
      query += ` AND LOWER(ji.content) LIKE '%' || ? || '%'`;
      params.push(filters.name.toLowerCase());
    }

    query += ` ORDER BY ji.entry_date DESC`;

    const rows = await select<{
      content: string;
      insight_type: string;
      metadata: string;
      entry_id: string;
      entry_date: string;
    }>(query, params);

    const grouped = new Map<string, {
      name: string;
      type: string;
      count: number;
      sentiment?: string;
      relationship?: string;
      context?: string;
      avgIntensity?: number;
      totalIntensity?: number;
      entryIds: string[];
      mostRecentDate: string;
    }>();

    for (const row of rows) {
      const key = `${row.insight_type}:${row.content.toLowerCase()}`;
      const meta = row.metadata ? JSON.parse(row.metadata) : {};

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: row.content,
          type: row.insight_type,
          count: 0,
          entryIds: [],
          mostRecentDate: row.entry_date,
          ...(row.insight_type === 'person' && meta.sentiment && { sentiment: meta.sentiment }),
          ...(row.insight_type === 'person' && meta.relationship && { relationship: meta.relationship }),
          ...(row.insight_type === 'person' && meta.context && { context: meta.context }),
          ...(row.insight_type === 'emotion' && { totalIntensity: 0 }),
        });
      }

      const entry = grouped.get(key)!;
      entry.count++;
      if (includeEntryIds && !entry.entryIds.includes(row.entry_id)) {
        entry.entryIds.push(row.entry_id);
      }
      if (row.insight_type === 'emotion' && meta.intensity) {
        entry.totalIntensity = (entry.totalIntensity || 0) + meta.intensity;
      }
      if (row.entry_date > entry.mostRecentDate) {
        entry.mostRecentDate = row.entry_date;
        if (row.insight_type === 'person' && meta.context) {
          entry.context = meta.context;
        }
      }
    }

    let results = Array.from(grouped.values()).map(entry => {
      const result: Record<string, unknown> = {
        name: entry.name,
        type: entry.type,
        count: entry.count,
        mostRecentDate: entry.mostRecentDate,
      };

      if (entry.type === 'person') {
        if (entry.sentiment) result.sentiment = entry.sentiment;
        if (entry.relationship) result.relationship = entry.relationship;
        if (entry.context) result.context = entry.context;
      } else if (entry.type === 'emotion') {
        if (entry.totalIntensity) {
          result.avgIntensity = Math.round((entry.totalIntensity / entry.count) * 10) / 10;
        }
      }

      if (includeEntryIds) {
        result.entryIds = entry.entryIds.slice(0, 10);
      }

      return result;
    });

    if (args.orderBy) {
      const { field, direction } = args.orderBy;
      results.sort((a, b) => {
        let aVal = a[field] as number | string;
        let bVal = b[field] as number | string;

        if (field === 'intensity') {
          aVal = (a.avgIntensity as number) || 0;
          bVal = (b.avgIntensity as number) || 0;
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'desc' ? bVal - aVal : aVal - bVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return direction === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        return 0;
      });
    }

    return results.slice(0, limit);
  }

  const type = filters.category?.[0] === 'people' ? 'person' : filters.category?.[0] === 'emotions' ? 'emotion' : undefined;

  let query = `SELECT content, metadata, entry_id, entry_date, insight_type FROM journal_insights WHERE 1=1`;
  const params: unknown[] = [];

  if (type) {
    query += ` AND insight_type = ?`;
    params.push(type);
  }

  if (filters.name) {
    query += ` AND LOWER(content) LIKE '%' || ? || '%'`;
    params.push(filters.name.toLowerCase());
  }

  if (filters.sentiment) {
    query += ` AND json_extract(metadata, '$.sentiment') IN (${filters.sentiment.map(() => '?').join(',')})`;
    params.push(...filters.sentiment);
  }

  query += ` ORDER BY entry_date DESC LIMIT ?`;
  params.push(limit);

  const rows = await select<{
    content: string;
    metadata: string;
    entry_id: string;
    entry_date: string;
    insight_type: string;
  }>(query, params);

  return rows.map(r => {
    const meta = r.metadata ? JSON.parse(r.metadata) : {};
    const base = {
      type: r.insight_type,
      sentiment: meta.sentiment,
      ...(includeEntryIds && { entryId: r.entry_id }),
      entryDate: r.entry_date,
    };

    if (r.insight_type === 'person') {
      return {
        ...base,
        name: r.content,
        relationship: meta.relationship,
        context: meta.context,
      };
    } else {
      return {
        ...base,
        emotion: r.content,
        intensity: meta.intensity,
        trigger: meta.trigger,
      };
    }
  });
}

async function executeQueryEntries(args: QueryEntriesArgs): Promise<unknown> {
  const limit = Math.min(args.limit || 10, 50);
  const returnFullText = args.returnFullText || false;
  const filters = args.filters || {};

  if (filters.search) {
    const searchResults = await searchFTS(filters.search, limit, filters.dateRange);

    return searchResults.map(r => ({
      entryId: r.id,
      date: r.date,
      ...(returnFullText && { content: r.content }),
      ...(!returnFullText && { snippet: generateSnippet(r.content, filters.search!, 200) }),
      score: -r.rank,
    }));
  }

  let query = 'SELECT e.id, e.date, e.content FROM entries e';
  const params: unknown[] = [];
  const whereClauses: string[] = [];

  if (filters.dateRange) {
    whereClauses.push(`e.date >= ? AND e.date <= ?`);
    params.push(filters.dateRange.start, filters.dateRange.end);
  }

  if (filters.hasInsights !== undefined) {
    if (filters.hasInsights) {
      whereClauses.push(`e.id IN (SELECT DISTINCT entry_id FROM journal_insights)`);
    } else {
      whereClauses.push(`e.id NOT IN (SELECT DISTINCT entry_id FROM journal_insights)`);
    }
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  const orderField = args.orderBy?.field || 'date';
  const orderDir = args.orderBy?.direction || 'desc';
  query += ` ORDER BY e.${orderField} ${orderDir.toUpperCase()} LIMIT ?`;
  params.push(limit);

  const rows = await select<{ id: string; date: string; content: string }>(query, params);

  return rows.map(r => ({
    entryId: r.id,
    date: r.date,
    ...(returnFullText && { content: r.content }),
    ...(!returnFullText && { snippet: r.content.slice(0, 200) }),
  }));
}

async function executeGetEntriesByIds(args: GetEntriesByIdsArgs): Promise<unknown> {
  if (!args.entryIds || args.entryIds.length === 0) {
    return [];
  }

  const placeholders = args.entryIds.map(() => '?').join(', ');
  const rows = await select<{ id: string; date: string; content: string }>(
    `SELECT id, date, content FROM entries WHERE id IN (${placeholders})`,
    args.entryIds
  );

  return rows.map(e => ({
    entryId: e.id,
    date: e.date,
    content: e.content,
  }));
}

export async function executeToolCall(
  name: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    let data: unknown;

    switch (name) {
      case 'query_insights':
        data = await executeQueryInsights(args as QueryInsightsArgs);
        break;
      case 'query_entries':
        data = await executeQueryEntries(args as QueryEntriesArgs);
        break;
      case 'get_entries_by_ids':
        data = await executeGetEntriesByIds(args as unknown as GetEntriesByIdsArgs);
        break;
      default:
        return { success: false, data: null, error: `Unknown tool: ${name}` };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function cleanup(): void {
  closeDb();
}
