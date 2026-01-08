import type { MonthIndicators } from '../../services/calendar';
import { toDateString, getTodayString } from '../../utils/date';
import CalendarHeader from './CalendarHeader';
import DayCell from './DayCell';
import { WEEKDAYS } from './constants';

interface CalendarGridProps {
  month: number;
  year: number;
  selectedDate: string | null;
  indicators: MonthIndicators | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDate: (date: string) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export default function CalendarGrid({
  month,
  year,
  selectedDate,
  indicators,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onSelectDate,
  onMonthChange,
  onYearChange,
}: CalendarGridProps) {
  const days = getCalendarDays(year, month);
  const todayStr = getTodayString();

  return (
    <div className="calendar-grid-container">
      <CalendarHeader
        month={month}
        year={year}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onToday={onToday}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
      />
      <div className="calendar-weekdays">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((date, index) => {
          const dateStr = toDateString(date);
          const isCurrentMonth = date.getMonth() === month;

          return (
            <DayCell
              key={index}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isToday={dateStr === todayStr}
              isSelected={dateStr === selectedDate}
              hasEntry={indicators?.entriesDates.has(dateStr) ?? false}
              hasStickyNote={indicators?.stickyNotesDates.has(dateStr) ?? false}
              todosCount={indicators?.todosCounts.get(dateStr)}
              onClick={() => onSelectDate(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}
