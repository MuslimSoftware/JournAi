export interface Todo {
  id: string;
  date: string;
  content: string;
  completed: boolean;
}

export interface TodoRow {
  id: string;
  date: string;
  content: string;
  scheduled_time: string | null;
  completed: number;
  created_at: string;
  updated_at: string;
}

export interface StickyNote {
  id: string;
  date: string;
  content: string;
}

export interface StickyNoteRow {
  id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DayData {
  date: string;
  hasEntry: boolean;
  entryId: string | null;
  entryPreview: string | null;
  todos: Todo[];
  stickyNotes: StickyNote[];
}
