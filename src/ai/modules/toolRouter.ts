import { BaseModule, type ModuleContext } from './base';
import { TOOL_ROUTER_PROMPT } from '../prompts';

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

  readonly defaultPrompt = TOOL_ROUTER_PROMPT;

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
