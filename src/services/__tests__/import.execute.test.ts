import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockExecute = vi.fn();
const mockUpdateEntry = vi.fn();

vi.mock('../../lib/db', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
  execute: (...args: unknown[]) => mockExecute(...args),
}));

vi.mock('../entries', () => ({
  updateEntry: (...args: unknown[]) => mockUpdateEntry(...args),
}));

import { executeImportPlan } from '../import';
import { buildImportMarker, generateImportContentHash } from '../import/normalize';
import type { ImportPreview } from '../import/types';

interface DbEntry {
  id: string;
  date: string;
  content: string;
}

interface DbTodo {
  id: string;
  date: string;
  content: string;
  scheduled_time: string | null;
  completed: number;
  position: number;
}

interface DbStickyNote {
  id: string;
  date: string;
  content: string;
}

let dbEntries: DbEntry[] = [];
let dbTodos: DbTodo[] = [];
let dbStickyNotes: DbStickyNote[] = [];
let failOnTodoInsert = false;

function makePreview(partial: Partial<ImportPreview['plan']['records']>): ImportPreview {
  return {
    format: 'json_bundle',
    totals: {
      entriesToCreate: 0,
      entriesToAppend: 0,
      todosToCreate: 0,
      stickyNotesToCreate: 0,
      duplicatesSkipped: 0,
    },
    errors: [],
    warnings: [],
    plan: {
      source: { format: 'json_bundle', path: '/tmp/data.json' },
      records: {
        entries: partial.entries ?? [],
        todos: partial.todos ?? [],
        stickyNotes: partial.stickyNotes ?? [],
      },
    },
  };
}

