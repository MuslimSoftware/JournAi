export interface JournalEntry {
  id: string;
  date: string;
  preview: string;
  content: string;
}

export interface EntryUpdate {
  content?: string;
  date?: string;
}
