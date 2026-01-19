import type { JournalEntry } from '../types/entry';
import { getTodayString, getTimestamp } from '../utils/date';
import { generateId, generatePreview } from '../utils/generators';
import { select, execute, selectPaginated } from '../lib/db';
import { deleteEntryEmbeddings } from './embeddings';
import { deleteEntryInsights } from './analytics';
import { generateContentHash } from './entryAnalysis';

interface EntryRow {
    id: string;
    date: string;
    content: string;
    created_at: string;
    processed_at: string | null;
    content_hash: string | null;
}

function rowToEntry(row: EntryRow): JournalEntry {
    return {
        id: row.id,
        date: row.date,
        content: row.content,
        preview: generatePreview(row.content),
        processedAt: row.processed_at,
        contentHash: row.content_hash,
    };
}

export interface EntriesPage {
    entries: JournalEntry[];
    nextCursor: string | null;
    hasMore: boolean;
}

export async function getEntriesPage(cursor: string | null, limit: number = 20): Promise<EntriesPage> {
    const result = await selectPaginated<EntryRow, JournalEntry>(
        'SELECT id, date, content, created_at, processed_at, content_hash FROM entries',
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
        'SELECT id, date, content, created_at, processed_at, content_hash FROM entries ORDER BY date DESC, created_at DESC'
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
        // First, get the current entry to check if content has actually changed
        const currentRows = await select<EntryRow>(
            'SELECT id, date, content, created_at, processed_at, content_hash FROM entries WHERE id = $1',
            [id]
        );

        if (currentRows.length === 0) return null;

        const currentEntry = currentRows[0];
        const contentHasChanged = currentEntry.content !== updates.content;

        // Update the content
        await execute(
            'UPDATE entries SET content = $1, updated_at = $2, last_content_update = $2 WHERE id = $3',
            [updates.content, timestamp, id]
        );

        // If content changed and entry was previously processed, mark for re-processing
        // by resetting processed_at to null and updating content_hash to the new hash.
        // Insights are NOT deleted here (they will be deleted on app launch when re-analysis occurs)
        if (contentHasChanged && currentEntry.processed_at !== null) {
            const newContentHash = generateContentHash(updates.content);
            await markEntryForReprocessing(id, newContentHash);
        }
    }

    if (updates.date !== undefined) {
        await execute(
            'UPDATE entries SET date = $1, updated_at = $2 WHERE id = $3',
            [updates.date, timestamp, id]
        );
    }

    const rows = await select<EntryRow>(
        'SELECT id, date, content, created_at, processed_at, content_hash FROM entries WHERE id = $1',
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

export interface ProcessingStats {
    totalEntries: number;
    processedEntries: number;
    unprocessedEntries: number;
}

/**
 * Get processing statistics for entries
 */
export async function getProcessingStats(): Promise<ProcessingStats> {
    const totalRows = await select<{ count: number }>('SELECT COUNT(*) as count FROM entries');
    const processedRows = await select<{ count: number }>('SELECT COUNT(*) as count FROM entries WHERE processed_at IS NOT NULL');

    const totalEntries = totalRows[0]?.count ?? 0;
    const processedEntries = processedRows[0]?.count ?? 0;

    return {
        totalEntries,
        processedEntries,
        unprocessedEntries: totalEntries - processedEntries,
    };
}

export async function getEntriesByIds(ids: string[]): Promise<JournalEntry[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await select<EntryRow>(
        `SELECT id, date, content, created_at, processed_at, content_hash FROM entries WHERE id IN (${placeholders})`,
        ids
    );
    return rows.map(rowToEntry);
}

export async function getEntriesByDateRange(
    start: string,
    end: string
): Promise<JournalEntry[]> {
    const rows = await select<EntryRow>(
        `SELECT id, date, content, created_at, processed_at, content_hash FROM entries
         WHERE date >= $1 AND date <= $2
         ORDER BY date DESC`,
        [start, end]
    );
    return rows.map(rowToEntry);
}

/**
 * Get all entries that have not been processed yet (processed_at is null)
 */
export async function getUnprocessedEntries(): Promise<JournalEntry[]> {
    const rows = await select<EntryRow>(
        `SELECT id, date, content, created_at, processed_at, content_hash FROM entries
         WHERE processed_at IS NULL
         ORDER BY date DESC, created_at DESC`
    );
    return rows.map(rowToEntry);
}

/**
 * Mark an entry as processed with the current timestamp and content hash
 */
export async function markEntryAsProcessed(id: string, contentHash: string): Promise<void> {
    const timestamp = getTimestamp();
    await execute(
        'UPDATE entries SET processed_at = $1, content_hash = $2 WHERE id = $3',
        [timestamp, contentHash, id]
    );
}

/**
 * Clear the processed status of an entry (set processed_at and content_hash to null)
 * Used when an entry is modified and needs re-analysis
 */
export async function clearEntryProcessedStatus(id: string): Promise<void> {
    await execute(
        'UPDATE entries SET processed_at = NULL, content_hash = NULL WHERE id = $1',
        [id]
    );
}

/**
 * Mark an entry for re-processing by updating content_hash and resetting processed_at to null.
 * This is called when entry content is modified - the new hash is stored but processed_at
 * is cleared to indicate the entry needs re-analysis. Insights are NOT deleted here.
 */
export async function markEntryForReprocessing(id: string, newContentHash: string): Promise<void> {
    await execute(
        'UPDATE entries SET processed_at = NULL, content_hash = $1 WHERE id = $2',
        [newContentHash, id]
    );
}

/**
 * Clear the processed status for ALL entries (set processed_at and content_hash to null).
 * Used when clearing all insights from settings - entries will need to be re-analyzed.
 */
export async function clearAllProcessedStatus(): Promise<void> {
    await execute('UPDATE entries SET processed_at = NULL, content_hash = NULL');
}
