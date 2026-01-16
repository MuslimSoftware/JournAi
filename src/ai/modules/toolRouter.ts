import { BaseModule, type ModuleContext } from './base';

export interface ToolRouterInput {
  query: string;
  availableTools: string[];
  currentDate: string;
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export interface ToolRouterOutput {
  shouldUseTool: boolean;
  toolName: string | null;
  toolArguments: Record<string, unknown> | null;
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export class ToolRouterModule extends BaseModule<ToolRouterInput, ToolRouterOutput> {
  readonly id = 'tool-router';
  readonly signature = 'query, availableTools, currentDate -> shouldUseTool, toolName, toolArguments';

  readonly defaultPrompt = `You are a routing module that decides whether a user query requires tool usage.

CURRENT DATE: {{currentDate}}

AVAILABLE TOOLS:
- search_journal(query: string): Search journal entries by keyword or topic
- get_insights(type?: "emotions" | "people" | "locations"): Get analytics and patterns from journal
- get_entries_by_date(startDate: string, endDate?: string): Retrieve entries from date range

TOOL SELECTION RULES:
- search_journal: Use when user asks about specific topics, events, or keywords
- get_insights: Use for questions about emotions, people mentioned, places visited, or patterns
- get_entries_by_date: Use for time-based queries like "this week", "last month", specific dates
- No tool needed: General conversation, greetings, follow-up questions, or meta questions about the app

DATE CALCULATIONS (from {{currentDate}}):
- "this week" = last 7 days
- "last week" = 7-14 days ago
- "this month" = last 30 days
- "last month" = 30-60 days ago
- "today" = currentDate only

OUTPUT FORMAT (JSON):
{
  "shouldUseTool": boolean,
  "toolName": string | null,
  "toolArguments": object | null
}`;

  async forward(ctx: ModuleContext, input: ToolRouterInput): Promise<ToolRouterOutput> {
    const prompt = this.activePrompt
      .replace(/\{\{currentDate\}\}/g, input.currentDate)
      .replace('{{availableTools}}', input.availableTools.join(', '));

    const messages = [
      { role: 'system' as const, content: prompt },
      ...this.fewShotExamples.flatMap((ex) => [
        { role: 'user' as const, content: ex.input.query as string },
        { role: 'assistant' as const, content: this.formatOutput(ex.output) },
      ]),
      { role: 'user' as const, content: input.query },
    ];

    const response = await ctx.provider.complete(messages, ctx.config);
    console.log('[ToolRouter] Raw response:', response.content);
    const parsed = this.parseOutput(response.content);
    console.log('[ToolRouter] Parsed:', parsed);
    return parsed;
  }

  protected parseOutput(content: string): ToolRouterOutput {
    try {
      const cleaned = content.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[ToolRouter] Parse error:', e, 'Content:', content);
      return {
        shouldUseTool: false,
        toolName: null,
        toolArguments: null,
      };
    }
  }
}
