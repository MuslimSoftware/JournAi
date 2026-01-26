import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync, symlinkSync } from 'fs';

const DB_REAL_PATH = join(
  homedir(),
  'Library/Application Support/com.younesbenketira.journai/journai.db'
);
const DB_LINK_PATH = '/tmp/journai_eval.db';

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    if (existsSync(DB_LINK_PATH)) {
      try { unlinkSync(DB_LINK_PATH); } catch {}
    }
    symlinkSync(DB_REAL_PATH, DB_LINK_PATH);
    db = new Database(DB_LINK_PATH, { readonly: true });
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export async function select<T>(query: string, values: unknown[] = []): Promise<T[]> {
  const database = getDb();
  const stmt = database.prepare(query);
  return stmt.all(...values) as T[];
}

export async function execute(query: string, values: unknown[] = []): Promise<{ rowsAffected: number }> {
  const database = getDb();
  const stmt = database.prepare(query);
  const result = stmt.run(...values);
  return { rowsAffected: result.changes };
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
     WHERE entries_fts MATCH ?`;

  const values: unknown[] = [sanitized];

  if (dateRange) {
    sql += ` AND e.date >= ? AND e.date <= ?`;
    values.push(dateRange.start, dateRange.end);
  }

  sql += ` ORDER BY rank LIMIT ?`;
  values.push(limit);

  return select<FTSResult>(sql, values);
}
