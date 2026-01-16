import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import type { JournalEntry, EntryUpdate } from '../types/entry';
import * as entriesService from '../services/entries';
import { useEntryNavigation } from '../contexts/EntryNavigationContext';
import { useEntriesState } from '../contexts/EntriesStateContext';

const PAGE_SIZE = 30;

interface UseEntriesReturn {
    entries: JournalEntry[];
    totalCount: number;
    selectedEntry: JournalEntry | null;
    selectedEntryId: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    selectEntry: (id: string | null) => void;
    createEntry: (date?: string) => Promise<JournalEntry>;
    updateEntry: (id: string, updates: EntryUpdate) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    loadMore: () => Promise<void>;
    refreshEntries: () => Promise<JournalEntry[]>;
}

export function useEntries(): UseEntriesReturn {
    const {
        state,
        setEntries,
        appendEntries,
        updateEntryInState,
        removeEntry,
        addEntry,
        setSelectedEntryId,
        setTotalCount,
        setHasMore,
        setCursor,
        setScrollOffset,
        setInitialized,
    } = useEntriesState();

    const { target, clearTarget } = useEntryNavigation();
    const handledTargetId = useRef<string | null>(null);
    const isLoadingRef = useRef(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const isLoading = !state.isInitialized;

    useEffect(() => {
        if (state.isInitialized || isLoadingRef.current) return;
        isLoadingRef.current = true;

        const loadInitial = async () => {
            const [page, count] = await Promise.all([
                entriesService.getEntriesPage(null, PAGE_SIZE),
                entriesService.getEntriesCount(),
            ]);

            setEntries(page.entries);
            setTotalCount(count);
            setHasMore(page.hasMore);
            setCursor(page.nextCursor);
            setInitialized(true);
        };

        loadInitial();
    }, [state.isInitialized, setEntries, setTotalCount, setHasMore, setCursor, setInitialized]);

    useEffect(() => {
        if (!target || state.entries.length === 0) {
            return;
        }

        if (handledTargetId.current === target.entryId) {
            return;
        }
        handledTargetId.current = target.entryId;

        setScrollOffset(0);

        const existsInList = state.entries.some(e => e.id === target.entryId);
        if (existsInList) {
            setSelectedEntryId(target.entryId);
            clearTarget();
        } else {
            entriesService.getEntriesByIds([target.entryId]).then(fetched => {
                if (fetched.length > 0) {
                    const newList = [fetched[0], ...state.entries];
                    newList.sort((a, b) => b.date.localeCompare(a.date));
                    setEntries(newList);
                    setSelectedEntryId(target.entryId);
                }
                clearTarget();
            });
        }
    }, [state.entries, target, clearTarget, setSelectedEntryId, setEntries, setScrollOffset]);

    const selectedEntry = useMemo(
        () => state.entries.find(e => e.id === state.selectedEntryId) || null,
        [state.entries, state.selectedEntryId]
    );

    const createEntry = useCallback(async (date?: string) => {
        const newEntry = await entriesService.createEntry(date);
        addEntry(newEntry);
        return newEntry;
    }, [addEntry]);

    const updateEntry = useCallback(async (id: string, updates: EntryUpdate) => {
        const updated = await entriesService.updateEntry(id, updates);
        if (updated) {
            updateEntryInState(id, () => updated);
            if (updates.date) {
                setEntries(
                    [...state.entries.map(e => e.id === id ? updated : e)]
                        .sort((a, b) => b.date.localeCompare(a.date))
                );
            }
        }
    }, [updateEntryInState, setEntries, state.entries]);

    const deleteEntry = useCallback(async (id: string) => {
        const success = await entriesService.deleteEntry(id);
        if (success) {
            removeEntry(id);
        }
    }, [removeEntry]);

    const selectEntry = useCallback((id: string | null) => {
        const newId = (id === state.selectedEntryId) ? null : id;
        setSelectedEntryId(newId);
    }, [state.selectedEntryId, setSelectedEntryId]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !state.hasMore || !state.cursor) return;

        setIsLoadingMore(true);
        const page = await entriesService.getEntriesPage(state.cursor, PAGE_SIZE);
        appendEntries(page.entries);
        setHasMore(page.hasMore);
        setCursor(page.nextCursor);
        setIsLoadingMore(false);
    }, [isLoadingMore, state.hasMore, state.cursor, appendEntries, setHasMore, setCursor]);

    const refreshEntries = useCallback(async () => {
        const [page, count] = await Promise.all([
            entriesService.getEntriesPage(null, PAGE_SIZE),
            entriesService.getEntriesCount(),
        ]);

        setEntries(page.entries);
        setTotalCount(count);
        setHasMore(page.hasMore);
        setCursor(page.nextCursor);

        return page.entries;
    }, [setEntries, setTotalCount, setHasMore, setCursor]);

    return {
        entries: state.entries,
        totalCount: state.totalCount,
        selectedEntry,
        selectedEntryId: state.selectedEntryId,
        isLoading,
        isLoadingMore,
        hasMore: state.hasMore,
        selectEntry,
        createEntry,
        updateEntry,
        deleteEntry,
        loadMore,
        refreshEntries,
    };
}
