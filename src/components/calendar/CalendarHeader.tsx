import { useState, useRef, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { IconButton, Button } from '../themed';

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarHeader({
  month,
  year,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthRef.current && !monthRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMonthDropdown && monthDropdownRef.current) {
      const activeItem = monthDropdownRef.current.querySelector('.active');
      activeItem?.scrollIntoView({ block: 'center' });
    }
  }, [showMonthDropdown]);

  useEffect(() => {
    if (showYearDropdown && yearDropdownRef.current) {
      const activeItem = yearDropdownRef.current.querySelector('.active');
      activeItem?.scrollIntoView({ block: 'center' });
    }
  }, [showYearDropdown]);

  const handleMonthSelect = (m: number) => {
    onMonthChange(m);
    setShowMonthDropdown(false);
  };

  const handleYearSelect = (y: number) => {
    onYearChange(y);
    setShowYearDropdown(false);
  };

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
          <div className="calendar-dropdown-container" ref={monthRef}>
            <button
              className="calendar-dropdown-trigger"
              onClick={() => {
                setShowMonthDropdown(!showMonthDropdown);
                setShowYearDropdown(false);
              }}
            >
              <span className="calendar-dropdown-text">{MONTH_NAMES[month]}</span>
              <FiChevronDown size={18} className="calendar-dropdown-arrow" />
            </button>
            {showMonthDropdown && (
              <div className="calendar-dropdown" ref={monthDropdownRef}>
                {MONTH_NAMES.map((name, i) => (
                  <button
                    key={name}
                    className={`calendar-dropdown-item ${i === month ? 'active' : ''}`}
                    onClick={() => handleMonthSelect(i)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="calendar-dropdown-container" ref={yearRef}>
            <button
              className="calendar-dropdown-trigger"
              onClick={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowMonthDropdown(false);
              }}
            >
              <span className="calendar-dropdown-text">{year}</span>
              <FiChevronDown size={18} className="calendar-dropdown-arrow" />
            </button>
            {showYearDropdown && (
              <div className="calendar-dropdown calendar-dropdown-year" ref={yearDropdownRef}>
                {years.map((y) => (
                  <button
                    key={y}
                    className={`calendar-dropdown-item ${y === year ? 'active' : ''}`}
                    onClick={() => handleYearSelect(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
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
