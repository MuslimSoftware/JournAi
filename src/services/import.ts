import { open } from '@tauri-apps/plugin-dialog';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { getTimestamp } from '../utils/date';

const DB_URL = 'sqlite:journai.db';

interface ParsedEntry {
    date: string;
    content: string;
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseMarkdownFile(filename: string, content: string): ParsedEntry | null {
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
    if (!dateMatch) return null;

    const date = dateMatch[1];

    let body = content;
    const frontmatterMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
    if (frontmatterMatch) {
        body = content.slice(frontmatterMatch[0].length);
    }

    const notesIndex = body.indexOf('## Notes');
    const todosIndex = body.indexOf('## TODOs');
    const todoIndex = body.indexOf('## TODO');

    const cutOffPoints = [notesIndex, todosIndex, todoIndex].filter(i => i !== -1);
    if (cutOffPoints.length > 0) {
        const firstCutOff = Math.min(...cutOffPoints);
        body = body.slice(0, firstCutOff);
    }

    const journalContent = body.trim();
    if (!journalContent) return null;

    return { date, content: journalContent };
}

async function sqlExecute(query: string, values: unknown[] = []): Promise<{ rowsAffected: number }> {
    const result = await invoke('plugin:sql|execute', { db: DB_URL, query, values });
    const rowsAffected = Array.isArray(result) ? result[0] : (result as { rowsAffected: number }).rowsAffected;
    return { rowsAffected };
}

async function sqlSelect<T>(query: string, values: unknown[] = []): Promise<T[]> {
    const result = await invoke('plugin:sql|select', { db: DB_URL, query, values });
    return result as T[];
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

export async function selectImportFolder(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select LifeOS Backup Folder',
    });

    return selected as string | null;
}

export async function importEntriesFromFolder(
    folderPath: string,
    onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    const entries = await readDir(folderPath);
    const mdFiles = entries.filter(e => e.name?.endsWith('.md'));
    const total = mdFiles.length;

    const existingDates = await sqlSelect<{ date: string }>('SELECT DISTINCT date FROM entries');
    const existingDateSet = new Set(existingDates.map(e => e.date));

    for (let i = 0; i < mdFiles.length; i++) {
        const file = mdFiles[i];
        if (!file.name) continue;

        onProgress?.(i + 1, total);

        try {
            const filePath = `${folderPath}/${file.name}`;
            const content = await readTextFile(filePath);
            const parsed = parseMarkdownFile(file.name, content);

            if (!parsed) {
                result.skipped++;
                continue;
            }

            if (existingDateSet.has(parsed.date)) {
                result.skipped++;
                continue;
            }

            const id = generateId();
            const timestamp = getTimestamp();

            await sqlExecute(
                'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
                [id, parsed.date, parsed.content, timestamp, timestamp]
            );

            existingDateSet.add(parsed.date);
            result.imported++;
        } catch (err) {
            result.errors.push(`${file.name}: ${err}`);
        }
    }

    return result;
}
