import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DateRange, DayPicker } from 'react-day-picker';
import { TbPin, TbPinFilled } from 'react-icons/tb';
import { FiPlus, FiEdit2, FiCalendar, FiFeather } from 'react-icons/fi';
import { Text, IconButton, Button, Spinner, TrashButton } from '../themed';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import { parseLocalDate, toDateString, formatEntryDate } from '../../utils/date';
import { matchesTimeFilter } from '../../utils/timeFilters';
import { useSidebar } from '../../contexts/SidebarContext';
import { useFocusMode } from '../../contexts/FocusModeContext';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import EntriesToolbar, { TimeFilter } from './EntriesToolbar';

const {
  FOCUS_MODE_FADE_DELAY_MS,
  FOCUS_MODE_EDGE_THRESHOLD_PX,
  HEADER_HEIGHT_PX,
  ENTRY_ITEM_HEIGHT_PX,
  PAGINATION_THRESHOLD,
  LOADING_INDICATOR_HEIGHT_PX,
  DATE_PICKER_FROM_YEAR,
  DATE_PICKER_TO_YEAR,
} = ENTRIES_CONSTANTS;

interface EntriesSidebarProps {
  entries: JournalEntry[];
  totalCount: number;
  selectedId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, updates: EntryUpdate) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

type ListItem =
  | { type: 'header'; id: string; label: string }
  | { type: 'entry'; id: string; entry: JournalEntry };

