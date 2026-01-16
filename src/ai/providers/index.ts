import type { LLMProvider } from './base';
import { OpenAIProvider } from './openai';

export type { LLMProvider, LLMConfig, LLMMessage, LLMResponse, StreamCallbacks } from './base';

const providers: Map<string, LLMProvider> = new Map();

export function registerProvider(provider: LLMProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): LLMProvider {
  const provider = providers.get(name);
  if (!provider) throw new Error(`Provider "${name}" not found`);
  return provider;
}

registerProvider(new OpenAIProvider());
