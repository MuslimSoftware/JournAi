import type { JournalEntry } from '../types/entry';
import { getTodayString, getTimestamp } from '../utils/date';
import { generateId, generatePreview } from '../utils/generators';
import { select, execute, selectPaginated } from '../lib/db';
import { deleteEntryEmbeddings } from './embeddings';
import { deleteEntryInsights } from './analytics';

interface EntryRow {
    id: string;
    date: string;
    content: string;
    created_at: string;
}

function rowToEntry(row: EntryRow): JournalEntry {
    return {
        id: row.id,
        date: row.date,
        content: row.content,
        preview: generatePreview(row.content),
    };
}

export interface EntriesPage {
    entries: JournalEntry[];
    nextCursor: string | null;
    hasMore: boolean;
}

export async function getEntriesPage(cursor: string | null, limit: number = 20): Promise<EntriesPage> {
    const result = await selectPaginated<EntryRow, JournalEntry>(
        'SELECT id, date, content, created_at FROM entries',
        [
            { column: 'date', direction: 'DESC' },
            { column: 'id', direction: 'DESC' },
        ],
        { cursor, limit },
        rowToEntry,
        { columns: ['date', 'id'], separator: '|' }
    );

    return {
        entries: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
    };
}

export async function getEntries(): Promise<JournalEntry[]> {
    const rows = await select<EntryRow>(
        'SELECT id, date, content, created_at FROM entries ORDER BY date DESC, created_at DESC'
    );
    return rows.map(rowToEntry);
}

export async function createEntry(date?: string): Promise<JournalEntry> {
    const id = generateId();
    const entryDate = date || getTodayString();
    const content = '';
    const timestamp = getTimestamp();

    await execute(
        'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [id, entryDate, content, timestamp, timestamp]
    );

    return { id, date: entryDate, content, preview: '' };
}

export async function updateEntry(
    id: string,
    updates: { content?: string; date?: string }
): Promise<JournalEntry | null> {
    const timestamp = getTimestamp();

    if (updates.content !== undefined) {
        await execute(
            'UPDATE entries SET content = $1, updated_at = $2, last_content_update = $2 WHERE id = $3',
            [updates.content, timestamp, id]
        );
    }

    if (updates.date !== undefined) {
        await execute(
            'UPDATE entries SET date = $1, updated_at = $2 WHERE id = $3',
            [updates.date, timestamp, id]
        );
    }

    const rows = await select<EntryRow>(
        'SELECT id, date, content, created_at FROM entries WHERE id = $1',
        [id]
    );

    if (rows.length === 0) return null;

    const entry = rowToEntry(rows[0]);

    return entry;
}

export async function deleteEntry(id: string): Promise<boolean> {
    await deleteEntryEmbeddings(id).catch(console.error);
    await deleteEntryInsights(id).catch(console.error);
    const result = await execute('DELETE FROM entries WHERE id = $1', [id]);
    return result.rowsAffected > 0;
}

export async function getEntriesCount(): Promise<number> {
    const rows = await select<{ count: number }>('SELECT COUNT(*) as count FROM entries');
    return rows[0]?.count ?? 0;
}

export async function getEntriesByIds(ids: string[]): Promise<JournalEntry[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await select<EntryRow>(
        `SELECT id, date, content, created_at FROM entries WHERE id IN (${placeholders})`,
        ids
    );
    return rows.map(rowToEntry);
}

export async function getEntriesByDateRange(
    start: string,
    end: string
): Promise<JournalEntry[]> {
    const rows = await select<EntryRow>(
        `SELECT id, date, content, created_at FROM entries
         WHERE date >= $1 AND date <= $2
         ORDER BY date DESC`,
        [start, end]
    );
    return rows.map(rowToEntry);
}
