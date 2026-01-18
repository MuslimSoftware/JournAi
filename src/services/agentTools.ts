import type { OpenAITool } from '../types/chat';
import { hybridSearch } from './search';
import { getFilteredInsights } from './analytics';
import { getEntriesByIds } from './entries';
import { select } from '../lib/db';

export const AGENT_TOOLS: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'query_insights',
      description: `Query insights with flexible filtering, aggregation, and ordering. Insights are pre-extracted emotions and people from journal entries.

Examples:
- Find negative people: {filters: {category: ["people"], sentiment: ["negative"]}, groupBy: "entity", orderBy: {field: "count", direction: "desc"}, limit: 5}
- Search for mentions of "gym": {filters: {search: "gym workout exercise"}, limit: 10}
- Get recent emotions: {filters: {category: ["emotions"]}, orderBy: {field: "date", direction: "desc"}, limit: 10}`,
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filters to apply to insights',
            properties: {
              category: {
                type: 'array',
                items: { type: 'string', enum: ['people', 'emotions'] },
                description: 'Filter by category type (people or emotions)',
              },
              sentiment: {
                type: 'array',
                items: { type: 'string', enum: ['positive', 'negative', 'neutral', 'tense', 'mixed'] },
                description: 'Filter by sentiment',
              },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                  end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                },
                description: 'Filter by date range',
              },
              search: {
                type: 'string',
                description: 'Semantic search query to find relevant insights. Use for "mentions of X" queries.',
              },
              name: {
                type: 'string',
                description: 'Filter by specific person name or emotion name (partial match)',
              },
            },
          },
          groupBy: {
            type: 'string',
            enum: ['entity', 'category', 'sentiment', 'date'],
            description: 'Group results by field. Use "entity" to aggregate by person/emotion name.',
          },
          orderBy: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['count', 'date', 'intensity'],
                description: 'Field to sort by',
              },
              direction: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort direction',
              },
            },
            description: 'How to order results',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10, max: 50)',
          },
          includeEntryIds: {
            type: 'boolean',
            description: 'Include related entry IDs in results (default: true)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_entries',
      description: `Query journal entries with flexible filtering. Returns entry metadata and optional full text.

Examples:
- Semantic search: {filters: {search: "work stress project deadline"}, limit: 5}
- Date range: {filters: {dateRange: {start: "2024-12-01", end: "2024-12-31"}}, limit: 20}
- Recent entries: {orderBy: {field: "date", direction: "desc"}, limit: 10, returnFullText: false}`,
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            description: 'Filters to apply to entries',
            properties: {
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                  end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                },
                description: 'Filter by date range',
              },
              search: {
                type: 'string',
                description: 'Semantic search query using hybrid BM25+vector search. Finds relevant entries.',
              },
              hasInsights: {
                type: 'boolean',
                description: 'Filter entries that have been analyzed for insights',
              },
            },
          },
          orderBy: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['date', 'relevance'],
                description: 'Field to sort by. Use "relevance" only with search queries.',
              },
              direction: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort direction',
              },
            },
            description: 'How to order results',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of entries to return (default: 10, max: 50)',
          },
          returnFullText: {
            type: 'boolean',
            description: 'Return full entry text. Default false (returns IDs and dates only).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_entries_by_ids',
      description: 'Retrieve full text content for specific entry IDs. Use when you need detailed entry content after querying.',
      parameters: {
        type: 'object',
        properties: {
          entryIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of entry IDs to retrieve',
          },
        },
        required: ['entryIds'],
      },
    },
  },
];

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

