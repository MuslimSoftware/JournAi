import type { Todo, TodoRow } from '../types/todo';
import { getTimestamp } from '../utils/date';
import { select, execute } from '../lib/db';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
    scheduledTime: row.scheduled_time,
    completed: row.completed === 1,
  };
}

export async function getTodosByDate(date: string): Promise<Todo[]> {
  const rows = await select<TodoRow>(
    'SELECT * FROM todos WHERE date = $1 ORDER BY scheduled_time ASC NULLS LAST, created_at ASC',
    [date]
  );
  return rows.map(rowToTodo);
}

export async function getTodosByDateRange(startDate: string, endDate: string): Promise<Todo[]> {
  const rows = await select<TodoRow>(
    'SELECT * FROM todos WHERE date >= $1 AND date <= $2 ORDER BY date ASC, scheduled_time ASC NULLS LAST',
    [startDate, endDate]
  );
  return rows.map(rowToTodo);
}

export async function createTodo(
  date: string,
  content: string,
  scheduledTime?: string
): Promise<Todo> {
  const id = generateId();
  const timestamp = getTimestamp();

  await execute(
    'INSERT INTO todos (id, date, content, scheduled_time, completed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, date, content, scheduledTime ?? null, 0, timestamp, timestamp]
  );

  return { id, date, content, scheduledTime: scheduledTime ?? null, completed: false };
}

export async function updateTodo(
  id: string,
  updates: { content?: string; scheduledTime?: string | null; completed?: boolean }
): Promise<Todo | null> {
  const timestamp = getTimestamp();
  const setClauses: string[] = ['updated_at = $1'];
  const values: unknown[] = [timestamp];
  let paramIndex = 2;

  if (updates.content !== undefined) {
    setClauses.push(`content = $${paramIndex}`);
    values.push(updates.content);
    paramIndex++;
  }
  if (updates.scheduledTime !== undefined) {
    setClauses.push(`scheduled_time = $${paramIndex}`);
    values.push(updates.scheduledTime);
    paramIndex++;
  }
  if (updates.completed !== undefined) {
    setClauses.push(`completed = $${paramIndex}`);
    values.push(updates.completed ? 1 : 0);
    paramIndex++;
  }

  values.push(id);
  await execute(
    `UPDATE todos SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  const rows = await select<TodoRow>('SELECT * FROM todos WHERE id = $1', [id]);
  return rows.length > 0 ? rowToTodo(rows[0]) : null;
}

export async function deleteTodo(id: string): Promise<boolean> {
  const result = await execute('DELETE FROM todos WHERE id = $1', [id]);
  return result.rowsAffected > 0;
}

export async function getTodosCountByDate(startDate: string, endDate: string): Promise<Map<string, { total: number; completed: number }>> {
  const rows = await select<{ date: string; total: number; completed: number }>(
    `SELECT date, COUNT(*) as total, SUM(completed) as completed
     FROM todos WHERE date >= $1 AND date <= $2
     GROUP BY date`,
    [startDate, endDate]
  );

  const map = new Map<string, { total: number; completed: number }>();
  rows.forEach(row => map.set(row.date, { total: row.total, completed: row.completed }));
  return map;
}
