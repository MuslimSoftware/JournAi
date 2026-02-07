import { readTextFile } from '@tauri-apps/plugin-fs';
import {
  isValidDateString,
  normalizeContent,
  normalizeDate,
  normalizeScheduledTime,
  parseCompletedValue,
} from '../normalize';
import type {
  ImportEntryRecord,
  ImportStickyNoteRecord,
  ImportTodoRecord,
  ParsedImportData,
} from '../types';

const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'entries', 'todos', 'stickyNotes']);
const ENTRY_KEYS = new Set(['date', 'content']);
const TODO_KEYS = new Set(['date', 'content', 'completed', 'scheduledTime']);
const STICKY_NOTE_KEYS = new Set(['date', 'content']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateDateAndContent(
  source: string,
  dateValue: unknown,
  contentValue: unknown,
  errors: string[]
): { date: string; content: string } | null {
  const date = normalizeDate(String(dateValue ?? ''));
  if (!isValidDateString(date)) {
    errors.push(`${source}: invalid date \"${String(dateValue ?? '')}\" (expected YYYY-MM-DD)`);
    return null;
  }

  if (typeof contentValue !== 'string') {
    errors.push(`${source}: content must be a string`);
    return null;
  }

  const content = normalizeContent(contentValue);
  if (!content) {
    errors.push(`${source}: content cannot be empty`);
    return null;
  }

  return { date, content };
}

function warnUnknownKeys(
  source: string,
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  warnings: string[]
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      warnings.push(`${source}: unknown field \"${key}\" ignored`);
    }
  }
}

function parseEntries(rawEntries: unknown, errors: string[], warnings: string[]): ImportEntryRecord[] {
  if (rawEntries === undefined) return [];
  if (!Array.isArray(rawEntries)) {
    errors.push('entries must be an array');
    return [];
  }

  const entries: ImportEntryRecord[] = [];

  rawEntries.forEach((entry, index) => {
    const source = `entries[${index}]`;

    if (!isRecord(entry)) {
      errors.push(`${source}: must be an object`);
      return;
    }

    warnUnknownKeys(source, entry, ENTRY_KEYS, warnings);

    const validated = validateDateAndContent(source, entry.date, entry.content, errors);
    if (!validated) return;

    entries.push(validated);
  });

  return entries;
}

function parseTodos(rawTodos: unknown, errors: string[], warnings: string[]): ImportTodoRecord[] {
  if (rawTodos === undefined) return [];
  if (!Array.isArray(rawTodos)) {
    errors.push('todos must be an array');
    return [];
  }

  const todos: ImportTodoRecord[] = [];

  rawTodos.forEach((todo, index) => {
    const source = `todos[${index}]`;

    if (!isRecord(todo)) {
      errors.push(`${source}: must be an object`);
      return;
    }

    warnUnknownKeys(source, todo, TODO_KEYS, warnings);

    const validated = validateDateAndContent(source, todo.date, todo.content, errors);
    if (!validated) return;

    let completed = false;
    if (todo.completed !== undefined) {
      const parsedCompleted = parseCompletedValue(todo.completed);
      if (parsedCompleted === null) {
        errors.push(`${source}: completed must be one of true/false/1/0/yes/no/x`);
        return;
      }
      completed = parsedCompleted;
    }

    let scheduledTime: string | null = null;
    if (todo.scheduledTime !== undefined) {
      if (todo.scheduledTime !== null && typeof todo.scheduledTime !== 'string') {
        errors.push(`${source}: scheduledTime must be a string or null`);
        return;
      }
      scheduledTime = normalizeScheduledTime(todo.scheduledTime as string | null);
    }

    todos.push({
      date: validated.date,
      content: validated.content,
      completed,
      scheduledTime,
    });
  });

  return todos;
}

function parseStickyNotes(rawNotes: unknown, errors: string[], warnings: string[]): ImportStickyNoteRecord[] {
  if (rawNotes === undefined) return [];
  if (!Array.isArray(rawNotes)) {
    errors.push('stickyNotes must be an array');
    return [];
  }

  const stickyNotes: ImportStickyNoteRecord[] = [];

  rawNotes.forEach((note, index) => {
    const source = `stickyNotes[${index}]`;

    if (!isRecord(note)) {
      errors.push(`${source}: must be an object`);
      return;
    }

    warnUnknownKeys(source, note, STICKY_NOTE_KEYS, warnings);

    const validated = validateDateAndContent(source, note.date, note.content, errors);
    if (!validated) return;

    stickyNotes.push(validated);
  });

  return stickyNotes;
}

export async function parseJsonBundle(filePath: string, preloadedContent?: string): Promise<ParsedImportData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsedJson: unknown;

  try {
    const content = preloadedContent ?? await readTextFile(filePath);
    parsedJson = JSON.parse(content);
  } catch (error) {
    errors.push(`Unable to read or parse JSON file: ${String(error)}`);
    return {
      format: 'json_bundle',
      records: { entries: [], todos: [], stickyNotes: [] },
      errors,
      warnings,
    };
  }

  if (!isRecord(parsedJson)) {
    errors.push('JSON bundle root must be an object');
    return {
      format: 'json_bundle',
      records: { entries: [], todos: [], stickyNotes: [] },
      errors,
      warnings,
    };
  }

  for (const key of Object.keys(parsedJson)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      warnings.push(`Unknown top-level field \"${key}\" ignored`);
    }
  }

  if (parsedJson.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }

  const entries = parseEntries(parsedJson.entries, errors, warnings);
  const todos = parseTodos(parsedJson.todos, errors, warnings);
  const stickyNotes = parseStickyNotes(parsedJson.stickyNotes, errors, warnings);

  return {
    format: 'json_bundle',
    records: { entries, todos, stickyNotes },
    errors,
    warnings,
  };
}
