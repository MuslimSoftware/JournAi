import { invoke } from '@tauri-apps/api/core';
import type { PaginatedResult, CursorConfig, PaginationOptions } from '../types/pagination';

const DB_URL = 'sqlite:journai_secure.db';
const DB_LOCK_MAX_RETRIES = 10;
const DB_LOCK_BASE_DELAY_MS = 40;

let operationQueue: Promise<void> = Promise.resolve();
let loadPromise: Promise<void> | null = null;
let dbLoaded = false;

export interface DbStatement {
    query: string;
    values?: unknown[];
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function isDatabaseLockedError(error: unknown): boolean {
    const message = String(error).toLowerCase();
    return message.includes('database is locked') || message.includes('code: 5');
}

async function withDatabaseLockRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= DB_LOCK_MAX_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (!isDatabaseLockedError(error) || attempt === DB_LOCK_MAX_RETRIES) {
                throw error;
            }

            const backoffMs = DB_LOCK_BASE_DELAY_MS * (attempt + 1);
            await sleep(backoffMs);
        }
    }

    throw lastError;
}

async function runSerialized<T>(operation: () => Promise<T>): Promise<T> {
    const previous = operationQueue;
    let release!: () => void;
    operationQueue = new Promise<void>((resolve) => {
        release = resolve;
    });

    await previous;

    try {
        return await operation();
    } finally {
        release();
    }
}

async function ensureDatabaseLoaded(): Promise<void> {
    if (dbLoaded) {
        return;
    }

    if (!loadPromise) {
        loadPromise = (async () => {
            await invoke('plugin:sql|load', { db: DB_URL });
            dbLoaded = true;
        })();
    }

    try {
        await loadPromise;
    } catch (error) {
        loadPromise = null;
        dbLoaded = false;
        throw error;
    }
}

async function invokeSelect(query: string, values: unknown[]): Promise<unknown> {
    await ensureDatabaseLoaded();
    return invoke('plugin:sql|select', { db: DB_URL, query, values });
}

async function invokeExecute(query: string, values: unknown[]): Promise<{ rowsAffected: number }> {
    await ensureDatabaseLoaded();
    const result = await invoke('plugin:sql|execute', { db: DB_URL, query, values });
    const rowsAffected = Array.isArray(result) ? result[0] : (result as { rowsAffected: number }).rowsAffected;
    return { rowsAffected };
}

export async function closeDatabaseConnection(): Promise<void> {
    await runSerialized(async () => {
        if (loadPromise) {
            try {
                await loadPromise;
            } catch {
                loadPromise = null;
                dbLoaded = false;
                return;
            }
        }

        if (!dbLoaded) {
            return;
        }

        await invoke('plugin:sql|close', { db: DB_URL });
        loadPromise = null;
        dbLoaded = false;
    });
}

export async function select<T>(query: string, values: unknown[] = []): Promise<T[]> {
    const result = await runSerialized(() => withDatabaseLockRetry(
        () => invokeSelect(query, values)
    ));
    return result as T[];
}

export async function execute(query: string, values: unknown[] = []): Promise<{ rowsAffected: number }> {
    return runSerialized(() => withDatabaseLockRetry(
        () => invokeExecute(query, values)
    ));
}

export async function executeBatch(statements: DbStatement[]): Promise<void> {
    if (statements.length === 0) {
        return;
    }

    await runSerialized(async () => {
        await withDatabaseLockRetry(() => invokeExecute('BEGIN IMMEDIATE', []));
        let committed = false;

        try {
            for (const statement of statements) {
                await withDatabaseLockRetry(() => invokeExecute(statement.query, statement.values ?? []));
            }

            await withDatabaseLockRetry(() => invokeExecute('COMMIT', []));
            committed = true;
        } finally {
            if (!committed) {
                try {
                    await withDatabaseLockRetry(() => invokeExecute('ROLLBACK', []));
                } catch {
                    // Ignore rollback errors for already-failed batches.
                }
            }
        }
    });
}

export function parseCursor(cursor: string, config: CursorConfig): string[] {
    const sep = config.separator ?? '|';
    return cursor.split(sep);
}

export function createCursor(values: string[], config: CursorConfig): string {
    const sep = config.separator ?? '|';
    return values.join(sep);
}

export interface FTSResult {
  id: string;
  date: string;
  content: string;
  rank: number;
}

export async function searchFTS(
  query: string,
  limit: number = 10,
  dateRange?: { start: string; end: string }
): Promise<FTSResult[]> {
  const sanitized = query.replace(/['\"]/g, '').trim();
  if (!sanitized) return [];

  let sql = `SELECT e.id, e.date, e.content, bm25(entries_fts) as rank
     FROM entries_fts fts
     JOIN entries e ON e.rowid = fts.rowid
     WHERE entries_fts MATCH $1`;

  const values: unknown[] = [sanitized];

  if (dateRange) {
    sql += ` AND e.date >= $2 AND e.date <= $3`;
    values.push(dateRange.start, dateRange.end);
  }

  sql += ` ORDER BY rank LIMIT $${values.length + 1}`;
  values.push(limit);

  const results = await select<FTSResult>(sql, values);
  return results;
}

export async function selectPaginated<TRow, TResult>(
    baseQuery: string,
    orderColumns: { column: string; direction: 'ASC' | 'DESC' }[],
    options: PaginationOptions,
    transform: (row: TRow) => TResult,
    cursorConfig: CursorConfig
): Promise<PaginatedResult<TResult>> {
    const limit = options.limit ?? 20;
    const values: unknown[] = [];
    let query = baseQuery;

    if (options.cursor) {
        const cursorValues = parseCursor(options.cursor, cursorConfig);
        const conditions: string[] = [];

        for (let i = 0; i < orderColumns.length; i++) {
            const col = orderColumns[i];
            const op = col.direction === 'DESC' ? '<' : '>';
            const prefix = orderColumns.slice(0, i).map((c, j) => `${c.column} = $${j + 1}`);
            const current = `${col.column} ${op} $${i + 1}`;

            if (prefix.length > 0) {
                conditions.push(`(${prefix.join(' AND ')} AND ${current})`);
            } else {
                conditions.push(`(${current})`);
            }
        }

        const whereClause = conditions.join(' OR ');
        query += query.includes('WHERE') ? ` AND (${whereClause})` : ` WHERE (${whereClause})`;
        values.push(...cursorValues);
    }

    const orderClause = orderColumns.map(c => `${c.column} ${c.direction}`).join(', ');
    query += ` ORDER BY ${orderClause} LIMIT $${values.length + 1}`;
    values.push(limit + 1);

    const rows = await select<TRow>(query, values);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(transform);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
        const lastItem = rows[limit - 1];
        const cursorValues = cursorConfig.columns.map(col => String((lastItem as Record<string, unknown>)[col]));
        nextCursor = createCursor(cursorValues, cursorConfig);
    }

    return { items, nextCursor, hasMore };
}
