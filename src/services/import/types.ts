export type ImportFormat = 'json_bundle' | 'csv_folder';

export interface ImportSourceSelection {
  format: ImportFormat;
  path: string;
  content?: string;
}

export interface ImportEntryRecord {
  date: string;
  content: string;
}

export interface ImportTodoRecord {
  date: string;
  content: string;
  completed: boolean;
  scheduledTime: string | null;
}

export interface ImportStickyNoteRecord {
  date: string;
  content: string;
}

export interface CanonicalImportRecords {
  entries: ImportEntryRecord[];
  todos: ImportTodoRecord[];
  stickyNotes: ImportStickyNoteRecord[];
}

export interface ParsedImportData {
  format: ImportFormat;
  records: CanonicalImportRecords;
  errors: string[];
  warnings: string[];
}

export interface ImportPlan {
  source: ImportSourceSelection;
  records: CanonicalImportRecords;
}

export interface ImportPreview {
  format: ImportFormat;
  totals: {
    entriesToCreate: number;
    entriesToAppend: number;
    todosToCreate: number;
    stickyNotesToCreate: number;
    duplicatesSkipped: number;
  };
  errors: string[];
  warnings: string[];
  plan: ImportPlan;
}

export interface ImportExecutionResult {
  entriesCreated: number;
  entriesAppended: number;
  todosCreated: number;
  stickyNotesCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}
