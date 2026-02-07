import { select } from '../../lib/db';
import {
  appendImportedContent,
  buildStickyNoteDedupeKey,
  buildTodoDedupeKey,
  extractImportMarkers,
  generateImportContentHash,
  normalizeContent,
} from './normalize';
import { parseCsvFolder } from './parsers/csvFolder';
import { parseJsonBundle } from './parsers/jsonBundle';
import type {
  ImportPreview,
  ImportSourceSelection,
  ImportStickyNoteRecord,
  ImportTodoRecord,
  ParsedImportData,
} from './types';

interface ExistingEntryRow {
  id: string;
  date: string;
  content: string;
}

interface ExistingTodoRow {
  date: string;
  content: string;
  completed: number;
  scheduled_time: string | null;
}

interface ExistingStickyNoteRow {
  date: string;
  content: string;
}

interface ExistingEntryState {
  content: string;
  markers: Set<string>;
}

interface ExistingDatabaseState {
  entriesByDate: Map<string, ExistingEntryState>;
  todoKeySet: Set<string>;
  stickyNoteKeySet: Set<string>;
}

async function parseImportSource(source: ImportSourceSelection): Promise<ParsedImportData> {
  if (source.format === 'json_bundle') {
    return parseJsonBundle(source.path, source.content);
  }

  return parseCsvFolder(source.path);
}

async function loadExistingDatabaseState(): Promise<ExistingDatabaseState> {
  const [entries, todos, stickyNotes] = await Promise.all([
    select<ExistingEntryRow>('SELECT id, date, content FROM entries'),
    select<ExistingTodoRow>('SELECT date, content, completed, scheduled_time FROM todos'),
    select<ExistingStickyNoteRow>('SELECT date, content FROM sticky_notes'),
  ]);

  const entriesByDate = new Map<string, ExistingEntryState>();
  for (const entry of entries) {
    entriesByDate.set(entry.date, {
      content: entry.content,
      markers: extractImportMarkers(entry.content),
    });
  }

  const todoKeySet = new Set<string>();
  for (const todo of todos) {
    const normalizedTodo: ImportTodoRecord = {
      date: todo.date,
      content: todo.content,
      completed: todo.completed === 1,
      scheduledTime: todo.scheduled_time,
    };
    todoKeySet.add(buildTodoDedupeKey(normalizedTodo));
  }

  const stickyNoteKeySet = new Set<string>();
  for (const note of stickyNotes) {
    const normalizedNote: ImportStickyNoteRecord = {
      date: note.date,
      content: note.content,
    };
    stickyNoteKeySet.add(buildStickyNoteDedupeKey(normalizedNote));
  }

  return {
    entriesByDate,
    todoKeySet,
    stickyNoteKeySet,
  };
}

export async function buildImportPreview(
  source: ImportSourceSelection,
  onProgress?: (current: number, total: number) => void
): Promise<ImportPreview> {
  const parsed = await parseImportSource(source);

  const totals = {
    entriesToCreate: 0,
    entriesToAppend: 0,
    todosToCreate: 0,
    stickyNotesToCreate: 0,
    duplicatesSkipped: 0,
  };

  const state = await loadExistingDatabaseState();
  const totalItems = parsed.records.entries.length + parsed.records.todos.length + parsed.records.stickyNotes.length;
  let currentProgress = 0;
  onProgress?.(currentProgress, totalItems);

  for (const entry of parsed.records.entries) {
    const current = state.entriesByDate.get(entry.date);

    if (!current) {
      state.entriesByDate.set(entry.date, {
        content: entry.content,
        markers: new Set<string>(),
      });
      totals.entriesToCreate += 1;
      currentProgress += 1;
      onProgress?.(currentProgress, totalItems);
      continue;
    }

    const normalizedExisting = normalizeContent(current.content);
    if (normalizedExisting === entry.content) {
      totals.duplicatesSkipped += 1;
      currentProgress += 1;
      onProgress?.(currentProgress, totalItems);
      continue;
    }

    const contentHash = generateImportContentHash(entry.content);
    if (current.markers.has(contentHash)) {
      totals.duplicatesSkipped += 1;
      currentProgress += 1;
      onProgress?.(currentProgress, totalItems);
      continue;
    }

    current.content = appendImportedContent(current.content, entry.content, contentHash);
    current.markers.add(contentHash);
    totals.entriesToAppend += 1;

    currentProgress += 1;
    onProgress?.(currentProgress, totalItems);
  }

  for (const todo of parsed.records.todos) {
    const dedupeKey = buildTodoDedupeKey(todo);
    if (state.todoKeySet.has(dedupeKey)) {
      totals.duplicatesSkipped += 1;
    } else {
      state.todoKeySet.add(dedupeKey);
      totals.todosToCreate += 1;
    }

    currentProgress += 1;
    onProgress?.(currentProgress, totalItems);
  }

  for (const note of parsed.records.stickyNotes) {
    const dedupeKey = buildStickyNoteDedupeKey(note);
    if (state.stickyNoteKeySet.has(dedupeKey)) {
      totals.duplicatesSkipped += 1;
    } else {
      state.stickyNoteKeySet.add(dedupeKey);
      totals.stickyNotesToCreate += 1;
    }

    currentProgress += 1;
    onProgress?.(currentProgress, totalItems);
  }

  return {
    format: source.format,
    totals,
    errors: parsed.errors,
    warnings: parsed.warnings,
    plan: {
      source,
      records: parsed.records,
    },
  };
}
