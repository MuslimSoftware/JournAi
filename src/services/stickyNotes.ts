import type { StickyNote, StickyNoteRow } from '../types/todo';
import { getTimestamp } from '../utils/date';
import { generateId } from '../utils/generators';
import { select, execute } from '../lib/db';

function rowToStickyNote(row: StickyNoteRow): StickyNote {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
  };
}

export async function getStickyNotesByDate(date: string): Promise<StickyNote[]> {
  const rows = await select<StickyNoteRow>(
    'SELECT * FROM sticky_notes WHERE date = $1 ORDER BY created_at ASC',
    [date]
  );
  return rows.map(rowToStickyNote);
}

export async function getStickyNotesByDateRange(startDate: string, endDate: string): Promise<StickyNote[]> {
  const rows = await select<StickyNoteRow>(
    'SELECT * FROM sticky_notes WHERE date >= $1 AND date <= $2 ORDER BY date ASC, created_at ASC',
    [startDate, endDate]
  );
  return rows.map(rowToStickyNote);
}

export async function createStickyNote(date: string, content: string = ''): Promise<StickyNote> {
  const id = generateId();
  const timestamp = getTimestamp();

  await execute(
    'INSERT INTO sticky_notes (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
    [id, date, content, timestamp, timestamp]
  );

  return { id, date, content };
}

export async function updateStickyNote(id: string, content: string): Promise<StickyNote | null> {
  const timestamp = getTimestamp();

  await execute(
    'UPDATE sticky_notes SET content = $1, updated_at = $2 WHERE id = $3',
    [content, timestamp, id]
  );

  const rows = await select<StickyNoteRow>('SELECT * FROM sticky_notes WHERE id = $1', [id]);
  return rows.length > 0 ? rowToStickyNote(rows[0]) : null;
}

export async function deleteStickyNote(id: string): Promise<boolean> {
  const result = await execute('DELETE FROM sticky_notes WHERE id = $1', [id]);
  return result.rowsAffected > 0;
}

export async function getDatesWithStickyNotes(startDate: string, endDate: string): Promise<Set<string>> {
  const rows = await select<{ date: string }>(
    "SELECT DISTINCT date FROM sticky_notes WHERE date >= $1 AND date <= $2 AND content != ''",
    [startDate, endDate]
  );
  return new Set(rows.map(r => r.date));
}
