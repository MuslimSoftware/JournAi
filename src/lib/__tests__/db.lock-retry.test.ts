import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('Database Lock Retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('retries execute when sqlite reports a lock', async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error('error returned from database: (code: 5) database is locked'))
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const { execute } = await import('../db');
    const result = await execute('DELETE FROM todos WHERE id = $1', ['todo-1']);

    expect(result).toEqual({ rowsAffected: 1 });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('retries select when sqlite reports a lock', async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error('database is locked'))
      .mockResolvedValueOnce([{ id: 'entry-1' }]);

    const { select } = await import('../db');
    const rows = await select<{ id: string }>('SELECT id FROM entries');

    expect(rows).toEqual([{ id: 'entry-1' }]);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('executes a batch inside one transaction with lock retry', async () => {
    mockInvoke
      .mockResolvedValueOnce({ rowsAffected: 0 }) // BEGIN
      .mockRejectedValueOnce(new Error('database is locked')) // statement attempt 1
      .mockResolvedValueOnce({ rowsAffected: 1 }) // statement retry
      .mockResolvedValueOnce({ rowsAffected: 0 }); // COMMIT

    const { executeBatch } = await import('../db');
    await executeBatch([
      {
        query: 'INSERT INTO todos (id, date, content, scheduled_time, completed, position, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        values: ['todo-1', '2025-01-01', 'Task', null, 0, 0, 'ts', 'ts'],
      },
    ]);

    expect(mockInvoke).toHaveBeenCalledTimes(4);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'plugin:sql|execute', expect.objectContaining({ query: 'BEGIN IMMEDIATE' }));
    expect(mockInvoke).toHaveBeenNthCalledWith(4, 'plugin:sql|execute', expect.objectContaining({ query: 'COMMIT' }));
  });
});
