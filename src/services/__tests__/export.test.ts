import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockWriteTextFile = vi.fn();
const mockMkdir = vi.fn();
const mockOpen = vi.fn();
const mockSave = vi.fn();

vi.mock('../../lib/db', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => mockOpen(...args),
  save: (...args: unknown[]) => mockSave(...args),
}));

import { exportData, selectExportDestination } from '../export';

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSelect.mockImplementation((query: string) => {
      if (query.includes('FROM entries')) {
        return Promise.resolve([{ date: '2025-01-01', content: 'Entry one' }]);
      }

      if (query.includes('FROM todos')) {
        return Promise.resolve([
          {
            date: '2025-01-01',
            content: 'Todo one',
            scheduled_time: '08:00',
            completed: 1,
          },
        ]);
      }

      if (query.includes('FROM sticky_notes')) {
        return Promise.resolve([{ date: '2025-01-01', content: 'Sticky one' }]);
      }

      return Promise.resolve([]);
    });

    mockWriteTextFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockSave.mockResolvedValue('/tmp/export.json');
    mockOpen.mockResolvedValue('/tmp/export-folder');
  });

  it('exports JSON bundle with schemaVersion and data', async () => {
    const result = await exportData({
      format: 'json_bundle',
      destinationPath: '/tmp/journai-export',
    });

    expect(result.errors).toEqual([]);
    expect(result.entriesExported).toBe(1);
    expect(result.todosExported).toBe(1);
    expect(result.stickyNotesExported).toBe(1);
    expect(result.files).toEqual(['/tmp/journai-export.json']);

    expect(mockWriteTextFile).toHaveBeenCalledTimes(1);
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      '/tmp/journai-export.json',
      expect.stringContaining('"schemaVersion": 1')
    );
  });

  it('exports CSV files for entries, todos, and sticky notes', async () => {
    const result = await exportData({
      format: 'csv_folder',
      destinationPath: '/tmp/export-folder',
    });

    expect(result.errors).toEqual([]);
    expect(result.files).toEqual([
      '/tmp/export-folder/entries.csv',
      '/tmp/export-folder/todos.csv',
      '/tmp/export-folder/sticky_notes.csv',
    ]);

    expect(mockMkdir).toHaveBeenCalledWith('/tmp/export-folder', { recursive: true });
    expect(mockWriteTextFile).toHaveBeenCalledTimes(3);

    const todosCall = mockWriteTextFile.mock.calls.find((call) => call[0] === '/tmp/export-folder/todos.csv');
    expect(todosCall?.[1]).toContain('date,content,completed,scheduled_time');
    expect(todosCall?.[1]).toContain('2025-01-01,Todo one,true,08:00');
  });

  it('selects destination using save for JSON and open for CSV folders', async () => {
    const jsonDestination = await selectExportDestination('json_bundle');
    const csvDestination = await selectExportDestination('csv_folder');

    expect(jsonDestination).toBe('/tmp/export.json');
    expect(csvDestination).toBe('/tmp/export-folder');

    expect(mockSave).toHaveBeenCalledOnce();
    expect(mockOpen).toHaveBeenCalledOnce();
  });

  it('filters out empty sticky notes from export payloads', async () => {
    mockSelect.mockImplementation((query: string) => {
      if (query.includes('FROM entries')) {
        return Promise.resolve([{ date: '2025-01-01', content: 'Entry one' }]);
      }

      if (query.includes('FROM todos')) {
        return Promise.resolve([]);
      }

      if (query.includes('FROM sticky_notes')) {
        return Promise.resolve([
          { date: '2025-01-01', content: 'Valid note' },
        ]);
      }

      return Promise.resolve([]);
    });

    await exportData({
      format: 'json_bundle',
      destinationPath: '/tmp/journai-export',
    });

    expect(mockSelect).toHaveBeenCalledWith(
      "SELECT date, content FROM sticky_notes WHERE TRIM(content) != '' ORDER BY date ASC, created_at ASC"
    );

    const writtenJson = mockWriteTextFile.mock.calls[0][1];
    const payload = JSON.parse(writtenJson);

    expect(payload.stickyNotes).toEqual([{ date: '2025-01-01', content: 'Valid note' }]);
  });
});
