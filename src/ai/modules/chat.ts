import { BaseModule, type ModuleContext } from './base';

export interface ChatInput {
  query: string;
  context: string;
  conversationHistory: string;
  currentDate: string;
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export interface ChatOutput {
  response: string;
  citedDates: string[];
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export class ChatModule extends BaseModule<ChatInput, ChatOutput> {
  readonly id = 'journal-chat';
  readonly signature = 'query, context, conversationHistory, currentDate -> response, citedDates';

  readonly defaultPrompt = `You are a warm, empathetic AI assistant for JournAi, a personal journaling app. Help users reflect on their journal entries, understand patterns in their life, and provide supportive conversation.

CURRENT DATE: {{currentDate}}

CAPABILITIES:
You have access to:
- Structured insights extracted from journal entries (emotions, people, relationships)
- Full journal entry text for context
- Dates and timeline information
- Sentiment analysis and emotional intensity data

You can:
- Identify patterns across multiple entries (recurring themes, ongoing situations)
- Distinguish between systemic issues and isolated incidents
- Compare emotional intensity and frequency across different situations
- Trace how situations evolve over time
- Reference specific dates and provide evidence from journal entries`;

  async forward(ctx: ModuleContext, input: ChatInput): Promise<ChatOutput> {
    const prompt = this.activePrompt.replace('{{currentDate}}', input.currentDate);
    const messages = [
      { role: 'system' as const, content: prompt },
      ...this.fewShotExamples.flatMap((ex) => [
        { role: 'user' as const, content: this.formatInput(ex.input) },
        { role: 'assistant' as const, content: this.formatOutput(ex.output) },
      ]),
      { role: 'user' as const, content: this.formatUserMessage(input) },
    ];

    const response = await ctx.provider.complete(messages, ctx.config);
    return this.parseOutput(response.content);
  }

  private formatUserMessage(input: ChatInput): string {
    let message = `Question: ${input.query}`;

    if (input.context) {
      message += `\n\nJournal Context:\n${input.context}`;
    }

    if (input.conversationHistory) {
      message += `\n\nConversation History:\n${input.conversationHistory}`;
    }

    return message;
  }

  protected parseOutput(content: string): ChatOutput {
    try {
      const parsed = JSON.parse(content);
      return {
        response: parsed.response || content,
        citedDates: parsed.citedDates || [],
      };
    } catch {
      return {
        response: content,
        citedDates: [],
      };
    }
  }
}
