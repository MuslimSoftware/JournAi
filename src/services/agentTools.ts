import type { OpenAITool } from '../types/chat';
import { hybridSearch } from './search';
import { getFilteredInsights } from './analytics';
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
      description: 'Get specific insights from the journal about emotions or people. Use filters to get relevant results. For questions about a specific person, use the person filter. For questions about emotions, use type or sentiment filters.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['emotion', 'person'],
            description: 'Filter by insight type. Use "person" for questions about relationships, "emotion" for questions about feelings.',
          },
          name: {
            type: 'string',
            description: 'Filter by name - either a person\'s name or an emotion name (e.g., "frustrated", "happy", "wife", "mom")',
          },
          sentiment: {
            type: 'string',
            enum: ['positive', 'negative', 'neutral', 'tense', 'mixed'],
            description: 'Filter by sentiment. Use "negative" to find difficult interactions or negative emotions.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of insights to return (default: 15, max: 30)',
          },
        },
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
        const type = args.type as 'emotion' | 'person' | undefined;
        const name = args.name as string | undefined;
        const sentiment = args.sentiment as 'positive' | 'negative' | 'neutral' | 'tense' | 'mixed' | undefined;
        const limit = Math.min((args.limit as number) || 15, 30);
        const insights = await getFilteredInsights({ type, name, sentiment, limit });
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
      case 'get_insights': {
        const parts: string[] = [];
        if (parsed.name) parts.push(`"${parsed.name}"`);
        if (parsed.type) parts.push(parsed.type === 'person' ? 'people' : 'emotions');
        if (parsed.sentiment) parts.push(parsed.sentiment);
        if (parts.length === 0) return 'Getting insights';
        return `Getting ${parts.join(' ')} insights`;
      }
      case 'get_entries_by_date':
        return `Getting entries from ${parsed.start} to ${parsed.end}`;
      default:
        return name;
    }
  } catch {
    return name;
  }
}
