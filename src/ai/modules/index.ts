import type { Module, ModuleInput, ModuleOutput, CompiledArtifact } from './base';
import { ChatModule } from './chat';
import { ToolRouterModule } from './toolRouter';

export type { Module, ModuleInput, ModuleOutput, ModuleContext, CompiledArtifact } from './base';
export { BaseModule } from './base';
export { ChatModule, type ChatInput, type ChatOutput } from './chat';
export { ToolRouterModule, type ToolRouterInput, type ToolRouterOutput } from './toolRouter';

type AnyModule = Module<ModuleInput, ModuleOutput>;

const modules: Map<string, AnyModule> = new Map();

export function registerModule(module: AnyModule): void {
  modules.set(module.id, module);
}

export function getModule<T extends AnyModule>(id: string): T {
  const module = modules.get(id);
  if (!module) throw new Error(`Module "${id}" not found`);
  return module as T;
}

export function getAllModules(): AnyModule[] {
  return Array.from(modules.values());
}

export async function loadCompiledModule(id: string, artifact: CompiledArtifact): Promise<void> {
  const module = getModule(id);
  module.compile(artifact);
}

registerModule(new ChatModule());
registerModule(new ToolRouterModule());
