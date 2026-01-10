import type { OpenAITool } from '../types/chat';
import { hybridSearch } from './search';
import { getAggregatedInsights } from './analytics';
import { getEntriesByDateRange } from './entries';

export const AGENT_TOOLS: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'search_journal',
      description: "Search the user's journal entries using semantic search. Use for finding specific entries, topics, or when the user asks about something they wrote.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant journal entries',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of entries to return (default: 8, max: 20)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_insights',
      description: 'Get aggregated insights from the journal including recurring themes, emotional patterns, goals, key people mentioned, and behavioral patterns. Use for questions about trends, patterns, or "how am I doing" type questions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_entries_by_date',
      description: 'Get all journal entries within a specific date range. Use for summaries of specific time periods like "this week" or "last month".',
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format',
          },
          end: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format',
          },
        },
        required: ['start', 'end'],
      },
    },
  },
];

export type ToolName = 'search_journal' | 'get_insights' | 'get_entries_by_date';

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export async function executeToolCall(
  name: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'search_journal': {
        const query = args.query as string;
        const limit = Math.min((args.limit as number) || 8, 20);
        const results = await hybridSearch(query, { limit });
        return {
          success: true,
          data: results.map((r) => ({
            date: r.date,
            content: r.content,
            entryId: r.entryId,
          })),
        };
      }
      case 'get_insights': {
        const insights = await getAggregatedInsights();
        return { success: true, data: insights };
      }
      case 'get_entries_by_date': {
        const start = args.start as string;
        const end = args.end as string;
        const entries = await getEntriesByDateRange(start, end);
        return {
          success: true,
          data: entries.map((e) => ({
            id: e.id,
            date: e.date,
            content: e.content,
          })),
        };
      }
      default:
        return { success: false, data: null, error: `Unknown tool: ${name}` };
    }
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
      case 'search_journal':
        return `Searching for "${parsed.query}"`;
      case 'get_insights':
        return 'Getting journal insights';
      case 'get_entries_by_date':
        return `Getting entries from ${parsed.start} to ${parsed.end}`;
      default:
        return name;
    }
  } catch {
    return name;
  }
}
