import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { FiPlus, FiSearch, FiX, FiCheck, FiClock, FiRefreshCw } from 'react-icons/fi';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import { formatEntryDate } from '../../utils/date';
import { getInsightCountForEntry, EntryInsightCount } from '../../services/analytics';
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
  const [insightCounts, setInsightCounts] = useState<Map<string, EntryInsightCount>>(new Map());
  const [tooltipEntryId, setTooltipEntryId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const statusIndicatorRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

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

  const getProcessingStatus = (entry: JournalEntry): 'analyzed' | 'unprocessed' | 'needs-reanalysis' => {
    if (entry.processedAt) {
      return 'analyzed';
    }
    if (entry.contentHash) {
      return 'needs-reanalysis';
    }
    return 'unprocessed';
  };

  const handleStatusIndicatorClick = async (e: React.MouseEvent | React.TouchEvent, entry: JournalEntry) => {
    e.stopPropagation();
    hapticSelection();
    const indicatorRef = statusIndicatorRefs.current.get(entry.id);
    if (indicatorRef) {
      const rect = indicatorRef.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 4,
        left: Math.max(10, rect.left - 40),
      });
    }

    if (tooltipEntryId === entry.id) {
      setTooltipEntryId(null);
      return;
    }

    setTooltipEntryId(entry.id);

    if (!insightCounts.has(entry.id) && entry.processedAt) {
      const count = await getInsightCountForEntry(entry.id);
      setInsightCounts(prev => new Map(prev).set(entry.id, count));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (tooltipEntryId && !target.closest('.entry-status-tooltip') && !target.closest('.mobile-entry-status')) {
        setTooltipEntryId(null);
      }
    };
    if (tooltipEntryId) {
      document.addEventListener('touchstart', handleClickOutside as EventListener);
      document.addEventListener('mousedown', handleClickOutside as EventListener);
      return () => {
        document.removeEventListener('touchstart', handleClickOutside as EventListener);
        document.removeEventListener('mousedown', handleClickOutside as EventListener);
      };
    }
  }, [tooltipEntryId]);

  const renderStatusIndicator = (entry: JournalEntry) => {
    const status = getProcessingStatus(entry);

    const handleRef = (el: HTMLSpanElement | null) => {
      if (el) statusIndicatorRefs.current.set(entry.id, el);
    };

    if (status === 'analyzed') {
      return (
        <span
          ref={handleRef}
          className="mobile-entry-status mobile-entry-status-analyzed mobile-entry-status-clickable"
          title="Click to see insights"
          onClick={(e) => handleStatusIndicatorClick(e, entry)}
        >
          <FiCheck size={10} />
        </span>
      );
    }
    if (status === 'needs-reanalysis') {
      return (
        <span
          ref={handleRef}
          className="mobile-entry-status mobile-entry-status-needs-reanalysis mobile-entry-status-clickable"
          title="Needs re-analysis"
          onClick={(e) => handleStatusIndicatorClick(e, entry)}
        >
          <FiRefreshCw size={10} />
        </span>
      );
    }
    return (
      <span
        ref={handleRef}
        className="mobile-entry-status mobile-entry-status-unprocessed mobile-entry-status-clickable"
        title="Not yet analyzed"
        onClick={(e) => handleStatusIndicatorClick(e, entry)}
      >
        <FiClock size={10} />
      </span>
    );
  };

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
                        <div className="mobile-entry-date-row">
                          <span
                            className="mobile-entry-date"
                            style={{ color: theme.colors.text.muted }}
                          >
                            {formatEntryDate(entry.date)}
                          </span>
                          {renderStatusIndicator(entry)}
                        </div>
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

      {tooltipEntryId && createPortal(
        <div
          className="entry-status-tooltip"
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {(() => {
            const entry = entries.find(e => e.id === tooltipEntryId);
            if (!entry) return null;
            const status = getProcessingStatus(entry);
            const counts = insightCounts.get(entry.id);

            if (status === 'unprocessed') {
              return <span>Not yet analyzed</span>;
            }
            if (status === 'needs-reanalysis') {
              return <span>Needs re-analysis</span>;
            }
            if (counts) {
              return (
                <div className="entry-status-tooltip-content">
                  <div className="entry-status-tooltip-row">
                    <span>{counts.total} insight{counts.total !== 1 ? 's' : ''}</span>
                  </div>
                  {counts.emotions > 0 && (
                    <div className="entry-status-tooltip-detail">
                      {counts.emotions} emotion{counts.emotions !== 1 ? 's' : ''}
                    </div>
                  )}
                  {counts.people > 0 && (
                    <div className="entry-status-tooltip-detail">
                      {counts.people} {counts.people !== 1 ? 'people' : 'person'}
                    </div>
                  )}
                </div>
              );
            }
            return <span>Loading...</span>;
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}
