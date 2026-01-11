import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { JournalEntry, EntryUpdate } from '../types/entry';
import { usePaginatedQuery } from './usePaginatedQuery';
import * as entriesService from '../services/entries';
import { useEntryNavigation, HighlightRange } from '../contexts/EntryNavigationContext';

const PAGE_SIZE = 30;

export type { HighlightRange };

interface UseEntriesReturn {
    entries: JournalEntry[];
    totalCount: number;
    selectedEntry: JournalEntry | null;
    selectedEntryId: string | null;
    highlightRange: HighlightRange | null;
    clearHighlight: () => void;
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
    const queryFn = useCallback(
        async (cursor: string | null, pageSize: number) => {
            const page = await entriesService.getEntriesPage(cursor, pageSize);
            return {
                data: page.entries,
                nextCursor: page.nextCursor,
                hasMore: page.hasMore,
            };
        },
        []
    );

    const {
        data: entries,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        refresh,
    } = usePaginatedQuery<JournalEntry>({
        queryFn,
        pageSize: PAGE_SIZE,
    });

    const { target, clearTarget } = useEntryNavigation();
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [localEntries, setLocalEntries] = useState<JournalEntry[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(null);
    const handledTargetId = useRef<string | null>(null);

    const clearHighlight = useCallback(() => {
        setHighlightRange(null);
    }, []);

    useEffect(() => {
        entriesService.getEntriesCount().then(setTotalCount);
    }, []);

    useEffect(() => {
        setLocalEntries(entries);
    }, [entries]);

    useEffect(() => {
        if (!target || localEntries.length === 0) {
            if (localEntries.length > 0 && !selectedEntryId) {
                setSelectedEntryId(localEntries[0].id);
            }
            return;
        }

        if (handledTargetId.current === target.entryId) {
            return;
        }
        handledTargetId.current = target.entryId;

        if (target.highlight) {
            setHighlightRange(target.highlight);
        }

        const existsInList = localEntries.some(e => e.id === target.entryId);
        if (existsInList) {
            setSelectedEntryId(target.entryId);
            clearTarget();
        } else {
            entriesService.getEntriesByIds([target.entryId]).then(fetched => {
                if (fetched.length > 0) {
                    setLocalEntries(prev => {
                        const newList = [fetched[0], ...prev];
                        newList.sort((a, b) => b.date.localeCompare(a.date));
                        return newList;
                    });
                    setSelectedEntryId(target.entryId);
                }
                clearTarget();
            });
        }
    }, [localEntries, selectedEntryId, target, clearTarget]);

    const selectedEntry = useMemo(
        () => localEntries.find(e => e.id === selectedEntryId) || null,
        [localEntries, selectedEntryId]
    );

    const createEntry = useCallback(async (date?: string) => {
        try {
            const newEntry = await entriesService.createEntry(date);
            setLocalEntries(prev => [newEntry, ...prev]);
            setTotalCount(prev => prev + 1);
            setSelectedEntryId(newEntry.id);
            return newEntry;
        } catch (error) {
            console.error('Failed to create entry:', error);
            throw error;
        }
    }, []);

    const updateEntry = useCallback(async (id: string, updates: EntryUpdate) => {
        const updated = await entriesService.updateEntry(id, updates);
        if (updated) {
            setLocalEntries(prev => {
                const newEntries = prev.map(e => e.id === id ? updated : e);
                if (updates.date) {
                    newEntries.sort((a, b) => b.date.localeCompare(a.date));
                }
                return newEntries;
            });
        }
    }, []);

    const deleteEntry = useCallback(async (id: string) => {
        try {
            const success = await entriesService.deleteEntry(id);
            if (success) {
                setLocalEntries(prev => {
                    const remaining = prev.filter(e => e.id !== id);
                    if (selectedEntryId === id) {
                        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
                    }
                    return remaining;
                });
                setTotalCount(prev => prev - 1);
            }
        } catch (error) {
            console.error('deleteEntry failed:', error);
        }
    }, [selectedEntryId]);

    const selectEntry = useCallback((id: string | null) => {
        if (id !== selectedEntryId) {
            setHighlightRange(null);
        }
        setSelectedEntryId(id);
    }, [selectedEntryId]);

    return {
        entries: localEntries,
        totalCount,
        selectedEntry,
        selectedEntryId,
        highlightRange,
        clearHighlight,
        isLoading,
        isLoadingMore,
        hasMore,
        selectEntry,
        createEntry,
        updateEntry,
        deleteEntry,
        loadMore,
        refreshEntries: refresh,
    };
}
