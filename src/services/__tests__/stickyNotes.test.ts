import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../lib/db', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
  execute: (...args: unknown[]) => mockExecute(...args),
}));

import { createStickyNote, getStickyNotesByDate, updateStickyNote } from '../stickyNotes';

describe('Sticky Notes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not create a sticky note when content is empty or whitespace', async () => {
    const result = await createStickyNote('2025-01-01', '   \n  ');

    expect(result).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('deletes a sticky note when updating it to empty content', async () => {
    mockExecute.mockResolvedValue({ rowsAffected: 1 });

    const result = await updateStickyNote('note-1', '   ');

    expect(result).toBeNull();
    expect(mockExecute).toHaveBeenCalledWith('DELETE FROM sticky_notes WHERE id = $1', ['note-1']);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('loads sticky notes with a non-empty content filter', async () => {
    mockSelect.mockResolvedValue([
      {
        id: 'note-1',
        date: '2025-01-01',
        content: 'Hello',
        created_at: '2025-01-01T08:00:00.000Z',
        updated_at: '2025-01-01T08:00:00.000Z',
      },
    ]);

    const notes = await getStickyNotesByDate('2025-01-01');

    expect(mockSelect).toHaveBeenCalledWith(
      "SELECT * FROM sticky_notes WHERE date = $1 AND TRIM(content) != '' ORDER BY created_at ASC",
      ['2025-01-01']
    );
    expect(notes).toEqual([{ id: 'note-1', date: '2025-01-01', content: 'Hello' }]);
  });
});
