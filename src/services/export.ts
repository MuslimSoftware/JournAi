import { open, save } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import Papa from 'papaparse';
import { select } from '../lib/db';

export type ExportFormat = 'json_bundle' | 'csv_folder';

export interface ExportRequest {
  format: ExportFormat;
  destinationPath: string;
}

export interface ExportResult {
  format: ExportFormat;
  destinationPath: string;
  entriesExported: number;
  todosExported: number;
  stickyNotesExported: number;
  files: string[];
  errors: string[];
}

interface EntryRow {
  date: string;
  content: string;
}

interface TodoRow {
  date: string;
  content: string;
  scheduled_time: string | null;
  completed: number;
}

interface StickyNoteRow {
  date: string;
  content: string;
}

interface ExportDataSet {
  entries: EntryRow[];
  todos: TodoRow[];
  stickyNotes: StickyNoteRow[];
}

function joinPath(basePath: string, fileName: string): string {
  const separator = basePath.includes('\\') ? '\\' : '/';
  const normalizedBase = basePath.replace(/[\\/]+$/, '');
  return `${normalizedBase}${separator}${fileName}`;
}

function ensureJsonExtension(path: string): string {
  if (path.toLowerCase().endsWith('.json')) {
    return path;
  }

  return `${path}.json`;
}

async function loadExportData(): Promise<ExportDataSet> {
  const [entries, todos, stickyNotes] = await Promise.all([
    select<EntryRow>('SELECT date, content FROM entries ORDER BY date ASC, created_at ASC'),
    select<TodoRow>('SELECT date, content, scheduled_time, completed FROM todos ORDER BY date ASC, position ASC'),
    select<StickyNoteRow>('SELECT date, content FROM sticky_notes ORDER BY date ASC, created_at ASC'),
  ]);

  return {
    entries,
    todos,
    stickyNotes,
  };
}

function toCsv<T extends Record<string, string>>(rows: T[], columns: string[]): string {
  return Papa.unparse(rows, {
    columns,
    header: true,
    newline: '\n',
  });
}

export async function selectExportDestination(format: ExportFormat): Promise<string | null> {
  if (format === 'json_bundle') {
    const date = new Date().toISOString().slice(0, 10);
    const selected = await save({
      title: 'Save JSON Export',
      defaultPath: `journai-export-${date}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    return typeof selected === 'string' ? selected : null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Export Folder',
  });

  return typeof selected === 'string' ? selected : null;
}

export async function exportData(
  request: ExportRequest,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult> {
  const result: ExportResult = {
    format: request.format,
    destinationPath: request.destinationPath,
    entriesExported: 0,
    todosExported: 0,
    stickyNotesExported: 0,
    files: [],
    errors: [],
  };

  try {
    const totalSteps = request.format === 'json_bundle' ? 2 : 5;
    let currentStep = 0;
    onProgress?.(currentStep, totalSteps);

    const data = await loadExportData();
    currentStep += 1;
    onProgress?.(currentStep, totalSteps);

    result.entriesExported = data.entries.length;
    result.todosExported = data.todos.length;
    result.stickyNotesExported = data.stickyNotes.length;

    if (request.format === 'json_bundle') {
      const outputPath = ensureJsonExtension(request.destinationPath);
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        entries: data.entries,
        todos: data.todos.map((todo) => ({
          date: todo.date,
          content: todo.content,
          completed: todo.completed === 1,
          scheduledTime: todo.scheduled_time,
        })),
        stickyNotes: data.stickyNotes,
      };

      await writeTextFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
      result.files.push(outputPath);

      currentStep += 1;
      onProgress?.(currentStep, totalSteps);

      return result;
    }

    await mkdir(request.destinationPath, { recursive: true });
    currentStep += 1;
    onProgress?.(currentStep, totalSteps);

    const entriesPath = joinPath(request.destinationPath, 'entries.csv');
    const todosPath = joinPath(request.destinationPath, 'todos.csv');
    const stickyNotesPath = joinPath(request.destinationPath, 'sticky_notes.csv');

    const entriesCsv = toCsv(
      data.entries.map((entry) => ({
        date: entry.date,
        content: entry.content,
      })),
      ['date', 'content']
    );
    await writeTextFile(entriesPath, entriesCsv);
    result.files.push(entriesPath);
    currentStep += 1;
    onProgress?.(currentStep, totalSteps);

    const todosCsv = toCsv(
      data.todos.map((todo) => ({
        date: todo.date,
        content: todo.content,
        completed: todo.completed === 1 ? 'true' : 'false',
        scheduled_time: todo.scheduled_time ?? '',
      })),
      ['date', 'content', 'completed', 'scheduled_time']
    );
    await writeTextFile(todosPath, todosCsv);
    result.files.push(todosPath);
    currentStep += 1;
    onProgress?.(currentStep, totalSteps);

    const stickyNotesCsv = toCsv(
      data.stickyNotes.map((note) => ({
        date: note.date,
        content: note.content,
      })),
      ['date', 'content']
    );
    await writeTextFile(stickyNotesPath, stickyNotesCsv);
    result.files.push(stickyNotesPath);
    currentStep += 1;
    onProgress?.(currentStep, totalSteps);

    return result;
  } catch (error) {
    return {
      ...result,
      files: [],
      entriesExported: 0,
      todosExported: 0,
      stickyNotesExported: 0,
      errors: [`Export failed: ${String(error)}`],
    };
  }
}
