import { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { IoRefresh } from 'react-icons/io5';
import { useEntries } from '../../hooks/useEntries';
import { useTheme } from '../../contexts/ThemeContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { hapticImpact, hapticSelection } from '../../hooks/useHaptics';
import { Text, Button, Input } from '../themed';
import SwipeableListItem from './SwipeableListItem';
import MobileEntryEditor from './MobileEntryEditor';
import BottomSheet from './BottomSheet';
import { SkeletonEntryList } from './Skeleton';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import { formatEntryDate } from '../../utils/date';
import type { JournalEntry } from '../../types/entry';
import '../../styles/mobile.css';
import 'react-day-picker/style.css';

type View = 'list' | 'editor';

const PULL_THRESHOLD = 70;

export default function MobileEntries() {
  const { theme } = useTheme();
  const [view, setView] = useState<View>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDateEntry, setEditingDateEntry] = useState<JournalEntry | null>(null);
  const [pressedEntryId, setPressedEntryId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    entries,
    selectedEntry,
    selectedEntryId,
    highlightRange,
    clearHighlight,
    isLoading,
    selectEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  } = useEntries();

  const handleRefresh = useCallback(async () => {
    await refreshEntries();
  }, [refreshEntries]);

  const {
    pullDistance,
    isRefreshing,
    isPulling,
    canRelease,
    handlers: pullHandlers,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: PULL_THRESHOLD,
    maxPull: 100,
    disabled: isSearching || view !== 'list',
  });

  const handleEntrySelect = useCallback((id: string) => {
    hapticSelection();
    selectEntry(id);
    setView('editor');
  }, [selectEntry]);

  const handleBack = useCallback(() => {
    setView('list');
  }, []);

  const handleCreate = useCallback(async () => {
    hapticImpact('light');
    await createEntry();
    setView('editor');
  }, [createEntry]);

  const handleDelete = useCallback(async (id: string) => {
    hapticImpact('medium');
    await deleteEntry(id);
    if (selectedEntryId === id) {
      setView('list');
    }
  }, [deleteEntry, selectedEntryId]);

  const handleEditDate = useCallback((entry: JournalEntry) => {
    hapticSelection();
    setEditingDateEntry(entry);
  }, []);

  const handleDateSelect = useCallback(async (date: Date | undefined) => {
    if (date && editingDateEntry) {
      const newDate = format(date, 'yyyy-MM-dd');
      await updateEntry(editingDateEntry.id, { date: newDate });
      hapticImpact('light');
      setEditingDateEntry(null);
    }
  }, [editingDateEntry, updateEntry]);

  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchOpen = useCallback(() => {
    hapticSelection();
    setIsSearching(true);
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearching(false);
    setSearchQuery('');
  }, []);

  const filteredEntries = searchQuery.trim()
    ? entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  const groupedEntries = groupEntriesByDate(filteredEntries);

  if (isLoading) {
    return (
      <div
        className="mobile-entries-container"
        style={{ backgroundColor: theme.colors.background.primary }}
      >
        <SkeletonEntryList count={6} />
      </div>
    );
  }

  if (view === 'editor' && selectedEntry) {
    return (
      <MobileEntryEditor
        entry={selectedEntry}
        highlightRange={highlightRange}
        onBack={handleBack}
        onUpdate={updateEntry}
        onDelete={handleDelete}
        onClearHighlight={clearHighlight}
      />
    );
  }

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const pullIndicatorClass = `mobile-pull-indicator${isPulling ? '' : ' mobile-pull-indicator--animated'}`;
  const pullIconContainerClass = `mobile-pull-icon-container${canRelease ? ' mobile-pull-icon-container--can-release' : ''}${isPulling ? '' : ' mobile-pull-icon-container--animated'}`;
  const pullIconClass = `mobile-pull-icon${isPulling ? '' : ' mobile-pull-icon--animated'}${canRelease ? ' mobile-pull-icon--can-release' : ''}`;
  const listClass = `mobile-list-transform${isPulling ? '' : ' mobile-list-transform--animated'}`;

  return (
    <div
      className="mobile-entries-container"
      style={{ backgroundColor: theme.colors.background.primary, position: 'relative' }}
      {...pullHandlers}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className={pullIndicatorClass}
          style={{ height: `${pullDistance}px` }}
        >
          <div
            className={pullIconContainerClass}
            style={{ transform: `scale(${0.8 + pullProgress * 0.2})` }}
          >
            <IoRefresh
              size={20}
              className={pullIconClass}
              style={{
                color: canRelease ? theme.colors.background.primary : theme.colors.text.muted,
                transform: `rotate(${pullProgress * 180}deg)`,
                animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
          </div>
        </div>
      )}

      <div
        className={listClass}
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {entries.length > 0 && (
          <header
            className="mobile-entries-header"
            style={{ backgroundColor: theme.colors.background.primary }}
          >
            {!isSearching && (
              <div className="mobile-search-row">
                <button
                  onClick={handleSearchOpen}
                  className="mobile-icon-button"
                  style={{ color: theme.colors.text.muted }}
                  aria-label="Search"
                >
                  <FiSearch size={20} />
                </button>
              </div>
            )}
            <div className={`mobile-search-bar-container ${isSearching ? 'expanded' : ''}`}>
              <div className="mobile-search-input-wrapper">
                <FiSearch
                  size={18}
                  className="mobile-search-input-icon"
                  style={{ color: theme.colors.text.muted }}
                />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="mobile-search-input"
                  style={{
                    backgroundColor: theme.colors.background.secondary,
                    color: theme.colors.text.primary,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mobile-search-clear"
                    style={{ color: theme.colors.text.muted }}
                    aria-label="Clear search"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearchClose}
                className="mobile-cancel-button"
                style={{ color: theme.colors.text.accent }}
              >
                Cancel
              </button>
            </div>
          </header>
        )}

        {entries.length === 0 ? (
          <div className="mobile-entries-empty">
            <Text variant="muted" className="mobile-empty-text">
              Start your journal
            </Text>
            <Button variant="primary" onClick={handleCreate}>
              New Entry
            </Button>
          </div>
        ) : (
          <div className="mobile-entries-list">
            {filteredEntries.length === 0 && searchQuery ? (
              <div className="mobile-no-results">
                <Text variant="muted">No entries found for "{searchQuery}"</Text>
              </div>
            ) : (
              Array.from(groupedEntries).map(([group, groupEntries]) => (
                <div key={group}>
                  <div
                    className="mobile-entry-group-header"
                    style={{ color: theme.colors.text.muted }}
                  >
                    {group}
                  </div>
                  {groupEntries.map((entry) => (
                    <SwipeableListItem
                      key={entry.id}
                      onDelete={() => handleDelete(entry.id)}
                      onEditDate={() => handleEditDate(entry)}
                    >
                      <div
                        className={`mobile-entry-item ${pressedEntryId === entry.id ? 'pressed' : ''}`}
                        onClick={() => handleEntrySelect(entry.id)}
                        onTouchStart={() => setPressedEntryId(entry.id)}
                        onTouchEnd={() => setPressedEntryId(null)}
                        onTouchCancel={() => setPressedEntryId(null)}
                      >
                        <span
                          className="mobile-entry-date"
                          style={{ color: theme.colors.text.muted }}
                        >
                          {formatEntryDate(entry.date)}
                        </span>
                        <span
                          className="mobile-entry-preview"
                          style={{ color: theme.colors.text.primary }}
                        >
                          {entry.preview}
                        </span>
                      </div>
                    </SwipeableListItem>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {entries.length > 0 && !isSearching && (
        <button
          className="mobile-fab"
          style={{
            backgroundColor: theme.colors.text.primary,
            color: theme.colors.background.primary,
          }}
          onClick={handleCreate}
          aria-label="New entry"
        >
          <FiPlus size={24} />
        </button>
      )}

      <BottomSheet
        isOpen={!!editingDateEntry}
        onClose={() => setEditingDateEntry(null)}
        title="Change Date"
      >
        <div className="mobile-date-picker-container">
          <DayPicker
            mode="single"
            selected={editingDateEntry ? parseISO(editingDateEntry.date) : undefined}
            onSelect={handleDateSelect}
            defaultMonth={editingDateEntry ? parseISO(editingDateEntry.date) : undefined}
            style={{
              '--rdp-accent-color': theme.colors.text.accent,
              '--rdp-background-color': theme.colors.background.secondary,
            } as React.CSSProperties}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
