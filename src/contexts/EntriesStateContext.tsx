import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import type { JournalEntry } from '../types/entry';

interface EntriesState {
    entries: JournalEntry[];
    selectedEntryId: string | null;
    totalCount: number;
    hasMore: boolean;
    cursor: string | null;
    scrollOffset: number;
    isInitialized: boolean;
}

interface EntriesStateContextValue {
    state: EntriesState;
    setEntries: (entries: JournalEntry[]) => void;
    appendEntries: (entries: JournalEntry[]) => void;
    updateEntryInState: (id: string, updater: (entry: JournalEntry) => JournalEntry) => void;
    removeEntry: (id: string) => void;
    addEntry: (entry: JournalEntry) => void;
    setSelectedEntryId: (id: string | null) => void;
    setTotalCount: (count: number) => void;
    setHasMore: (hasMore: boolean) => void;
    setCursor: (cursor: string | null) => void;
    setScrollOffset: (offset: number) => void;
    setInitialized: (initialized: boolean) => void;
    resetState: () => void;
}

const initialState: EntriesState = {
    entries: [],
    selectedEntryId: null,
    totalCount: 0,
    hasMore: true,
    cursor: null,
    scrollOffset: 0,
    isInitialized: false,
};

const EntriesStateContext = createContext<EntriesStateContextValue | null>(null);

export function EntriesStateProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<EntriesState>(initialState);
    const stateRef = useRef(state);
    stateRef.current = state;

    const setEntries = useCallback((entries: JournalEntry[]) => {
        setState(prev => ({ ...prev, entries }));
    }, []);

    const appendEntries = useCallback((newEntries: JournalEntry[]) => {
        setState(prev => {
            const existingIds = new Set(prev.entries.map(e => e.id));
            const uniqueNewEntries = newEntries.filter(e => !existingIds.has(e.id));
            return { ...prev, entries: [...prev.entries, ...uniqueNewEntries] };
        });
    }, []);

    const updateEntryInState = useCallback((id: string, updater: (entry: JournalEntry) => JournalEntry) => {
        setState(prev => ({
            ...prev,
            entries: prev.entries.map(e => e.id === id ? updater(e) : e),
        }));
    }, []);

    const removeEntry = useCallback((id: string) => {
        setState(prev => {
            const remaining = prev.entries.filter(e => e.id !== id);
            let newSelectedId = prev.selectedEntryId;
            if (prev.selectedEntryId === id) {
                newSelectedId = remaining.length > 0 ? remaining[0].id : null;
            }
            return {
                ...prev,
                entries: remaining,
                selectedEntryId: newSelectedId,
                totalCount: prev.totalCount - 1,
            };
        });
    }, []);

    const addEntry = useCallback((entry: JournalEntry) => {
        setState(prev => ({
            ...prev,
            entries: [entry, ...prev.entries],
            selectedEntryId: entry.id,
            totalCount: prev.totalCount + 1,
        }));
    }, []);

    const setSelectedEntryId = useCallback((id: string | null) => {
        setState(prev => ({ ...prev, selectedEntryId: id }));
    }, []);

    const setTotalCount = useCallback((totalCount: number) => {
        setState(prev => ({ ...prev, totalCount }));
    }, []);

    const setHasMore = useCallback((hasMore: boolean) => {
        setState(prev => ({ ...prev, hasMore }));
    }, []);

    const setCursor = useCallback((cursor: string | null) => {
        setState(prev => ({ ...prev, cursor }));
    }, []);

    const setScrollOffset = useCallback((scrollOffset: number) => {
        setState(prev => ({ ...prev, scrollOffset }));
    }, []);

    const setInitialized = useCallback((isInitialized: boolean) => {
        setState(prev => ({ ...prev, isInitialized }));
    }, []);

    const resetState = useCallback(() => {
        setState(initialState);
    }, []);

    useEffect(() => {
        const handler = () => resetState();
        window.addEventListener('import-complete', handler);
        return () => window.removeEventListener('import-complete', handler);
    }, [resetState]);

    return (
        <EntriesStateContext.Provider
            value={{
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
                resetState,
            }}
        >
            {children}
        </EntriesStateContext.Provider>
    );
}

export function useEntriesState() {
    const context = useContext(EntriesStateContext);
    if (!context) {
        throw new Error('useEntriesState must be used within an EntriesStateProvider');
    }
    return context;
}
