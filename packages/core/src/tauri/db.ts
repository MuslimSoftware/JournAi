import { invoke } from '@tauri-apps/api/core';
import type { PaginatedResult, CursorConfig, PaginationOptions } from '../types/pagination';

const DB_URL = 'sqlite:journai.db';

export async function select<T>(query: string, values: unknown[] = []): Promise<T[]> {
    const result = await invoke('plugin:sql|select', { db: DB_URL, query, values });
    return result as T[];
}

export async function execute(query: string, values: unknown[] = []): Promise<{ rowsAffected: number }> {
    const result = await invoke('plugin:sql|execute', { db: DB_URL, query, values });
    const rowsAffected = Array.isArray(result) ? result[0] : (result as { rowsAffected: number }).rowsAffected;
    return { rowsAffected };
}

export function parseCursor(cursor: string, config: CursorConfig): string[] {
    const sep = config.separator ?? '|';
    return cursor.split(sep);
}

export function createCursor(values: string[], config: CursorConfig): string {
    const sep = config.separator ?? '|';
    return values.join(sep);
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