async function executeQueryInsights(args: QueryInsightsArgs): Promise<unknown> {
  const limit = Math.min(args.limit || 10, 50);
  const includeEntryIds = args.includeEntryIds !== false;
  const filters = args.filters || {};

  if (args.filters?.search) {
    const searchResults = await hybridSearch(args.filters.search, { limit: limit * 2 });
    const entryIds = searchResults.map(r => r.entryId);

    if (entryIds.length === 0) {
      return [];
    }

    let query = `SELECT ji.content, ji.metadata, ji.entry_id, ji.entry_date, ji.insight_type
                 FROM journal_insights ji
                 WHERE ji.entry_id IN (${entryIds.map((_, i) => `$${i + 1}`).join(',')})`;
    const params: unknown[] = [...entryIds];
    let paramIndex = entryIds.length + 1;

    if (filters.category) {
      const types = filters.category.map(c => c === 'people' ? 'person' : 'emotion');
      query += ` AND ji.insight_type IN (${types.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...types);
    }

    if (filters.sentiment) {
      query += ` AND json_extract(ji.metadata, '$.sentiment') IN (${filters.sentiment.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...filters.sentiment);
    }

    query += ` ORDER BY ji.entry_date DESC LIMIT $${paramIndex}`;
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

    let query = `SELECT ji.content, ji.insight_type, ji.metadata, ji.entry_id, ji.entry_date
                 FROM journal_insights ji
                 WHERE ji.insight_type IN (${types.map((_, i) => `$${i + 1}`).join(',')})`;
    const params: unknown[] = [...types];
    let paramIndex = types.length + 1;

    if (filters.sentiment) {
      query += ` AND json_extract(ji.metadata, '$.sentiment') IN (${filters.sentiment.map(() => `$${paramIndex++}`).join(',')})`;
      params.push(...filters.sentiment);
    }

    if (filters.dateRange) {
      query += ` AND ji.entry_date >= $${paramIndex++} AND ji.entry_date <= $${paramIndex++}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.name) {
      query += ` AND LOWER(ji.content) LIKE '%' || $${paramIndex++} || '%'`;
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
  const insights = await getFilteredInsights({
    type,
    name: filters.name,
    sentiment: filters.sentiment?.[0] as 'positive' | 'negative' | 'neutral' | 'tense' | 'mixed',
    limit,
  });

  return insights.map(insight => {
    const base = {
      type: insight.type,
      sentiment: insight.sentiment,
      ...(includeEntryIds && { entryId: insight.entryId }),
      entryDate: insight.entryDate,
    };

    if (insight.type === 'person') {
      return {
        ...base,
        name: insight.name,
        relationship: insight.relationship,
        context: insight.context,
      };
    } else if (insight.type === 'emotion') {
      return {
        ...base,
        emotion: insight.emotion,
        intensity: insight.intensity,
        trigger: insight.trigger,
      };
    } else {
      // insight.type === 'event'
      return {
        ...base,
        event: insight.event,
        category: insight.category,
        location: insight.location,
        participants: insight.participants,
      };
    }
  });
}

async function executeQueryEntries(args: QueryEntriesArgs): Promise<unknown> {
  const limit = Math.min(args.limit || 10, 50);
  const returnFullText = args.returnFullText || false;
  const filters = args.filters || {};

  if (filters.search) {
    const searchResults = await hybridSearch(filters.search, {
      limit,
      dateRange: filters.dateRange,
    });

    return searchResults.map(r => ({
      entryId: r.entryId,
      date: r.date,
      ...(returnFullText && { content: r.content }),
      ...(!returnFullText && { snippet: r.snippet.slice(0, 200) }),
      score: r.score,
    }));
  }

  let query = 'SELECT e.id, e.date, e.content FROM entries e';
  const params: unknown[] = [];
  let paramIndex = 1;
  const whereClauses: string[] = [];

  if (filters.dateRange) {
    whereClauses.push(`e.date >= $${paramIndex++} AND e.date <= $${paramIndex++}`);
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
  query += ` ORDER BY e.${orderField} ${orderDir.toUpperCase()} LIMIT $${paramIndex}`;
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

  const entries = await getEntriesByIds(args.entryIds);
  return entries.map(e => ({
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

export function formatToolResultForAPI(result: ToolResult): string {
  if (!result.success) {
    return JSON.stringify({ error: result.error });
  }
  return JSON.stringify(result.data);
}

export function getToolDescription(name: string, args: string): string {
  try {
    const parsed = JSON.parse(args);
    switch (name) {
      case 'query_insights': {
        const parts: string[] = [];
        if (parsed.filters?.search) parts.push(`searching "${parsed.filters.search}"`);
        if (parsed.filters?.category) parts.push(parsed.filters.category.join(', '));
        if (parsed.filters?.sentiment) parts.push(parsed.filters.sentiment.join(', '));
        if (parsed.groupBy) parts.push(`grouped by ${parsed.groupBy}`);
        if (parts.length === 0) return 'Querying insights';
        return `Querying ${parts.join(' ')} insights`;
      }
      case 'query_entries': {
        if (parsed.filters?.search) return `Searching entries for "${parsed.filters.search}"`;
        if (parsed.filters?.dateRange) {
          return `Getting entries from ${parsed.filters.dateRange.start} to ${parsed.filters.dateRange.end}`;
        }
        return 'Querying entries';
      }
      case 'get_entries_by_ids':
        return `Getting ${parsed.entryIds?.length || 0} entries`;
      default:
        return name;
    }
  } catch {
    return name;
  }
}
