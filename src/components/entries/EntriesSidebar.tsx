import { useRef, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DateRange, DayPicker } from 'react-day-picker';
import { TbPin, TbPinFilled } from 'react-icons/tb';
import { FiPlus, FiTrash2, FiEdit2, FiCalendar } from 'react-icons/fi';
import { Text, IconButton } from '../themed';
import { JournalEntry, EntryUpdate } from '../../types/entry';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import { formatEntryDate } from '../../utils/dateFormatting';
import { useSidebar } from '../../contexts/SidebarContext';
import EntriesToolbar, { TimeFilter } from './EntriesToolbar';

interface EntriesSidebarProps {
  entries: JournalEntry[];
  selectedId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, updates: EntryUpdate) => void;
}

type ListItem =
  | { type: 'header'; id: string; label: string }
  | { type: 'entry'; id: string; entry: JournalEntry };

export default function EntriesSidebar({
  entries,
  selectedId,
  onSelectEntry,
  onCreateEntry,
  onDeleteEntry,
  onUpdateEntry,
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

  const handleFilterChange = (filter: TimeFilter | null, customRange?: DateRange) => {
    setTimeFilter(filter);
    setCustomDateRange(customRange);
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (entryId: string, newDate: Date | undefined) => {
    if (newDate) {
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      onUpdateEntry(entryId, { date: dateStr });
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
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.date);
        const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

        switch (timeFilter) {
          case 'custom': {
            if (customDateRange?.from && customDateRange?.to) {
              const rangeStart = new Date(customDateRange.from.getFullYear(), customDateRange.from.getMonth(), customDateRange.from.getDate());
              const rangeEnd = new Date(customDateRange.to.getFullYear(), customDateRange.to.getMonth(), customDateRange.to.getDate());
              return entryDay >= rangeStart && entryDay <= rangeEnd;
            }
            return true;
          }
          case 'today':
            return entryDay.getTime() === today.getTime();
          case 'yesterday': {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return entryDay.getTime() === yesterday.getTime();
          }
          case 'this-week': {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            return entryDay >= weekStart && entryDay <= today;
          }
          case 'last-week': {
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1);
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekStart.getDate() - 6);
            return entryDay >= lastWeekStart && entryDay <= lastWeekEnd;
          }
          case 'this-month':
            return (
              entryDate.getMonth() === now.getMonth() &&
              entryDate.getFullYear() === now.getFullYear()
            );
          case 'last-month': {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return (
              entryDate.getMonth() === lastMonth.getMonth() &&
              entryDate.getFullYear() === lastMonth.getFullYear()
            );
          }
          case 'this-year':
            return entryDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) => entry.content.toLowerCase().includes(query)
      );
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
      return item.type === 'header' ? 40 : 64;
    },
    overscan: 5,
  });

  return (
    <div className={`entries-sidebar ${entriesPinned ? 'pinned' : ''} ${isDropdownOpen || datePickerOpen || moreMenuOpen ? 'dropdown-open' : ''}`}>
      <div className="entries-sidebar-collapsed-content">
        <Text variant="muted" className="entries-collapsed-label">
          HISTORY
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
                icon={<FiPlus />}
                label="New entry"
                onClick={() => onCreateEntry()}
                variant="ghost"
                size="sm"
              />
              <IconButton
                icon={entriesPinned ? <TbPinFilled /> : <TbPin />}
                label={entriesPinned ? "Unpin sidebar" : "Pin sidebar"}
                onClick={toggleEntriesPin}
                variant="ghost"
                size="sm"
              />
            </div>
          }
        />
        {entries.length === 0 ? (
          <div className="sidebar-empty-state">
            <Text variant="secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>No entries yet</Text>
            <Text variant="muted" style={{ fontSize: '0.8125rem' }}>Start journaling today</Text>
            <button className="sidebar-empty-state-action" onClick={() => onCreateEntry()}>
              <FiPlus size={14} />
              Create your first entry
            </button>
          </div>
        ) : (
          <div ref={parentRef} className="entries-sidebar-list">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
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
                          <div className="delete-button-wrapper">
                            <IconButton
                              icon={<FiTrash2 size={12} />}
                              label="Delete entry"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteEntry(item.id);
                              }}
                              style={{ minWidth: '24px', minHeight: '24px', padding: '4px' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            fromYear={2020}
            toYear={2030}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
