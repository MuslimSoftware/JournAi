import { open } from '@tauri-apps/plugin-dialog';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { getTimestamp } from '../utils/date';
import { select, execute } from '../lib/db';

interface ParsedTodo {
    content: string;
    completed: boolean;
    scheduledTime: string | null;
}

interface ParsedStickyNote {
    content: string;
}

interface ParsedEntry {
    date: string;
    content: string;
    todos: ParsedTodo[];
    stickyNotes: ParsedStickyNote[];
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseTodosSection(section: string): ParsedTodo[] {
    const todos: ParsedTodo[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
        const todoMatch = line.match(/^- \[([ x])\] (.+)$/i);
        if (todoMatch) {
            const completed = todoMatch[1].toLowerCase() === 'x';
            let content = todoMatch[2].trim();
            let scheduledTime: string | null = null;

            const timeMatch = content.match(/@(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
            if (timeMatch) {
                scheduledTime = timeMatch[1].trim();
                content = content.replace(/@\d{1,2}:\d{2}\s*(?:AM|PM)?/i, '').trim();
            }

            if (content) {
                todos.push({ content, completed, scheduledTime });
            }
        }
    }

    return todos;
}

function parseNotesSection(section: string): ParsedStickyNote[] {
    const notes: ParsedStickyNote[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
            const content = trimmed.slice(2).trim();
            if (content) {
                notes.push({ content });
            }
        } else if (trimmed.startsWith('X ')) {
            const content = trimmed.slice(2).trim();
            if (content) {
                notes.push({ content });
            }
        }
    }

    return notes;
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

    let journalContent = body;
    let notesSection = '';
    let todosSection = '';

    const sections: { index: number; type: 'notes' | 'todos' }[] = [];
    if (notesIndex !== -1) sections.push({ index: notesIndex, type: 'notes' });
    if (todosIndex !== -1) sections.push({ index: todosIndex, type: 'todos' });
    if (todoIndex !== -1) sections.push({ index: todoIndex, type: 'todos' });
    sections.sort((a, b) => a.index - b.index);

    if (sections.length > 0) {
        journalContent = body.slice(0, sections[0].index);

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const nextIndex = i + 1 < sections.length ? sections[i + 1].index : body.length;
            const sectionContent = body.slice(section.index, nextIndex);

            if (section.type === 'notes') {
                notesSection = sectionContent;
            } else {
                todosSection = sectionContent;
            }
        }
    }

    const todos = parseTodosSection(todosSection);
    const stickyNotes = parseNotesSection(notesSection);

    const trimmedJournalContent = journalContent.trim();
    if (!trimmedJournalContent && todos.length === 0 && stickyNotes.length === 0) {
        return null;
    }

    return { date, content: trimmedJournalContent, todos, stickyNotes };
}

export interface ImportResult {
    imported: number;
    skipped: number;
    todosImported: number;
    stickyNotesImported: number;
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
    const result: ImportResult = { imported: 0, skipped: 0, todosImported: 0, stickyNotesImported: 0, errors: [] };

    const entries = await readDir(folderPath);
    const mdFiles = entries.filter(e => e.name?.endsWith('.md'));
    const total = mdFiles.length;

    const existingDates = await select<{ date: string }>('SELECT DISTINCT date FROM entries');
    const existingDateSet = new Set(existingDates.map(e => e.date));

    const existingTodoDates = await select<{ date: string }>('SELECT DISTINCT date FROM todos');
    const existingTodoDateSet = new Set(existingTodoDates.map(e => e.date));

    const existingStickyNoteDates = await select<{ date: string }>('SELECT DISTINCT date FROM sticky_notes');
    const existingStickyNoteDateSet = new Set(existingStickyNoteDates.map(e => e.date));

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

            const timestamp = getTimestamp();

            if (parsed.content && !existingDateSet.has(parsed.date)) {
                const id = generateId();
                await execute(
                    'INSERT INTO entries (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
                    [id, parsed.date, parsed.content, timestamp, timestamp]
                );
                existingDateSet.add(parsed.date);
                result.imported++;
            } else if (existingDateSet.has(parsed.date)) {
                result.skipped++;
            }

            if (parsed.todos.length > 0 && !existingTodoDateSet.has(parsed.date)) {
                for (const todo of parsed.todos) {
                    const id = generateId();
                    await execute(
                        'INSERT INTO todos (id, date, content, scheduled_time, completed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [id, parsed.date, todo.content, todo.scheduledTime, todo.completed ? 1 : 0, timestamp, timestamp]
                    );
                    result.todosImported++;
                }
                existingTodoDateSet.add(parsed.date);
            }

            if (parsed.stickyNotes.length > 0 && !existingStickyNoteDateSet.has(parsed.date)) {
                for (const note of parsed.stickyNotes) {
                    const id = generateId();
                    await execute(
                        'INSERT INTO sticky_notes (id, date, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
                        [id, parsed.date, note.content, timestamp, timestamp]
                    );
                    result.stickyNotesImported++;
                }
                existingStickyNoteDateSet.add(parsed.date);
            }
        } catch (err) {
            result.errors.push(`${file.name}: ${err}`);
        }
    }

    return result;
}
