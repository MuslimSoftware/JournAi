import type { LLMProvider, LLMConfig } from '../providers';

export interface ModuleInput {
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export interface ModuleOutput {
  [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
}

export interface ModuleContext {
  provider: LLMProvider;
  config: LLMConfig;
}

export interface CompiledArtifact {
  moduleId: string;
  version: string;
  compiledAt: string;
  prompt: string;
  fewShotExamples: Array<{ input: ModuleInput; output: ModuleOutput }>;
  metadata: Record<string, unknown>;
}

export interface Module<TInput extends ModuleInput, TOutput extends ModuleOutput> {
  readonly id: string;
  readonly signature: string;
  readonly defaultPrompt: string;

  forward(ctx: ModuleContext, input: TInput): Promise<TOutput>;
  compile(artifact: CompiledArtifact): void;
  export(): CompiledArtifact;
}

export abstract class BaseModule<TInput extends ModuleInput, TOutput extends ModuleOutput>
  implements Module<TInput, TOutput>
{
  abstract readonly id: string;
  abstract readonly signature: string;
  abstract readonly defaultPrompt: string;

  protected compiledPrompt: string | null = null;
  protected fewShotExamples: Array<{ input: TInput; output: TOutput }> = [];

  get activePrompt(): string {
    return this.compiledPrompt ?? this.defaultPrompt;
  }

  abstract forward(ctx: ModuleContext, input: TInput): Promise<TOutput>;

  compile(artifact: CompiledArtifact): void {
    if (artifact.moduleId !== this.id) {
      throw new Error(`Artifact module "${artifact.moduleId}" doesn't match "${this.id}"`);
    }
    this.compiledPrompt = artifact.prompt;
    this.fewShotExamples = artifact.fewShotExamples as Array<{ input: TInput; output: TOutput }>;
  }

  export(): CompiledArtifact {
    return {
      moduleId: this.id,
      version: '1.0',
      compiledAt: new Date().toISOString(),
      prompt: this.activePrompt,
      fewShotExamples: this.fewShotExamples,
      metadata: {},
    };
  }

  protected buildMessages(input: TInput): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: this.activePrompt },
    ];

    for (const example of this.fewShotExamples) {
      messages.push({ role: 'user', content: this.formatInput(example.input) });
      messages.push({ role: 'assistant', content: this.formatOutput(example.output) });
    }

    messages.push({ role: 'user', content: this.formatInput(input) });
    return messages;
  }

  protected formatInput(input: TInput): string {
    return JSON.stringify(input);
  }

  protected formatOutput(output: TOutput): string {
    return JSON.stringify(output);
  }

  protected parseOutput(content: string): TOutput {
    return JSON.parse(content) as TOutput;
  }
}
