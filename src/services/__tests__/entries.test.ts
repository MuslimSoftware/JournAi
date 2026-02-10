import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEntries, createEntry, updateEntry, deleteEntry, getEntriesCount, getEntriesPage } from '../entries';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockEntryRow = {
  id: 'test-123',
  date: '2025-12-20',
  content: 'Test content',
  created_at: '2025-12-20T12:00:00Z',
  processed_at: null,
  content_hash: null,
};

describe('Entries Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1734700000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  describe('getEntries', () => {
    it('fetches all entries', async () => {
      mockInvoke.mockResolvedValue([mockEntryRow]);

      const entries = await getEntries();

      expect(mockInvoke).toHaveBeenCalledWith('plugin:sql|select', {
        db: 'sqlite:journai_secure.db',
        query: 'SELECT id, date, content, created_at, processed_at, content_hash FROM entries ORDER BY date DESC, created_at DESC',
        values: [],
      });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        id: 'test-123',
        date: '2025-12-20',
        content: 'Test content',
        preview: 'Test content',
        processedAt: null,
        contentHash: null,
      });
    });

    it('generates preview for long content', async () => {
      const longContent = 'A'.repeat(150);
      mockInvoke.mockResolvedValue([{ ...mockEntryRow, content: longContent }]);

      const entries = await getEntries();

      expect(entries[0].preview).toBe('A'.repeat(100) + '...');
    });
  });

  describe('getEntriesPage', () => {
    it('fetches paginated entries', async () => {
      mockInvoke.mockResolvedValue([mockEntryRow]);

      const page = await getEntriesPage(null, 20);

      expect(page.entries).toHaveLength(1);
      expect(page.hasMore).toBe(false);
      expect(page.nextCursor).toBeNull();
    });

    it('returns hasMore true when more entries exist', async () => {
      const rows = Array(21).fill(null).map((_, i) => ({
        ...mockEntryRow,
        id: `test-${i}`,
      }));
      mockInvoke.mockResolvedValue(rows);

      const page = await getEntriesPage(null, 20);

      expect(page.entries).toHaveLength(20);
      expect(page.hasMore).toBe(true);
    });
  });

  describe('createEntry', () => {
    it('creates entry with generated ID', async () => {
      mockInvoke.mockResolvedValue({ rowsAffected: 1 });

      const entry = await createEntry();

      expect(entry.id).toBe('1734700000000-4fzzzxj');
      expect(mockInvoke).toHaveBeenCalledWith('plugin:sql|execute', expect.objectContaining({
        query: expect.stringContaining('INSERT INTO entries'),
      }));
    });

    it('uses provided date', async () => {
      mockInvoke.mockResolvedValue({ rowsAffected: 1 });

      const entry = await createEntry('2025-01-15');

      expect(entry.date).toBe('2025-01-15');
    });

    it('defaults to today if no date provided', async () => {
      mockInvoke.mockResolvedValue({ rowsAffected: 1 });

      const entry = await createEntry();

      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('updateEntry', () => {
    it('updates content', async () => {
      const selectResults = [
        [mockEntryRow],
        [{ ...mockEntryRow, content: 'Updated content' }],
      ];

      mockInvoke.mockImplementation((command: string, payload?: { db?: string }) => {
        if (command === 'plugin:sql|load') {
          return Promise.resolve(payload?.db ?? 'sqlite:journai_secure.db');
        }
        if (command === 'plugin:sql|select') {
          return Promise.resolve(selectResults.shift() ?? []);
        }
        if (command === 'plugin:sql|execute') {
          return Promise.resolve({ rowsAffected: 1 });
        }
        return Promise.resolve(undefined);
      });

      const updated = await updateEntry('test-123', { content: 'Updated content' });

      expect(updated?.content).toBe('Updated content');
      expect(mockInvoke).toHaveBeenCalledWith('plugin:sql|execute', expect.objectContaining({
        query: expect.stringContaining('UPDATE entries SET content'),
      }));
    });

    it('updates date', async () => {
      const selectResults = [[{ ...mockEntryRow, date: '2025-01-01' }]];

      mockInvoke.mockImplementation((command: string, payload?: { db?: string }) => {
        if (command === 'plugin:sql|load') {
          return Promise.resolve(payload?.db ?? 'sqlite:journai_secure.db');
        }
        if (command === 'plugin:sql|select') {
          return Promise.resolve(selectResults.shift() ?? []);
        }
        if (command === 'plugin:sql|execute') {
          return Promise.resolve({ rowsAffected: 1 });
        }
        return Promise.resolve(undefined);
      });

      const updated = await updateEntry('test-123', { date: '2025-01-01' });

      expect(updated?.date).toBe('2025-01-01');
    });

    it('returns null for non-existent entry', async () => {
      mockInvoke.mockImplementation((command: string, payload?: { db?: string }) => {
        if (command === 'plugin:sql|load') {
          return Promise.resolve(payload?.db ?? 'sqlite:journai_secure.db');
        }
        if (command === 'plugin:sql|select') {
          return Promise.resolve([]);
        }
        if (command === 'plugin:sql|execute') {
          return Promise.resolve({ rowsAffected: 0 });
        }
        return Promise.resolve(undefined);
      });

      const updated = await updateEntry('nonexistent', { content: 'test' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteEntry', () => {
    it('returns true on successful deletion', async () => {
      mockInvoke.mockResolvedValue({ rowsAffected: 1 });

      const result = await deleteEntry('test-123');

      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('plugin:sql|execute', {
        db: 'sqlite:journai_secure.db',
        query: 'DELETE FROM entries WHERE id = $1',
        values: ['test-123'],
      });
    });

    it('returns false when entry not found', async () => {
      mockInvoke.mockResolvedValue({ rowsAffected: 0 });

      const result = await deleteEntry('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getEntriesCount', () => {
    it('returns count of entries', async () => {
      mockInvoke.mockResolvedValue([{ count: 42 }]);

      const count = await getEntriesCount();

      expect(count).toBe(42);
    });

    it('returns 0 when no entries', async () => {
      mockInvoke.mockResolvedValue([{ count: 0 }]);

      const count = await getEntriesCount();

      expect(count).toBe(0);
    });

    it('returns 0 on empty result', async () => {
      mockInvoke.mockResolvedValue([]);

      const count = await getEntriesCount();

      expect(count).toBe(0);
    });
  });
});
