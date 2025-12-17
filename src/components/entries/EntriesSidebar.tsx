import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Text } from '../themed';
import { JournalEntry } from '../../types/entry';
import { groupEntriesByDate } from '../../utils/dateGrouping';

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
  const groupedEntries = groupEntriesByDate(entries);

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
    <div ref={parentRef} className="entries-sidebar">
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
  );
}
