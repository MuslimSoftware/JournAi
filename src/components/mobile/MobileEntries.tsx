import { useState, useRef, useEffect, CSSProperties } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { useEntries } from '../../hooks/useEntries';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Button, Spinner, Input } from '../themed';
import SwipeableListItem from './SwipeableListItem';
import MobileEntryEditor from './MobileEntryEditor';
import BottomSheet from './BottomSheet';
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
  } = useEntries();

  const handleEntrySelect = (id: string) => {
    selectEntry(id);
    setView('editor');
  };

  const handleBack = () => {
    setView('list');
  };

  const handleCreate = async () => {
    await createEntry();
    setView('editor');
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    if (selectedEntryId === id) {
      setView('list');
    }
  };

  const handleEditDate = (entry: JournalEntry) => {
    setEditingDateEntry(entry);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (date && editingDateEntry) {
      const newDate = format(date, 'yyyy-MM-dd');
      await updateEntry(editingDateEntry.id, { date: newDate });
      setEditingDateEntry(null);
    }
  };

  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchOpen = () => {
    setIsSearching(true);
  };

  const handleSearchClose = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

  const filteredEntries = searchQuery.trim()
    ? entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  const groupedEntries = groupEntriesByDate(filteredEntries);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (view === 'editor' && selectedEntry) {
    return (
      <MobileEntryEditor
        entry={selectedEntry}
        onBack={handleBack}
        onUpdate={updateEntry}
      />
    );
  }

  const headerStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: theme.colors.background.primary,
  };

  const searchRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '8px 16px 4px',
  };

  const searchBarContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    overflow: 'hidden',
    maxHeight: isSearching ? '60px' : '0px',
    opacity: isSearching ? 1 : 0,
    padding: isSearching ? '0 16px 12px' : '0 16px',
    transition: 'max-height 0.25s ease-out, opacity 0.2s ease-out, padding 0.25s ease-out',
  };

  const searchInputStyle: CSSProperties = {
    flex: 1,
    padding: '10px 14px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
    outline: 'none',
    WebkitAppearance: 'none',
  };

  const cancelButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '8px',
    color: theme.colors.text.accent,
    fontSize: '1rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const iconButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '8px',
    color: theme.colors.text.muted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const listStyle: CSSProperties = {
    padding: '0 0 80px 0',
  };

  const groupHeaderStyle: CSSProperties = {
    padding: '24px 16px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const getEntryItemStyle = (entryId: string): CSSProperties => ({
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: pressedEntryId === entryId ? theme.colors.background.secondary : 'transparent',
    transition: 'background-color 0.1s ease-out',
    borderRadius: '8px',
    margin: '0 8px',
  });

  const entryDateStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: theme.colors.text.muted,
  };

  const entryPreviewStyle: CSSProperties = {
    fontSize: '1rem',
    color: theme.colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  };

  const emptyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    padding: '24px',
    textAlign: 'center',
  };

  const noResultsStyle: CSSProperties = {
    padding: '40px 24px',
    textAlign: 'center',
  };

  return (
    <div style={{ height: '100%', backgroundColor: theme.colors.background.primary, display: 'flex', flexDirection: 'column' }}>
      {entries.length > 0 && (
        <header style={headerStyle}>
          {!isSearching && (
            <div style={searchRowStyle}>
              <button onClick={handleSearchOpen} style={iconButtonStyle} aria-label="Search">
                <FiSearch size={20} />
              </button>
            </div>
          )}
          <div style={searchBarContainerStyle}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <FiSearch
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: theme.colors.text.muted,
                  pointerEvents: 'none',
                }}
              />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries..."
                style={{
                  ...searchInputStyle,
                  paddingLeft: '40px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    ...iconButtonStyle,
                    position: 'absolute',
                    right: '4px',
                  }}
                  aria-label="Clear search"
                >
                  <FiX size={18} />
                </button>
              )}
            </div>
            <button onClick={handleSearchClose} style={cancelButtonStyle}>
              Cancel
            </button>
          </div>
        </header>
      )}

      {entries.length === 0 ? (
        <div style={emptyStyle}>
          <Text variant="muted" style={{ fontSize: '1rem' }}>
            Start your journal
          </Text>
          <Button variant="primary" onClick={handleCreate}>
            New Entry
          </Button>
        </div>
      ) : (
        <div style={{ ...listStyle, flex: 1, overflowY: 'auto' }}>
          {filteredEntries.length === 0 && searchQuery ? (
            <div style={noResultsStyle}>
              <Text variant="muted">No entries found for "{searchQuery}"</Text>
            </div>
          ) : (
            Array.from(groupedEntries).map(([group, groupEntries]) => (
              <div key={group}>
                <div style={groupHeaderStyle}>{group}</div>
                {groupEntries.map((entry) => (
                  <SwipeableListItem
                    key={entry.id}
                    onDelete={() => handleDelete(entry.id)}
                    onEditDate={() => handleEditDate(entry)}
                  >
                    <div
                      style={getEntryItemStyle(entry.id)}
                      onClick={() => handleEntrySelect(entry.id)}
                      onTouchStart={() => setPressedEntryId(entry.id)}
                      onTouchEnd={() => setPressedEntryId(null)}
                      onTouchCancel={() => setPressedEntryId(null)}
                    >
                      <span style={entryDateStyle}>{formatEntryDate(entry.date)}</span>
                      <span style={entryPreviewStyle}>{entry.preview}</span>
                    </div>
                  </SwipeableListItem>
                ))}
              </div>
            ))
          )}
        </div>
      )}

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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '16px',
        }}>
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
