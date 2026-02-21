import { LazyStore } from '@tauri-apps/plugin-store';

export const STORE_KEYS = {
  AI_API_KEY: 'ai.apiKey',
  AI_MODEL: 'ai.model',
  AI_SYSTEM_PROMPT: 'ai.systemPrompt',
  THEME_MODE: 'theme.mode',
  SECURITY_LOCK_TIMEOUT_SECONDS: 'security.lockTimeoutSeconds',
} as const;

class AppStore {
  private store: LazyStore;

  constructor(storePath: string = 'settings.json') {
    this.store = new LazyStore(storePath);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.store.get<T>(key);
      return value ?? null;
    } catch (error) {
      console.error(`Failed to get key "${key}" from store:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.store.set(key, value);
      await this.store.save();
    } catch (error) {
      console.error(`Failed to set key "${key}" in store:`, error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return await this.store.has(key);
    } catch (error) {
      console.error(`Failed to check key "${key}" in store:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.store.delete(key);
      await this.store.save();
    } catch (error) {
      console.error(`Failed to delete key "${key}" from store:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.store.clear();
      await this.store.save();
    } catch (error) {
      console.error('Failed to clear store:', error);
    }
  }
}

export const appStore = new AppStore();
