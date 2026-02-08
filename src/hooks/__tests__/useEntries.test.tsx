import { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEntries } from '../useEntries';
import { useEntryNavigation, EntryNavigationProvider } from '../../contexts/EntryNavigationContext';
import { EntriesStateProvider } from '../../contexts/EntriesStateContext';
import type { JournalEntry } from '../../types/entry';
import * as entriesService from '../../services/entries';

vi.mock('../../services/entries', () => ({
  getEntriesPage: vi.fn(),
  getEntriesCount: vi.fn(),
  getEntriesByIds: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));

function buildEntry(id: string, date: string): JournalEntry {
  return {
    id,
    date,
    preview: `Preview ${id}`,
    content: `Content ${id}`,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <EntryNavigationProvider>
      <EntriesStateProvider>{children}</EntriesStateProvider>
    </EntryNavigationProvider>
  );
}

describe('useEntries target hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(entriesService.createEntry).mockResolvedValue(buildEntry('new-entry', '2026-02-08'));
    vi.mocked(entriesService.updateEntry).mockResolvedValue(null);
    vi.mocked(entriesService.deleteEntry).mockResolvedValue(true);
  });

  it('shows target entry immediately when it is already loaded in state', async () => {
    const entries = [
      buildEntry('entry-1', '2026-02-08'),
      buildEntry('entry-2', '2026-02-07'),
    ];

    vi.mocked(entriesService.getEntriesPage).mockResolvedValue({
      entries,
      hasMore: false,
      nextCursor: null,
    });
    vi.mocked(entriesService.getEntriesCount).mockResolvedValue(entries.length);
    vi.mocked(entriesService.getEntriesByIds).mockResolvedValue([]);

    const { result } = renderHook(() => {
      const entriesHook = useEntries();
      const navigation = useEntryNavigation();
      return {
        ...entriesHook,
        navigateToEntry: navigation.navigateToEntry,
      };
    }, { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selectedEntry).toBeNull();

    act(() => {
      result.current.navigateToEntry('entry-2');
    });

    expect(result.current.selectedEntry?.id).toBe('entry-2');
    expect(result.current.isResolvingTarget).toBe(false);
    expect(vi.mocked(entriesService.getEntriesByIds)).not.toHaveBeenCalled();
  });

  it('keeps a loading target state until missing target entry resolves', async () => {
    const entries = [buildEntry('entry-1', '2026-02-08')];
    const fetchedTarget = buildEntry('entry-99', '2026-02-01');
    const deferredTarget = createDeferred<JournalEntry[]>();

    vi.mocked(entriesService.getEntriesPage).mockResolvedValue({
      entries,
      hasMore: false,
      nextCursor: null,
    });
    vi.mocked(entriesService.getEntriesCount).mockResolvedValue(entries.length);
    vi.mocked(entriesService.getEntriesByIds).mockReturnValue(deferredTarget.promise);

    const { result } = renderHook(() => {
      const entriesHook = useEntries();
      const navigation = useEntryNavigation();
      return {
        ...entriesHook,
        navigateToEntry: navigation.navigateToEntry,
      };
    }, { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.navigateToEntry(fetchedTarget.id);
    });

    await waitFor(() => expect(result.current.isResolvingTarget).toBe(true));
    expect(result.current.selectedEntry).toBeNull();
    expect(vi.mocked(entriesService.getEntriesByIds)).toHaveBeenCalledWith([fetchedTarget.id]);

    act(() => {
      deferredTarget.resolve([fetchedTarget]);
    });

    await waitFor(() => expect(result.current.selectedEntry?.id).toBe(fetchedTarget.id));
    await waitFor(() => expect(result.current.isResolvingTarget).toBe(false));
  });
});
