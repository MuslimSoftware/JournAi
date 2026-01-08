import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { IconButton, Button } from '../themed';
import Dropdown from './Dropdown';
import { getMonthOptions, getYearOptions } from './constants';

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export default function CalendarHeader({
  month,
  year,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) {
  const currentYear = new Date().getFullYear();
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions(currentYear);

  return (
    <div className="calendar-header">
      <div className="calendar-header-nav">
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
      <Button variant="ghost" size="sm" onClick={onToday}>
        Today
      </Button>
    </div>
  );
}
