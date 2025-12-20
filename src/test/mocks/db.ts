import type { JournalEntry } from '../../types/entry';

export function createMockEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const id = overrides.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    date: overrides.date || '2025-12-20',
    content: overrides.content || 'Test entry content',
    preview: overrides.preview || 'Test entry content',
    ...overrides,
  };
}

export function createMockDbHandlers(entries: JournalEntry[] = []) {
  return {
    'plugin:sql|select': (args: { query: string }) => {
      if (args.query.includes('COUNT')) {
        return [{ count: entries.length }];
      }
      return entries.map(e => ({
        id: e.id,
        date: e.date,
        content: e.content,
        created_at: new Date().toISOString(),
      }));
    },
    'plugin:sql|execute': () => ({ rowsAffected: 1 }),
  };
}
