import { invoke } from '@tauri-apps/api/core';
import type { JournalEntry } from '../types/entry';

const DB_URL = 'sqlite:journai.db';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generatePreview(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
}

async function sqlSelect<T>(query: string, values: unknown[] = []): Promise<T[]> {
    console.log('sqlSelect:', { db: DB_URL, query, values });
    const result = await invoke('plugin:sql|select', { db: DB_URL, query, values });
    console.log('sqlSelect result:', result);
    return result as T[];
}

async function sqlExecute(query: string, values: unknown[] = []): Promise<{ rowsAffected: number }> {
    const result = await invoke('plugin:sql|execute', { db: DB_URL, query, values });
    const rowsAffected = Array.isArray(result) ? result[0] : (result as { rowsAffected: number }).rowsAffected;
    return { rowsAffected };
}

export async function getEntries(): Promise<JournalEntry[]> {
    console.log('getEntries: starting');
    const rows = await sqlSelect<{
        id: string;
        date: string;
        content: string;
    }>('SELECT id, date, content FROM entries ORDER BY date DESC, created_at DESC');

    console.log('getEntries: got rows', rows);
    return rows.map(row => ({
        id: row.id,
        date: row.date,
        content: row.content,
        preview: generatePreview(row.content),
    }));
}

export async function createEntry(date?: string): Promise<JournalEntry> {
    console.log('createEntry: starting with date', date);
    const id = generateId();
    const now = new Date().toISOString();
    const entryDate = date || now.split('T')[0];
    const content = '';

    console.log('createEntry: inserting', { id, entryDate, content, now });
    await sqlExecute(
        'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [id, entryDate, content, now, now]
    );

    console.log('createEntry: success');
    return { id, date: entryDate, content, preview: '' };
}

export async function updateEntry(
    id: string,
    updates: { content?: string; date?: string }
): Promise<JournalEntry | null> {
    const now = new Date().toISOString();

    if (updates.content !== undefined) {
        await sqlExecute(
            'UPDATE entries SET content = $1, updated_at = $2 WHERE id = $3',
            [updates.content, now, id]
        );
    }

    if (updates.date !== undefined) {
        await sqlExecute(
            'UPDATE entries SET date = $1, updated_at = $2 WHERE id = $3',
            [updates.date, now, id]
        );
    }

    const rows = await sqlSelect<{ id: string; date: string; content: string }>(
        'SELECT id, date, content FROM entries WHERE id = $1',
        [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        id: row.id,
        date: row.date,
        content: row.content,
        preview: generatePreview(row.content),
    };
}

export async function deleteEntry(id: string): Promise<boolean> {
    const result = await sqlExecute('DELETE FROM entries WHERE id = $1', [id]);
    return result.rowsAffected > 0;
}
