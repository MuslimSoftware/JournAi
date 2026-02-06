import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadTextFile = vi.fn();
const mockReadDir = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args),
}));

import { parseJsonBundle } from '../import/parsers/jsonBundle';
import { parseCsvFolder } from '../import/parsers/csvFolder';

describe('Import Parsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses a valid JSON bundle', async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        entries: [{ date: '2025-01-01', content: 'Entry content' }],
        todos: [{ date: '2025-01-01', content: 'Buy milk', completed: true, scheduledTime: '9:00 AM' }],
        stickyNotes: [{ date: '2025-01-01', content: 'Call Alex' }],
      })
    );

    const result = await parseJsonBundle('/tmp/import.json');

    expect(result.errors).toEqual([]);
    expect(result.records.entries).toEqual([{ date: '2025-01-01', content: 'Entry content' }]);
    expect(result.records.todos).toEqual([
      { date: '2025-01-01', content: 'Buy milk', completed: true, scheduledTime: '9:00 AM' },
    ]);
    expect(result.records.stickyNotes).toEqual([{ date: '2025-01-01', content: 'Call Alex' }]);
  });

  it('returns validation errors for invalid JSON schemaVersion', async () => {
    mockReadTextFile.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        entries: [],
        todos: [],
        stickyNotes: [],
      })
    );

    const result = await parseJsonBundle('/tmp/import.json');

    expect(result.errors).toContain('schemaVersion must be 1');
  });

  it('fails CSV parsing when required headers are missing', async () => {
    mockReadDir.mockResolvedValue([{ name: 'entries.csv', path: '/tmp/entries.csv' }]);
    mockReadTextFile.mockResolvedValue('date\n2025-01-01');

    const result = await parseCsvFolder('/tmp');

    expect(result.errors).toContain('entries.csv: missing required header(s): content');
  });

  it('parses CSV quoted multiline content', async () => {
    mockReadDir.mockResolvedValue([{ name: 'entries.csv', path: '/tmp/entries.csv' }]);
    mockReadTextFile.mockResolvedValue(
      'date,content\n2025-01-01,"Line 1\nLine 2"'
    );

    const result = await parseCsvFolder('/tmp');

    expect(result.errors).toEqual([]);
    expect(result.records.entries).toHaveLength(1);
    expect(result.records.entries[0]).toEqual({
      date: '2025-01-01',
      content: 'Line 1\nLine 2',
    });
  });
});
