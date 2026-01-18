import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { FiEdit2, FiCalendar, FiFeather, FiCheck, FiClock, FiRefreshCw } from 'react-icons/fi';
import { Text, IconButton, TrashButton } from '../themed';
import { NestedSidebar } from '../shared';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { parseLocalDate, toDateString, formatEntryDate } from '../../utils/date';
import { useSidebar } from '../../contexts/SidebarContext';
import { useFocusMode } from '../../contexts/FocusModeContext';
import { useEntriesState } from '../../contexts/EntriesStateContext';
import { ENTRIES_CONSTANTS } from '../../constants/entries';
import EntriesToolbar, { TimeFilter } from './EntriesToolbar';
import { DateRange } from 'react-day-picker';
import { matchesTimeFilter } from '../../utils/timeFilters';
import '../../styles/nested-sidebar.css';

const {
  FOCUS_MODE_FADE_DELAY_MS,
  FOCUS_MODE_EDGE_THRESHOLD_PX,
  ENTRY_ITEM_HEIGHT_PX,
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
  const { state: entriesState, setScrollOffset } = useEntriesState();
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

  const filteredEntries = (() => {
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

    return filtered;
  })();

  const focusModeButtonClassName = [
    'focus-mode-button',
    isFocusMode && 'active',
    buttonHidden && 'hidden',
    isNearEdge && 'near-edge',
  ].filter(Boolean).join(' ');

  const getProcessingStatus = (entry: JournalEntry): 'analyzed' | 'unprocessed' | 'needs-reanalysis' => {
    if (entry.processedAt) {
      return 'analyzed';
    }
    if (entry.contentHash) {
      return 'needs-reanalysis';
    }
    return 'unprocessed';
  };

  const renderStatusIndicator = (entry: JournalEntry) => {
    const status = getProcessingStatus(entry);

    if (status === 'analyzed') {
      return (
        <span className="entry-status-indicator entry-status-analyzed" title="Analyzed">
          <FiCheck size={10} />
        </span>
      );
    }
    if (status === 'needs-reanalysis') {
      return (
        <span className="entry-status-indicator entry-status-needs-reanalysis" title="Needs re-analysis">
          <FiRefreshCw size={10} />
        </span>
      );
    }
    return (
      <span className="entry-status-indicator entry-status-unprocessed" title="Unprocessed">
        <FiClock size={10} />
      </span>
    );
  };

  const renderEntryItem = (entry: JournalEntry) => (
    <>
      <div className="entry-list-item-content">
        <div className="entry-list-item-date">
          <Text variant="muted">{formatEntryDate(entry.date)}</Text>
          {renderStatusIndicator(entry)}
        </div>
        <div className="entry-list-item-preview">
          <Text variant="secondary">{entry.preview}</Text>
        </div>
      </div>
      <div className="nested-sidebar-item-actions">
        <div
          className="more-button-wrapper"
          ref={(el) => {
            if (el) editButtonRefs.current.set(entry.id, el);
            if (moreMenuOpen === entry.id && el) moreMenuRef.current = el;
          }}
        >
          <IconButton
            icon={<FiEdit2 size={12} />}
            label="Edit options"
            variant="ghost"
            size="sm"
            onClick={(e) => handleMoreClick(e, entry.id)}
            style={{ minWidth: '24px', minHeight: '24px', padding: '4px' }}
          />
          {moreMenuOpen === entry.id && (
            <div className="entry-more-dropdown">
              <button
                className="entry-more-option"
                onClick={(e) => handleChangeDateClick(e, entry.id)}
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
            onDeleteEntry(entry.id);
          }}
        />
      </div>
    </>
  );

  const actionBarContent = (
    <IconButton
      icon={<FiFeather size={16} />}
      label={isFocusMode ? "Exit focus mode (ESC)" : "Focus mode (⌘⇧F)"}
      variant="ghost"
      size="sm"
      onClick={toggleFocusMode}
      className={focusModeButtonClassName}
    />
  );

  return (
    <>
      <NestedSidebar
        items={filteredEntries}
        totalCount={totalCount}
        selectedId={selectedId}
        onSelectItem={onSelectEntry}
        onCreateItem={onCreateEntry}
        hasMore={hasMore && !timeFilter}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        pinned={entriesPinned || isDropdownOpen || !!datePickerOpen || !!moreMenuOpen}
        onTogglePin={toggleEntriesPin}
        getId={(entry) => entry.id}
        getDateValue={(entry) => entry.date}
        getSearchableText={(entry) => entry.content}
        renderItem={renderEntryItem}
        className={`entries-sidebar ${(isDropdownOpen || datePickerOpen || moreMenuOpen) ? 'dropdown-open' : ''}`}
        emptyStateTitle="No entries yet"
        emptyStateSubtitle="Start journaling today"
        emptyStateButtonText="Create your first entry"
        searchPlaceholder="Search entries..."
        createButtonLabel="New entry"
        itemName="entry"
        itemNamePlural="entries"
        itemHeight={ENTRY_ITEM_HEIGHT_PX}
        actionBar={actionBarContent}
        onItemMouseLeave={(id) => {
          if (moreMenuOpen === id) setMoreMenuOpen(null);
        }}
        toolbarExtra={
          <EntriesToolbar
            onSearchChange={() => {}}
            onFilterChange={handleFilterChange}
            resultCount={filteredEntries.length}
            onDropdownOpenChange={setIsDropdownOpen}
            hideSearch
          />
        }
        initialScrollOffset={entriesState.scrollOffset}
        onScrollChange={setScrollOffset}
      />

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
    </>
  );
}
