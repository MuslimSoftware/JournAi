export interface JournalEntry {
  id: string;
  date: string;
  preview: string;
  content: string;
  processedAt?: string | null;
  contentHash?: string | null;
}

export interface EntryUpdate {
  content?: string;
  date?: string;
}
