import { useRef, useMemo, useState, useEffect, useCallback, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TbPin, TbPinFilled } from 'react-icons/tb';
import { FiPlus } from 'react-icons/fi';
import { IoSearch, IoClose } from 'react-icons/io5';
import { Text, IconButton, Button, Spinner, Input } from '../themed';

const HEADER_HEIGHT_PX = 40;
const ITEM_HEIGHT_PX = 64;
const PAGINATION_THRESHOLD = 10;
const LOADING_INDICATOR_HEIGHT_PX = 40;

type ListItem<T> =
  | { type: 'header'; id: string; label: string }
  | { type: 'item'; id: string; item: T };

interface NestedSidebarProps<T> {
  items: T[];
  totalCount: number;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onCreateItem: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;

  pinned: boolean;
  onTogglePin: () => void;

  getId: (item: T) => string;
  getDateValue: (item: T) => string;
  getSearchableText: (item: T) => string;
  renderItem: (item: T, isSelected: boolean) => ReactNode;

  className?: string;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  emptyStateButtonText: string;
  searchPlaceholder: string;
  createButtonLabel: string;
  itemName: string;
  itemNamePlural: string;

  toolbarExtra?: ReactNode;
  itemHeight?: number;
  actionBar?: ReactNode;
}

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    const [year, month, day] = timestamp.split('-').map(Number);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const itemDay = new Date(date);
  itemDay.setHours(0, 0, 0, 0);

  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  if (itemDay >= startOfWeek && itemDay < today) return 'This Week';

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  if (itemDay >= startOfLastWeek && itemDay < startOfWeek) return 'Last Week';

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (itemDay >= startOfMonth && itemDay < startOfLastWeek) return 'This Month';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  return year < currentYear ? `${month} ${year}` : month;
}

function groupItemsByDate<T>(
  items: T[],
  getDateValue: (item: T) => string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  items.forEach(item => {
    const group = getDateGroup(getDateValue(item));
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)?.push(item);
  });

  const sortedGroups = new Map<string, T[]>();
  const recentGroups = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month'];

  recentGroups.forEach(group => {
    if (groups.has(group)) {
      sortedGroups.set(group, groups.get(group)!);
      groups.delete(group);
    }
  });

  const monthGroups = Array.from(groups.entries()).sort((a, b) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const parseMonthYear = (str: string) => {
      const parts = str.split(' ');
      const monthIndex = monthNames.indexOf(parts[0]);
      const year = parts[1] ? parseInt(parts[1]) : new Date().getFullYear();
      return new Date(year, monthIndex, 1);
    };
    return parseMonthYear(b[0]).getTime() - parseMonthYear(a[0]).getTime();
  });

  monthGroups.forEach(([key, value]) => {
    sortedGroups.set(key, value);
  });

  return sortedGroups;
}

export default function NestedSidebar<T>({
  items,
  totalCount,
  selectedId,
  onSelectItem,
  onCreateItem,
  hasMore,
  isLoadingMore,
  onLoadMore,
  pinned,
  onTogglePin,
  getId,
  getDateValue,
  getSearchableText,
  renderItem,
  className = '',
  emptyStateTitle,
  emptyStateSubtitle,
  emptyStateButtonText,
  searchPlaceholder,
  createButtonLabel,
  itemName,
  itemNamePlural,
  toolbarExtra,
  itemHeight = ITEM_HEIGHT_PX,
  actionBar,
}: NestedSidebarProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        !searchQuery
      ) {
        setSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  const handleSearchIconClick = useCallback(() => {
    if (searchExpanded && searchQuery) {
      setSearchQuery('');
      setSearchExpanded(false);
    } else {
      setSearchExpanded(true);
    }
  }, [searchExpanded, searchQuery]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => getSearchableText(item).toLowerCase().includes(query));
  }, [items, searchQuery, getSearchableText]);

  const groupedItems = useMemo(
    () => groupItemsByDate(filteredItems, getDateValue),
    [filteredItems, getDateValue]
  );

  const flattenedItems = useMemo(() => {
    const result: ListItem<T>[] = [];
    groupedItems.forEach((groupItems, groupLabel) => {
      result.push({ type: 'header', id: `header-${groupLabel}`, label: groupLabel });
      groupItems.forEach(item => {
        result.push({ type: 'item', id: getId(item), item });
      });
    });
    return result;
  }, [groupedItems, getId]);

  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedItems[index];
      return item.type === 'header' ? HEADER_HEIGHT_PX : itemHeight;
    },
    overscan: 5,
  });

  const isFiltering = searchQuery.trim();

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
    'nested-sidebar',
    pinned && 'pinned',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={sidebarClassName}>
      {actionBar && (
        <div className="nested-sidebar-action-bar">
          {actionBar}
        </div>
      )}
      <div className="nested-sidebar-hover-zone">
        <div className="nested-sidebar-collapsed-content">
          <Text variant="muted" className="nested-sidebar-collapsed-label">
            {totalCount}
          </Text>
        </div>
        <div className="nested-sidebar-expanded-content">
          <div className="nested-sidebar-toolbar">
            <div className="nested-sidebar-toolbar-controls">
              <div
                ref={searchContainerRef}
                className={`search-container ${searchExpanded ? 'expanded' : ''}`}
              >
                <IconButton
                  icon={searchExpanded && searchQuery ? <IoClose size={18} /> : <IoSearch size={18} />}
                  label={searchExpanded && searchQuery ? 'Clear search' : 'Search'}
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchIconClick}
                  className="search-button toolbar-button"
                  style={{ backgroundColor: 'transparent' }}
                />
                <Input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {toolbarExtra}

              <div style={{ display: 'flex', gap: '4px' }}>
                <IconButton
                  icon={<FiPlus size={18} />}
                  label={createButtonLabel}
                  onClick={onCreateItem}
                  variant="ghost"
                  size="sm"
                  className="toolbar-button"
                />
                <IconButton
                  icon={pinned ? <TbPinFilled size={18} /> : <TbPin size={18} />}
                  label={pinned ? "Unpin sidebar" : "Pin sidebar"}
                  onClick={onTogglePin}
                  variant="ghost"
                  size="sm"
                  className="toolbar-button"
                />
              </div>
            </div>

            {searchQuery && (
              <div className="nested-sidebar-toolbar-status">
                <Text as="span" variant="secondary" className="nested-sidebar-toolbar-count">
                  {filteredItems.length} {filteredItems.length === 1 ? itemName : itemNamePlural}
                </Text>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="sidebar-empty-state">
              <Text variant="secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{emptyStateTitle}</Text>
              <Text variant="muted" style={{ fontSize: '0.8125rem' }}>{emptyStateSubtitle}</Text>
              <Button
                variant="secondary"
                size="sm"
                icon={<FiPlus size={14} />}
                onClick={onCreateItem}
              >
                {emptyStateButtonText}
              </Button>
            </div>
          ) : (
            <div ref={parentRef} className="nested-sidebar-list">
              <div
                style={{
                  height: `${virtualizer.getTotalSize() + (isLoadingMore ? LOADING_INDICATOR_HEIGHT_PX : 0)}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const listItem = flattenedItems[virtualItem.index];

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
                      {listItem.type === 'header' ? (
                        <div className="nested-sidebar-group-header">
                          <Text variant="muted">{listItem.label}</Text>
                        </div>
                      ) : (
                        <div
                          className={`nested-sidebar-item ${selectedId === listItem.id ? 'selected' : ''}`}
                          onClick={() => onSelectItem(listItem.id)}
                        >
                          {renderItem(listItem.item, selectedId === listItem.id)}
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
    </div>
  );
}
