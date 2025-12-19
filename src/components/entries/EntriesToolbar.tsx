import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IoSearch, IoClose, IoFilter, IoCheckmark } from 'react-icons/io5';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Text, IconButton } from '../themed';
import { TimeFilter as ImportedTimeFilter } from '../../utils/timeFilters';
import 'react-day-picker/style.css';

export type TimeFilter = ImportedTimeFilter | 'this-year' | 'custom';

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  'today': 'Today',
  'yesterday': 'Yesterday',
  'this-week': 'This Week',
  'last-week': 'Last Week',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'this-year': 'This Year',
  'custom': 'Custom Range',
  'all-time': 'All Time',
};

interface EntriesToolbarProps {
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: TimeFilter | null, customRange?: DateRange) => void;
  resultCount: number;
  rightAction?: ReactNode;
  onDropdownOpenChange?: (isOpen: boolean) => void;
}

export default function EntriesToolbar({
  onSearchChange,
  onFilterChange,
  resultCount,
  rightAction,
  onDropdownOpenChange,
}: EntriesToolbarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TimeFilter | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, right: 0 });
  const [filterDropdownPosition, setFilterDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    onDropdownOpenChange?.(filterExpanded || showDatePicker);
  }, [filterExpanded, showDatePicker, onDropdownOpenChange]);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        !searchQuery
      ) {
        setSearchExpanded(false);
      }
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node) &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setFilterExpanded(false);
      }
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node) &&
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  const handleSearchIconClick = () => {
    if (searchExpanded && searchQuery) {
      setSearchQuery('');
      onSearchChange('');
      setSearchExpanded(false);
    } else {
      setSearchExpanded(true);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleFilterSelect = (filter: TimeFilter) => {
    if (filter === 'custom') {
      if (filterContainerRef.current) {
        const rect = filterContainerRef.current.getBoundingClientRect();
        setDatePickerPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      setShowDatePicker(true);
      setFilterExpanded(false);
      return;
    }
    const newFilter = activeFilter === filter ? null : filter;
    setActiveFilter(newFilter);
    setCustomDateRange(undefined);
    onFilterChange(newFilter);
    setFilterExpanded(false);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
  };

  const handleApplyDateRange = () => {
    if (customDateRange?.from && customDateRange?.to) {
      setActiveFilter('custom');
      onFilterChange('custom', customDateRange);
      setShowDatePicker(false);
    }
  };

  const handleClearFilters = () => {
    setActiveFilter(null);
    setCustomDateRange(undefined);
    onFilterChange(null);
    setFilterExpanded(false);
    setShowDatePicker(false);
  };

  return (
    <div className="entries-toolbar">
      <div className="entries-toolbar-controls">
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
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div ref={filterContainerRef} className="filter-container">
          <IconButton
            icon={<IoFilter size={18} />}
            label="Filter"
            variant={activeFilter ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              if (!filterExpanded && filterContainerRef.current) {
                const rect = filterContainerRef.current.getBoundingClientRect();
                setFilterDropdownPosition({
                  top: rect.bottom + 8,
                  left: rect.left,
                });
              }
              setFilterExpanded(!filterExpanded);
            }}
            className="toolbar-button"
            style={!activeFilter ? { backgroundColor: 'transparent' } : undefined}
          />

          {filterExpanded && createPortal(
            <div
              ref={filterDropdownRef}
              className="filter-dropdown"
              style={{
                position: 'fixed',
                top: `${filterDropdownPosition.top}px`,
                left: `${filterDropdownPosition.left}px`,
              }}
            >
              <div className="filter-dropdown-header">
                <Text as="span" variant="secondary" className="filter-dropdown-title">
                  Time Filters
                </Text>
                {activeFilter && (
                  <button className="filter-clear-button" onClick={handleClearFilters}>
                    Clear
                  </button>
                )}
              </div>
              <div className="filter-options">
                {(Object.entries(TIME_FILTER_LABELS) as [TimeFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    className={`filter-option ${activeFilter === key ? 'active' : ''}`}
                    onClick={() => handleFilterSelect(key)}
                  >
                    <span>{label}</span>
                    {activeFilter === key && <IoCheckmark size={16} />}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}

          {showDatePicker && (
            <div
              ref={datePickerRef}
              className="date-picker-dropdown"
              style={{
                top: `${datePickerPosition.top}px`,
                right: `${datePickerPosition.right}px`,
              }}
            >
              <DayPicker
                mode="range"
                selected={customDateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={1}
                className="custom-day-picker"
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2030}
              />
              <div className="date-picker-footer">
                <button className="date-picker-cancel-button" onClick={() => { setCustomDateRange(undefined); setShowDatePicker(false); }}>
                  Cancel
                </button>
                <button
                  className={`date-picker-apply-button ${customDateRange?.from && customDateRange?.to ? 'enabled' : ''}`}
                  onClick={handleApplyDateRange}
                  disabled={!customDateRange?.from || !customDateRange?.to}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {rightAction}
      </div>

      {(searchQuery || activeFilter) && (
        <div className="entries-toolbar-status">
          <Text as="span" variant="secondary" className="entries-toolbar-count">
            {resultCount} {resultCount === 1 ? 'entry' : 'entries'}
          </Text>
          {activeFilter && (
            <span className="active-filter-badge">
              {activeFilter === 'custom' && customDateRange?.from && customDateRange?.to
                ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d, yyyy')}`
                : TIME_FILTER_LABELS[activeFilter]}
              <button className="filter-badge-close" onClick={handleClearFilters} aria-label="Clear filter">
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
