import { useState, useEffect, useCallback } from 'react';
import type { JournalEntry, EntryUpdate } from '../types/entry';
import * as entriesService from '../services/entries';

interface UseEntriesReturn {
    entries: JournalEntry[];
    selectedEntry: JournalEntry | null;
    selectedEntryId: string | null;
    isLoading: boolean;
    selectEntry: (id: string | null) => void;
    createEntry: (date?: string) => Promise<JournalEntry>;
    updateEntry: (id: string, updates: EntryUpdate) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    refreshEntries: () => Promise<void>;
}

export function useEntries(): UseEntriesReturn {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadEntries = useCallback(async () => {
        try {
            const data = await entriesService.getEntries();
            setEntries(data);
            setIsLoading(false);
            return data;
        } catch (error) {
            console.error('loadEntries: FAILED', error);
            setIsLoading(false);
            return [];
        }
    }, []);

    useEffect(() => {
        loadEntries().then(data => {
            if (data.length > 0 && !selectedEntryId) {
                setSelectedEntryId(data[0].id);
            }
        });
    }, []);

    const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;

    const createEntry = useCallback(async (date?: string) => {
        try {
            const newEntry = await entriesService.createEntry(date);
            setEntries(prev => [newEntry, ...prev]);
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
            setEntries(prev => {
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
                setEntries(prev => {
                    const remaining = prev.filter(e => e.id !== id);
                    if (selectedEntryId === id) {
                        setSelectedEntryId(remaining.length > 0 ? remaining[0].id : null);
                    }
                    return remaining;
                });
            }
        } catch (error) {
            console.error('deleteEntry failed:', error);
        }
    }, [selectedEntryId]);

    return {
        entries,
        selectedEntry,
        selectedEntryId,
        isLoading,
        selectEntry: setSelectedEntryId,
        createEntry,
        updateEntry,
        deleteEntry,
        refreshEntries: loadEntries,
    };
}
