import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type { MonthIndicators } from "../../services/calendar";
import { toDateString, getTodayString } from "../../utils/date";
import { hapticSelection } from "../../hooks/useHaptics";

interface WeekStripProps {
  selectedDate: string;
  indicators: MonthIndicators | null;
  onSelectDate: (date: string) => void;
  onExpand: () => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function getWeekDays(centerDate: string): Date[] {
  const date = new Date(centerDate + "T12:00:00");
  const dayOfWeek = date.getDay();
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() - dayOfWeek + i);
    days.push(d);
  }

  return days;
}

function getWeeksForMonth(year: number, month: number): Date[][] {
  const weeks: Date[][] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentDate = new Date(firstDay);
  currentDate.setDate(currentDate.getDate() - currentDate.getDay());

  while (currentDate <= lastDay || weeks.length < 1) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);

    if (currentDate > lastDay && week[6] >= lastDay) break;
  }

  return weeks;
}

export default function WeekStrip({
  selectedDate,
  indicators,
  onSelectDate,
  onExpand,
}: WeekStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayString();

  const selectedDateObj = useMemo(
    () => new Date(selectedDate + "T12:00:00"),
    [selectedDate],
  );
  const weeks = useMemo(
    () =>
      getWeeksForMonth(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
      ),
    [selectedDateObj],
  );

  const selectedWeekIndex = useMemo(() => {
    return weeks.findIndex((week) =>
      week.some((d) => toDateString(d) === selectedDate),
    );
  }, [weeks, selectedDate]);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollRef.current && selectedWeekIndex >= 0 && !isUserScrolling) {
      const weekWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: selectedWeekIndex * weekWidth,
        behavior: "smooth",
      });
    }
  }, [selectedWeekIndex, isUserScrolling]);

  const handleScroll = useCallback(() => {
    setIsUserScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const scrollLeft = scrollRef.current.scrollLeft;
      const weekWidth = scrollRef.current.offsetWidth;
      const newWeekIndex = Math.round(scrollLeft / weekWidth);

      if (newWeekIndex !== selectedWeekIndex && weeks[newWeekIndex]) {
        const currentDayOfWeek = selectedDateObj.getDay();
        const newWeekDate = weeks[newWeekIndex][currentDayOfWeek];
        if (newWeekDate) {
          hapticSelection();
          onSelectDate(toDateString(newWeekDate));
        }
      }

      setIsUserScrolling(false);
    }, 150);
  }, [selectedWeekIndex, weeks, selectedDateObj, onSelectDate]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleDayClick = useCallback(
    (date: Date) => {
      hapticSelection();
      onSelectDate(toDateString(date));
    },
    [onSelectDate],
  );

  return (
    <div className="week-strip-container">
      <div className="week-strip-weekdays">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="week-strip-weekday">
            {day}
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="week-strip-scroll"
        onScroll={handleScroll}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="week-strip-week">
            {week.map((date, dayIndex) => {
              const dateStr = toDateString(date);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const isCurrentMonth =
                date.getMonth() === selectedDateObj.getMonth();
              const hasEntry = indicators?.entriesDates.has(dateStr) ?? false;
              const hasStickyNote =
                indicators?.stickyNotesDates.has(dateStr) ?? false;
              const todosCount = indicators?.todosCounts.get(dateStr);
              const hasIndicator =
                hasEntry ||
                hasStickyNote ||
                (todosCount && todosCount.total > 0);

              return (
                <button
                  key={dayIndex}
                  className={[
                    "week-strip-day",
                    isSelected && "selected",
                    isToday && "today",
                    !isCurrentMonth && "outside-month",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(date)}
                >
                  <span className="week-strip-day-number">
                    {date.getDate()}
                  </span>
                  {hasIndicator && <div className="week-strip-indicator" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <button
        className="week-strip-expand-button"
        onClick={onExpand}
        aria-label="Expand to month view"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 8L10 13L15 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