export default function EntriesSidebar({
  entries,
  totalCount,
  selectedId,
  onSelectEntry,
  onCreateEntry,
  onDeleteEntry,
  onUpdateEntry,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: EntriesSidebarProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<string | null>(null);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const editButtonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { entriesPinned, toggleEntriesPin } = useSidebar();
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  const [buttonHidden, setButtonHidden] = useState(false);
  const [isNearEdge, setIsNearEdge] = useState(false);

  useEffect(() => {
    if (isFocusMode) {
      setButtonHidden(false);
      const timer = setTimeout(() => setButtonHidden(true), FOCUS_MODE_FADE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    setButtonHidden(false);
    setIsNearEdge(false);
  }, [isFocusMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setIsNearEdge(e.clientX <= FOCUS_MODE_EDGE_THRESHOLD_PX);
  }, []);

  useEffect(() => {
    if (!isFocusMode) return;
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isFocusMode, handleMouseMove]);

  const handleFilterChange = (filter: TimeFilter | null, customRange?: DateRange) => {
    setTimeFilter(filter);
    setCustomDateRange(customRange);
  };

  const handleDateChange = (entryId: string, newDate: Date | undefined) => {
    if (newDate) {
      onUpdateEntry(entryId, { date: toDateString(newDate) });
      setDatePickerOpen(null);
      setMoreMenuOpen(null);
    }
  };

  const handleMoreClick = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    setMoreMenuOpen(moreMenuOpen === entryId ? null : entryId);
    setDatePickerOpen(null);
  };

  const handleChangeDateClick = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    const buttonRef = editButtonRefs.current.get(entryId);
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDatePickerPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setDatePickerOpen(entryId);
    setMoreMenuOpen(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setDatePickerOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen, datePickerOpen]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    if (timeFilter) {
      if (timeFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
        const { from, to } = customDateRange;
        const rangeStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        const rangeEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate());
        filtered = filtered.filter((entry) => {
          const entryDay = parseLocalDate(entry.date);
          return entryDay >= rangeStart && entryDay <= rangeEnd;
        });
      } else if (timeFilter === 'this-year') {
        const currentYear = new Date().getFullYear();
        filtered = filtered.filter((entry) => {
          const entryDay = parseLocalDate(entry.date);
          return entryDay.getFullYear() === currentYear;
        });
      } else if (timeFilter !== 'custom') {
        filtered = filtered.filter((entry) => matchesTimeFilter(entry.date, timeFilter));
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => entry.content.toLowerCase().includes(query));
    }

    return filtered;
  }, [entries, searchQuery, timeFilter, customDateRange]);

  const groupedEntries = groupEntriesByDate(filteredEntries);

  const flattenedItems = useMemo(() => {
    const items: ListItem[] = [];
    groupedEntries.forEach((groupEntries, groupLabel) => {
      items.push({ type: 'header', id: `header-${groupLabel}`, label: groupLabel });
      groupEntries.forEach(entry => {
        items.push({ type: 'entry', id: entry.id, entry });
      });
    });
    return items;
  }, [groupedEntries]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      return item.type === 'header' ? HEADER_HEIGHT_PX : ENTRY_ITEM_HEIGHT_PX;
    },
    overscan: 5,
  });

  const isFiltering = searchQuery.trim() || timeFilter;

  useEffect(() => {
    if (isFiltering || !hasMore || isLoadingMore) return;

    const virtualItems = virtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= flattenedItems.length - PAGINATION_THRESHOLD) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), hasMore, isLoadingMore, onLoadMore, flattenedItems.length, isFiltering]);

  const sidebarClassName = [
    'entries-sidebar',
    entriesPinned && 'pinned',
    (isDropdownOpen || datePickerOpen || moreMenuOpen) && 'dropdown-open',
  ].filter(Boolean).join(' ');

  const focusModeButtonClassName = [
    'focus-mode-button',
    isFocusMode && 'active',
    buttonHidden && 'hidden',
    isNearEdge && 'near-edge',
  ].filter(Boolean).join(' ');

  return (
    <div className={sidebarClassName}>
      <div className="entries-sidebar-action-bar">
        <IconButton
          icon={<FiFeather size={16} />}
          label={isFocusMode ? "Exit focus mode (ESC)" : "Focus mode (⌘⇧F)"}
          variant="ghost"
          size="sm"
          onClick={toggleFocusMode}
          className={focusModeButtonClassName}
        />
      </div>
      <div className="entries-sidebar-hover-zone">
        <div className="entries-sidebar-collapsed-content">
          <Text variant="muted" className="entries-collapsed-label">
            {totalCount}
          </Text>
        </div>
        <div className="entries-sidebar-expanded-content">
          <EntriesToolbar
            onSearchChange={setSearchQuery}
            onFilterChange={handleFilterChange}
            resultCount={filteredEntries.length}
            onDropdownOpenChange={setIsDropdownOpen}
            rightAction={
              <div style={{ display: 'flex', gap: '4px' }}>
                <IconButton
                  icon={<FiPlus size={18} />}
                  label="New entry"
                  onClick={onCreateEntry}
                  variant="ghost"
                  size="sm"
                  className="toolbar-button"
                />
                <IconButton
                  icon={entriesPinned ? <TbPinFilled size={18} /> : <TbPin size={18} />}
                  label={entriesPinned ? "Unpin sidebar" : "Pin sidebar"}
                  onClick={toggleEntriesPin}
                  variant="ghost"
                  size="sm"
                  className="toolbar-button"
                />
              </div>
            }
          />
          {entries.length === 0 ? (
            <div className="sidebar-empty-state">
              <Text variant="secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>No entries yet</Text>
              <Text variant="muted" style={{ fontSize: '0.8125rem' }}>Start journaling today</Text>
              <Button
                variant="primary"
                size="sm"
                icon={<FiPlus size={14} />}
                onClick={onCreateEntry}
              >
                Create your first entry
              </Button>
            </div>
          ) : (
            <div ref={parentRef} className="entries-sidebar-list">
              <div
                style={{
                  height: `${virtualizer.getTotalSize() + (isLoadingMore ? LOADING_INDICATOR_HEIGHT_PX : 0)}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = flattenedItems[virtualItem.index];

                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      {item.type === 'header' ? (
                        <div className="entry-group-header">
                          <Text variant="muted">{item.label}</Text>
                        </div>
                      ) : (
                        <div
                          className={`entry-list-item ${selectedId === item.id ? 'selected' : ''}`}
                          onClick={() => onSelectEntry(item.id)}
                          onMouseLeave={() => {
                            if (moreMenuOpen === item.id) setMoreMenuOpen(null);
                          }}
                        >
                          <div className="entry-list-item-content">
                            <div className="entry-list-item-date">
                              <Text variant="muted">{formatEntryDate(item.entry.date)}</Text>
                            </div>
                            <div className="entry-list-item-preview">
                              <Text variant="secondary">{item.entry.preview}</Text>
                            </div>
                          </div>
                          <div className="entry-list-item-actions">
                            <div
                              className="more-button-wrapper"
                              ref={(el) => {
                                if (el) editButtonRefs.current.set(item.id, el);
                                if (moreMenuOpen === item.id && el) moreMenuRef.current = el;
                              }}
                            >
                              <IconButton
                                icon={<FiEdit2 size={12} />}
                                label="Edit options"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleMoreClick(e, item.id)}
                                style={{ minWidth: '24px', minHeight: '24px', padding: '4px' }}
                              />
                              {moreMenuOpen === item.id && (
                                <div className="entry-more-dropdown">
                                  <button
                                    className="entry-more-option"
                                    onClick={(e) => handleChangeDateClick(e, item.id)}
                                  >
                                    <FiCalendar size={14} />
                                    <span>Change Date</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <TrashButton
                              label="Delete entry"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEntry(item.id);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoadingMore && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${LOADING_INDICATOR_HEIGHT_PX}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Spinner size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {datePickerOpen && createPortal(
        <div
          ref={datePickerRef}
          className="entry-date-picker-dropdown"
          style={{
            position: 'fixed',
            top: `${datePickerPosition.top}px`,
            left: `${datePickerPosition.left}px`,
          }}
        >
          <DayPicker
            mode="single"
            selected={(() => {
              const entry = entries.find(e => e.id === datePickerOpen);
              return entry ? parseLocalDate(entry.date) : undefined;
            })()}
            onSelect={(date) => handleDateChange(datePickerOpen, date)}
            defaultMonth={(() => {
              const entry = entries.find(e => e.id === datePickerOpen);
              return entry ? parseLocalDate(entry.date) : new Date();
            })()}
            numberOfMonths={1}
            className="custom-day-picker"
            captionLayout="dropdown"
            fromYear={DATE_PICKER_FROM_YEAR}
            toYear={DATE_PICKER_TO_YEAR}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
