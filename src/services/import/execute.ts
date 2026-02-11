import { select, executeBatch, type DbStatement } from '../../lib/db';
import { getTimestamp } from '../../utils/date';
import { generateId } from '../../utils/generators';
import {
  appendImportedContent,
  buildStickyNoteDedupeKey,
  buildTodoDedupeKey,
  extractImportMarkers,
  generateImportContentHash,
  normalizeContent,
} from './normalize';
import type {
  ImportExecutionResult,
  ImportPreview,
  ImportStickyNoteRecord,
  ImportTodoRecord,
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

interface ExistingTodoPositionRow {
  date: string;
  max_position: number | null;
}

interface ExistingEntryState {
  id: string;
  content: string;
  markers: Set<string>;
}

interface RuntimeState {
  entriesByDate: Map<string, ExistingEntryState>;
  todoKeySet: Set<string>;
  stickyNoteKeySet: Set<string>;
  todoMaxPositionByDate: Map<string, number>;
}

async function loadRuntimeState(): Promise<RuntimeState> {
  const [entries, todos, stickyNotes, todoPositions] = await Promise.all([
    select<ExistingEntryRow>('SELECT id, date, content FROM entries'),
    select<ExistingTodoRow>('SELECT date, content, completed, scheduled_time FROM todos'),
    select<ExistingStickyNoteRow>('SELECT date, content FROM sticky_notes'),
    select<ExistingTodoPositionRow>('SELECT date, MAX(position) as max_position FROM todos GROUP BY date'),
  ]);

  const entriesByDate = new Map<string, ExistingEntryState>();
  for (const entry of entries) {
    entriesByDate.set(entry.date, {
      id: entry.id,
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

  const todoMaxPositionByDate = new Map<string, number>();
  for (const positionRow of todoPositions) {
    todoMaxPositionByDate.set(positionRow.date, positionRow.max_position ?? -1);
  }

  return {
    entriesByDate,
    todoKeySet,
    stickyNoteKeySet,
    todoMaxPositionByDate,
  };
}

const WRITE_CHUNK_SIZE = 50;
const PROCESSING_YIELD_INTERVAL = 250;

function shouldYieldToEventLoop(processedItems: number): boolean {
  return processedItems > 0 && processedItems % PROCESSING_YIELD_INTERVAL === 0;
}

async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function executeImportPlan(
  preview: ImportPreview,
  onProgress?: (current: number, total: number, phase?: 'processing' | 'writing') => void
): Promise<ImportExecutionResult> {
  if (preview.errors.length > 0) {
    return {
      entriesCreated: 0,
      entriesAppended: 0,
      todosCreated: 0,
      stickyNotesCreated: 0,
      duplicatesSkipped: 0,
      errors: ['Cannot execute import while preview has validation errors'],
    };
  }

  const totalItems = preview.plan.records.entries.length
    + preview.plan.records.todos.length
    + preview.plan.records.stickyNotes.length;
  let currentProgress = 0;
  onProgress?.(currentProgress, totalItems, 'processing');

  const reportProcessingProgress = async (): Promise<void> => {
    currentProgress += 1;
    onProgress?.(currentProgress, totalItems, 'processing');

    if (shouldYieldToEventLoop(currentProgress)) {
      await yieldToEventLoop();
    }
  };

  const result: ImportExecutionResult = {
    entriesCreated: 0,
    entriesAppended: 0,
    todosCreated: 0,
    stickyNotesCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  try {
    const state = await loadRuntimeState();
    const writeStatements: DbStatement[] = [];

    for (const entry of preview.plan.records.entries) {
      const current = state.entriesByDate.get(entry.date);

      if (!current) {
        const id = generateId();
        const timestamp = getTimestamp();
        writeStatements.push({
          query: 'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          values: [id, entry.date, entry.content, timestamp, timestamp],
        });

        state.entriesByDate.set(entry.date, {
          id,
          content: entry.content,
          markers: new Set<string>(),
        });
        result.entriesCreated += 1;
        await reportProcessingProgress();
        continue;
      }

      const normalizedExisting = normalizeContent(current.content);
      if (normalizedExisting === entry.content) {
        result.duplicatesSkipped += 1;
        await reportProcessingProgress();
        continue;
      }

      const contentHash = generateImportContentHash(entry.content);
      if (current.markers.has(contentHash)) {
        result.duplicatesSkipped += 1;
        await reportProcessingProgress();
        continue;
      }

      const updatedContent = appendImportedContent(current.content, entry.content, contentHash);
      const timestamp = getTimestamp();
      writeStatements.push({
        query: 'UPDATE entries SET content = $1, updated_at = $2, last_content_update = $2, processed_at = NULL WHERE id = $3',
        values: [updatedContent, timestamp, current.id],
      });

      current.content = updatedContent;
      current.markers.add(contentHash);
      result.entriesAppended += 1;
      await reportProcessingProgress();
    }

    for (const todo of preview.plan.records.todos) {
      const dedupeKey = buildTodoDedupeKey(todo);
      if (state.todoKeySet.has(dedupeKey)) {
        result.duplicatesSkipped += 1;
        await reportProcessingProgress();
        continue;
      }

      const nextPosition = (state.todoMaxPositionByDate.get(todo.date) ?? -1) + 1;
      state.todoMaxPositionByDate.set(todo.date, nextPosition);
      state.todoKeySet.add(dedupeKey);

      const id = generateId();
      const timestamp = getTimestamp();
      writeStatements.push({
        query: 'INSERT INTO todos (id, date, content, scheduled_time, completed, position, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        values: [
          id,
          todo.date,
          todo.content,
          todo.scheduledTime,
          todo.completed ? 1 : 0,
          nextPosition,
          timestamp,
          timestamp,
        ],
      });

      result.todosCreated += 1;
      await reportProcessingProgress();
    }

    for (const note of preview.plan.records.stickyNotes) {
      const dedupeKey = buildStickyNoteDedupeKey(note);
      if (state.stickyNoteKeySet.has(dedupeKey)) {
        result.duplicatesSkipped += 1;
        await reportProcessingProgress();
        continue;
      }

      state.stickyNoteKeySet.add(dedupeKey);

      const id = generateId();
      const timestamp = getTimestamp();
      writeStatements.push({
        query: 'INSERT INTO sticky_notes (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        values: [id, note.date, note.content, timestamp, timestamp],
      });

      result.stickyNotesCreated += 1;
      await reportProcessingProgress();
    }

    const writeChunks: DbStatement[][] = [];
    for (let i = 0; i < writeStatements.length; i += WRITE_CHUNK_SIZE) {
      writeChunks.push(writeStatements.slice(i, i + WRITE_CHUNK_SIZE));
    }

    const grandTotal = writeChunks.length > 0 ? totalItems + writeChunks.length : totalItems;

    if (writeChunks.length > 0) {
      onProgress?.(totalItems, grandTotal, 'writing');
    }

    for (let i = 0; i < writeChunks.length; i++) {
      await executeBatch(writeChunks[i]);
      onProgress?.(totalItems + i + 1, grandTotal, 'writing');
    }

    return result;
  } catch (error) {
    return {
      ...result,
      entriesCreated: 0,
      entriesAppended: 0,
      todosCreated: 0,
      stickyNotesCreated: 0,
      errors: [`Import failed: ${String(error)}`],
    };
  }
}
