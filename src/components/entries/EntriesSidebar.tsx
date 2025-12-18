import { useRef, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DateRange } from 'react-day-picker';
import { Text } from '../themed';
import { JournalEntry } from '../../types/entry';
import { groupEntriesByDate } from '../../utils/dateGrouping';
import EntriesToolbar, { TimeFilter } from './EntriesToolbar';

interface EntriesSidebarProps {
  entries: JournalEntry[];
  selectedId: string | null;
  onSelectEntry: (id: string) => void;
}

type ListItem =
  | { type: 'header'; id: string; label: string }
  | { type: 'entry'; id: string; entry: JournalEntry };

export default function EntriesSidebar({
  entries,
  selectedId,
  onSelectEntry,
}: EntriesSidebarProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const handleFilterChange = (filter: TimeFilter | null, customRange?: DateRange) => {
    setTimeFilter(filter);
    setCustomDateRange(customRange);
  };

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
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.content.toLowerCase().includes(query)
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
      return item.type === 'header' ? 45 : 75;
    },
    overscan: 5,
  });

  return (
    <div className="entries-sidebar">
      <EntriesToolbar
        onSearchChange={setSearchQuery}
        onFilterChange={handleFilterChange}
        resultCount={filteredEntries.length}
      />
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
                >
                  <div className="entry-list-item-title">
                    <Text variant="primary">{item.entry.title}</Text>
                  </div>
                  <div className="entry-list-item-preview">
                    <Text variant="secondary">{item.entry.preview}</Text>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
