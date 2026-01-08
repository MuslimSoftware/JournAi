import { useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { IconButton } from '../themed';
import Dropdown from './Dropdown';
import { getMonthOptions, getYearOptions } from './constants';
import type { MonthIndicators } from '../../services/calendar';

interface CalendarHeaderProps {
  month: number;
  year: number;
  indicators: MonthIndicators | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export default function CalendarHeader({
  month,
  year,
  indicators,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) {
  const currentYear = new Date().getFullYear();
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions(currentYear);

  const insights = useMemo(() => {
    if (!indicators) return { entries: 0, todos: 0, stickyNotes: 0 };

    let totalTodos = 0;
    indicators.todosCounts.forEach(({ total }) => {
      totalTodos += total;
    });

    return {
      entries: indicators.entriesDates.size,
      todos: totalTodos,
      stickyNotes: indicators.stickyNotesDates.size,
    };
  }, [indicators]);

  return (
    <div className="calendar-header">
      <div className="calendar-header-row">
        <div className="calendar-header-left">
          <button className="calendar-today-button" onClick={onToday}>
            Today
          </button>
        </div>

        <div className="calendar-header-center">
          <IconButton
            icon={<FiChevronLeft size={20} />}
            label="Previous month"
            variant="ghost"
            size="sm"
            onClick={onPreviousMonth}
            className="calendar-nav-button"
          />

          <div className="calendar-month-year-group">
            <Dropdown
              options={monthOptions}
              value={month}
              onChange={onMonthChange}
            />
            <Dropdown
              options={yearOptions}
              value={year}
              onChange={onYearChange}
              className="calendar-dropdown-year"
            />
          </div>

          <IconButton
            icon={<FiChevronRight size={20} />}
            label="Next month"
            variant="ghost"
            size="sm"
            onClick={onNextMonth}
            className="calendar-nav-button"
          />
        </div>

        <div className="calendar-header-right">
          <span className="calendar-month-insights">
            {insights.entries} entries · {insights.todos} todos · {insights.stickyNotes} notes
          </span>
        </div>
      </div>
    </div>
  );
}
