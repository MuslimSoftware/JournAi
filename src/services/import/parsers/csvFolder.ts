import Papa from 'papaparse';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
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

interface FsEntry {
  name?: string;
  path?: string;
}

interface ParsedCsvFile {
  rows: Array<Record<string, unknown>>;
  headers: string[];
}

const SUPPORTED_CSV_FILES = ['entries.csv', 'todos.csv', 'sticky_notes.csv'] as const;

function resolveEntryPath(folderPath: string, entry: FsEntry): string {
  if (entry.path) return entry.path;
  const normalizedFolder = folderPath.replace(/[\\/]+$/, '');
  return `${normalizedFolder}/${entry.name ?? ''}`;
}

function parseCsv(content: string, filename: string, errors: string[]): ParsedCsvFile {
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    for (const parseError of parsed.errors) {
      const row = typeof parseError.row === 'number' ? parseError.row + 2 : 'unknown';
      errors.push(`${filename}: CSV parse error at row ${row} (${parseError.message})`);
    }
  }

  const headers = (parsed.meta.fields ?? []).map((header) => header.trim().toLowerCase());

  return {
    rows: parsed.data,
    headers,
  };
}

function warnExtraHeaders(
  filename: string,
  headers: string[],
  allowedHeaders: Set<string>,
  warnings: string[]
): void {
  for (const header of headers) {
    if (!allowedHeaders.has(header)) {
      warnings.push(`${filename}: extra column \"${header}\" ignored`);
    }
  }
}

function validateRequiredHeaders(
  filename: string,
  headers: string[],
  requiredHeaders: string[],
  errors: string[]
): boolean {
  const headerSet = new Set(headers);
  const missing = requiredHeaders.filter((header) => !headerSet.has(header));
  if (missing.length > 0) {
    errors.push(`${filename}: missing required header(s): ${missing.join(', ')}`);
    return false;
  }
  return true;
}

function parseEntriesRows(
  rows: Array<Record<string, unknown>>,
  filename: string,
  errors: string[]
): ImportEntryRecord[] {
  const entries: ImportEntryRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const date = normalizeDate(String(row.date ?? ''));

    if (!isValidDateString(date)) {
      errors.push(`${filename}: row ${rowNumber} has invalid date \"${String(row.date ?? '')}\"`);
      return;
    }

    const content = normalizeContent(String(row.content ?? ''));
    if (!content) {
      errors.push(`${filename}: row ${rowNumber} has empty content`);
      return;
    }

    entries.push({ date, content });
  });

  return entries;
}

function parseTodosRows(
  rows: Array<Record<string, unknown>>,
  filename: string,
  errors: string[]
): ImportTodoRecord[] {
  const todos: ImportTodoRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const date = normalizeDate(String(row.date ?? ''));

    if (!isValidDateString(date)) {
      errors.push(`${filename}: row ${rowNumber} has invalid date \"${String(row.date ?? '')}\"`);
      return;
    }

    const content = normalizeContent(String(row.content ?? ''));
    if (!content) {
      errors.push(`${filename}: row ${rowNumber} has empty content`);
      return;
    }

    const completed = parseCompletedValue(row.completed);
    if (completed === null) {
      errors.push(`${filename}: row ${rowNumber} has invalid completed value \"${String(row.completed ?? '')}\"`);
      return;
    }

    const scheduledTime = normalizeScheduledTime(String(row.scheduled_time ?? ''));

    todos.push({
      date,
      content,
      completed,
      scheduledTime,
    });
  });

  return todos;
}

function parseStickyNoteRows(
  rows: Array<Record<string, unknown>>,
  filename: string,
  errors: string[]
): ImportStickyNoteRecord[] {
  const stickyNotes: ImportStickyNoteRecord[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const date = normalizeDate(String(row.date ?? ''));

    if (!isValidDateString(date)) {
      errors.push(`${filename}: row ${rowNumber} has invalid date \"${String(row.date ?? '')}\"`);
      return;
    }

    const content = normalizeContent(String(row.content ?? ''));
    if (!content) {
      errors.push(`${filename}: row ${rowNumber} has empty content`);
      return;
    }

    stickyNotes.push({ date, content });
  });

  return stickyNotes;
}

