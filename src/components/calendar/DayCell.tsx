import CalendarIndicators from './CalendarIndicators';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasEntry: boolean;
  hasStickyNote: boolean;
  todosCount?: { total: number; completed: number };
  onClick: () => void;
}

export default function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  hasEntry,
  hasStickyNote,
  todosCount,
  onClick,
}: DayCellProps) {
  const cellClasses = [
    'calendar-day-cell',
    !isCurrentMonth && 'outside-month',
    isToday && 'today',
    isSelected && 'selected',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={onClick}
      aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      aria-pressed={isSelected}
    >
      <span className="calendar-day-number">{date.getDate()}</span>
      <CalendarIndicators
        hasEntry={hasEntry}
        hasStickyNote={hasStickyNote}
        todosCount={todosCount}
      />
    </button>
  );
}