describe('Import Execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbEntries = [];
    dbTodos = [];
    dbStickyNotes = [];
    failOnTodoInsert = false;

    mockSelect.mockImplementation((query: string) => {
      if (query.includes('SELECT id, date, content FROM entries')) {
        return Promise.resolve(dbEntries.map((entry) => ({ ...entry })));
      }

      if (query.includes('SELECT date, content, completed, scheduled_time FROM todos')) {
        return Promise.resolve(dbTodos.map((todo) => ({
          date: todo.date,
          content: todo.content,
          completed: todo.completed,
          scheduled_time: todo.scheduled_time,
        })));
      }

      if (query.includes('SELECT date, content FROM sticky_notes')) {
        return Promise.resolve(dbStickyNotes.map((note) => ({ ...note })));
      }

      if (query.includes('SELECT date, MAX(position) as max_position FROM todos GROUP BY date')) {
        const maxByDate = new Map<string, number>();
        for (const todo of dbTodos) {
          maxByDate.set(todo.date, Math.max(maxByDate.get(todo.date) ?? -1, todo.position));
        }

        return Promise.resolve(
          Array.from(maxByDate.entries()).map(([date, max_position]) => ({ date, max_position }))
        );
      }

      return Promise.resolve([]);
    });

    mockExecute.mockImplementation((query: string, values: unknown[] = []) => {
      if (query === 'BEGIN IMMEDIATE' || query === 'COMMIT' || query === 'ROLLBACK') {
        return Promise.resolve({ rowsAffected: 0 });
      }

      if (query.includes('INSERT INTO entries')) {
        const [id, date, content] = values as [string, string, string];
        dbEntries.push({ id, date, content });
        return Promise.resolve({ rowsAffected: 1 });
      }

      if (query.includes('INSERT INTO todos')) {
        if (failOnTodoInsert) {
          return Promise.reject(new Error('forced todo insert failure'));
        }

        const [id, date, content, scheduled_time, completed, position] = values as [
          string,
          string,
          string,
          string | null,
          number,
          number,
        ];
        dbTodos.push({ id, date, content, scheduled_time, completed, position });
        return Promise.resolve({ rowsAffected: 1 });
      }

      if (query.includes('INSERT INTO sticky_notes')) {
        const [id, date, content] = values as [string, string, string];
        dbStickyNotes.push({ id, date, content });
        return Promise.resolve({ rowsAffected: 1 });
      }

      return Promise.resolve({ rowsAffected: 0 });
    });

    mockUpdateEntry.mockImplementation((id: string, updates: { content?: string }) => {
      const target = dbEntries.find((entry) => entry.id === id);
      if (!target || updates.content === undefined) {
        return Promise.resolve(null);
      }

      target.content = updates.content;
      return Promise.resolve({ id: target.id, date: target.date, content: target.content, preview: target.content });
    });
  });

  it('is idempotent across repeated imports', async () => {
    dbEntries.push({ id: 'entry-1', date: '2025-01-01', content: 'Existing day' });

    const preview = makePreview({
      entries: [{ date: '2025-01-01', content: 'Imported block' }],
      todos: [{ date: '2025-01-01', content: 'Task A', completed: false, scheduledTime: null }],
      stickyNotes: [{ date: '2025-01-01', content: 'Note A' }],
    });

    const firstRun = await executeImportPlan(preview);
    const secondRun = await executeImportPlan(preview);

    expect(firstRun.entriesAppended).toBe(1);
    expect(firstRun.todosCreated).toBe(1);
    expect(firstRun.stickyNotesCreated).toBe(1);

    expect(secondRun.entriesAppended).toBe(0);
    expect(secondRun.todosCreated).toBe(0);
    expect(secondRun.stickyNotesCreated).toBe(0);
    expect(secondRun.duplicatesSkipped).toBeGreaterThanOrEqual(3);

    expect(dbTodos).toHaveLength(1);
    expect(dbStickyNotes).toHaveLength(1);
  });

  it('skips entry append when marker already exists', async () => {
    const importedContent = 'Imported block';
    const hash = generateImportContentHash(importedContent);

    dbEntries.push({
      id: 'entry-1',
      date: '2025-01-01',
      content: `Existing day\n\n---\n\n${buildImportMarker(hash)}\n${importedContent}`,
    });

    const preview = makePreview({
      entries: [{ date: '2025-01-01', content: importedContent }],
    });

    const result = await executeImportPlan(preview);

    expect(result.entriesAppended).toBe(0);
    expect(result.duplicatesSkipped).toBe(1);
  });

  it('assigns increasing todo positions for imported todos', async () => {
    dbTodos.push(
      {
        id: 'todo-1',
        date: '2025-01-10',
        content: 'Existing 1',
        scheduled_time: null,
        completed: 0,
        position: 0,
      },
      {
        id: 'todo-2',
        date: '2025-01-10',
        content: 'Existing 2',
        scheduled_time: null,
        completed: 0,
        position: 1,
      }
    );

    const preview = makePreview({
      todos: [
        { date: '2025-01-10', content: 'Imported 1', completed: false, scheduledTime: null },
        { date: '2025-01-10', content: 'Imported 2', completed: false, scheduledTime: null },
      ],
    });

    const result = await executeImportPlan(preview);

    expect(result.todosCreated).toBe(2);

    const imported = dbTodos.filter((todo) => todo.content.startsWith('Imported'));
    expect(imported.map((todo) => todo.position)).toEqual([2, 3]);
  });

  it('rolls back on execution failure', async () => {
    failOnTodoInsert = true;

    const preview = makePreview({
      todos: [{ date: '2025-01-01', content: 'Will fail', completed: false, scheduledTime: null }],
    });

    const result = await executeImportPlan(preview);

    expect(result.errors.length).toBe(1);
    expect(result.entriesCreated).toBe(0);
    expect(result.entriesAppended).toBe(0);
    expect(result.todosCreated).toBe(0);
    expect(result.stickyNotesCreated).toBe(0);

    expect(mockExecute).toHaveBeenCalledWith('ROLLBACK');
    expect(dbTodos).toHaveLength(0);
  });
});
