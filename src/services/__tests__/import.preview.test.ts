import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadTextFile = vi.fn();
const mockReadDir = vi.fn();
const mockSelect = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args),
}));

vi.mock('../../lib/db', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
}));

import { buildImportPreview } from '../import';

describe('Import Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockImplementation((query: string) => {
      if (query.includes('FROM entries')) {
        return Promise.resolve([
          { id: 'entry-1', date: '2025-01-01', content: 'Existing entry' },
        ]);
      }

      if (query.includes('FROM todos')) {
        return Promise.resolve([
          { date: '2025-01-01', content: 'Existing todo', completed: 0, scheduled_time: null },
        ]);
      }

      if (query.includes('FROM sticky_notes')) {
        return Promise.resolve([
          { date: '2025-01-01', content: 'Existing note' },
        ]);
      }

      return Promise.resolve([]);
    });
  });

  it('builds expected create/append/skip counts', async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { date: '2025-01-01', content: 'Imported block' },
          { date: '2025-01-02', content: 'New entry for day 2' },
        ],
        todos: [
          { date: '2025-01-01', content: 'Existing todo', completed: false, scheduledTime: null },
          { date: '2025-01-02', content: 'New todo', completed: true, scheduledTime: '08:00' },
        ],
        stickyNotes: [
          { date: '2025-01-01', content: 'Existing note' },
          { date: '2025-01-02', content: 'New note' },
        ],
      })
    );

    const preview = await buildImportPreview({ format: 'json_bundle', path: '/tmp/data.json' });

    expect(preview.errors).toEqual([]);
    expect(preview.totals).toEqual({
      entriesToCreate: 1,
      entriesToAppend: 1,
      todosToCreate: 1,
      stickyNotesToCreate: 1,
      duplicatesSkipped: 2,
    });
  });

  it('returns validation errors and blocks execution readiness', async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        entries: [{ date: '2025-99-99', content: 'Invalid date' }],
        todos: [],
        stickyNotes: [],
      })
    );

    const preview = await buildImportPreview({ format: 'json_bundle', path: '/tmp/data.json' });

    expect(preview.errors.length).toBeGreaterThan(0);
    expect(preview.totals.entriesToCreate).toBe(0);
    expect(preview.plan.records.entries).toHaveLength(0);
  });
});