export async function parseCsvFolder(folderPath: string): Promise<ParsedImportData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const entries: ImportEntryRecord[] = [];
  const todos: ImportTodoRecord[] = [];
  const stickyNotes: ImportStickyNoteRecord[] = [];

  let dirEntries: FsEntry[] = [];

  try {
    dirEntries = await readDir(folderPath) as FsEntry[];
  } catch (error) {
    errors.push(`Unable to read folder: ${String(error)}`);
    return {
      format: 'csv_folder',
      records: { entries, todos, stickyNotes },
      errors,
      warnings,
    };
  }

  const csvEntries = dirEntries.filter((entry) => {
    const name = entry.name?.toLowerCase();
    return Boolean(name && name.endsWith('.csv'));
  });

  const entryByFileName = new Map<string, FsEntry>();
  for (const csvEntry of csvEntries) {
    const lowerName = csvEntry.name!.toLowerCase();
    if (!entryByFileName.has(lowerName)) {
      entryByFileName.set(lowerName, csvEntry);
    } else {
      warnings.push(`${csvEntry.name}: duplicate CSV filename ignored`);
    }
  }

  const supportedFileSet = new Set<string>(SUPPORTED_CSV_FILES);
  for (const csvEntry of csvEntries) {
    const lowerName = csvEntry.name!.toLowerCase();
    if (!supportedFileSet.has(lowerName)) {
      warnings.push(`${csvEntry.name}: unsupported CSV file ignored`);
    }
  }

  const foundSupportedFiles = SUPPORTED_CSV_FILES.filter((fileName) => entryByFileName.has(fileName));
  if (foundSupportedFiles.length === 0) {
    errors.push('No supported CSV files found. Expected at least one of: entries.csv, todos.csv, sticky_notes.csv');
    return {
      format: 'csv_folder',
      records: { entries, todos, stickyNotes },
      errors,
      warnings,
    };
  }

  if (entryByFileName.has('entries.csv')) {
    const csvEntry = entryByFileName.get('entries.csv')!;
    const filename = csvEntry.name ?? 'entries.csv';

    try {
      const content = await readTextFile(resolveEntryPath(folderPath, csvEntry));
      const parsed = parseCsv(content, filename, errors);

      const requiredHeaders = ['date', 'content'];
      const allowedHeaders = new Set(requiredHeaders);
      if (validateRequiredHeaders(filename, parsed.headers, requiredHeaders, errors)) {
        warnExtraHeaders(filename, parsed.headers, allowedHeaders, warnings);
        entries.push(...parseEntriesRows(parsed.rows, filename, errors));
      }
    } catch (error) {
      errors.push(`${filename}: failed to read file (${String(error)})`);
    }
  }

  if (entryByFileName.has('todos.csv')) {
    const csvEntry = entryByFileName.get('todos.csv')!;
    const filename = csvEntry.name ?? 'todos.csv';

    try {
      const content = await readTextFile(resolveEntryPath(folderPath, csvEntry));
      const parsed = parseCsv(content, filename, errors);

      const requiredHeaders = ['date', 'content', 'completed', 'scheduled_time'];
      const allowedHeaders = new Set(requiredHeaders);
      if (validateRequiredHeaders(filename, parsed.headers, requiredHeaders, errors)) {
        warnExtraHeaders(filename, parsed.headers, allowedHeaders, warnings);
        todos.push(...parseTodosRows(parsed.rows, filename, errors));
      }
    } catch (error) {
      errors.push(`${filename}: failed to read file (${String(error)})`);
    }
  }

  if (entryByFileName.has('sticky_notes.csv')) {
    const csvEntry = entryByFileName.get('sticky_notes.csv')!;
    const filename = csvEntry.name ?? 'sticky_notes.csv';

    try {
      const content = await readTextFile(resolveEntryPath(folderPath, csvEntry));
      const parsed = parseCsv(content, filename, errors);

      const requiredHeaders = ['date', 'content'];
      const allowedHeaders = new Set(requiredHeaders);
      if (validateRequiredHeaders(filename, parsed.headers, requiredHeaders, errors)) {
        warnExtraHeaders(filename, parsed.headers, allowedHeaders, warnings);
        stickyNotes.push(...parseStickyNoteRows(parsed.rows, filename, errors));
      }
    } catch (error) {
      errors.push(`${filename}: failed to read file (${String(error)})`);
    }
  }

  return {
    format: 'csv_folder',
    records: { entries, todos, stickyNotes },
    errors,
    warnings,
  };
}
