import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
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
import 'react-day-picker/style.css';

type View = 'list' | 'editor';

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
    threshold: 70,
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
        onBack={handleBack}
        onUpdate={updateEntry}
        onDelete={handleDelete}
      />
    );
  }

  const pullProgress = Math.min(pullDistance / 70, 1);

  const pullIndicatorStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: `${pullDistance}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: isPulling ? 'none' : 'height 0.3s cubic-bezier(0.2, 0, 0, 1)',
  };

  const indicatorContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: canRelease ? theme.colors.text.primary : 'transparent',
    transition: isPulling ? 'none' : 'background-color 0.2s ease-out, transform 0.2s ease-out',
    transform: `scale(${0.8 + pullProgress * 0.2})`,
  };

  const indicatorIconStyle: CSSProperties = {
    color: canRelease ? theme.colors.background.primary : theme.colors.text.muted,
    transform: `rotate(${pullProgress * 180}deg)`,
    transition: isPulling ? 'color 0.2s ease-out' : 'transform 0.2s ease-out, color 0.2s ease-out',
    animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
  };

  const listContainerStyle: CSSProperties = {
    transform: `translateY(${pullDistance}px)`,
    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
  };

  return (
    <div
      className="mobile-entries-container"
      style={{ backgroundColor: theme.colors.background.primary, position: 'relative' }}
      {...pullHandlers}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div style={pullIndicatorStyle}>
          <div style={indicatorContainerStyle}>
            <IoRefresh size={20} style={indicatorIconStyle} />
          </div>
        </div>
      )}

      <div style={listContainerStyle}>
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
            <Text variant="muted" style={{ fontSize: '1rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '16px' }}>
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
