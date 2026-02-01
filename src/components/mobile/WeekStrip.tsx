import { useRef, useEffect, useCallback, useMemo, useState, useLayoutEffect, forwardRef, useImperativeHandle } from "react";
import type { MonthIndicators } from "../../services/calendar";
import { toDateString, getTodayString } from "../../utils/date";
import { hapticSelection } from "../../hooks/useHaptics";

interface WeekStripProps {
  selectedDate: string | null;
  indicators: MonthIndicators | null;
  onSelectDate: (date: string) => void;
}

export interface WeekStripRef {
  scrollToDate: (dateStr: string) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKS_BEFORE = 52;
const WEEKS_AFTER = 52;
const LOAD_THRESHOLD = 4;
const LOAD_BATCH = 12;

function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function generateWeeks(startDate: Date, count: number): Date[][] {
  const weeks: Date[][] = [];
  const currentDate = new Date(startDate);

  for (let w = 0; w < count; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

const WeekStrip = forwardRef<WeekStripRef, WeekStripProps>(function WeekStrip({
  selectedDate,
  indicators,
  onSelectDate,
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayString();
  const effectiveDate = selectedDate || todayStr;

  const isTouchingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialScrolled = useRef(false);
  const pendingScrollAdjustment = useRef<number | null>(null);

  const [weeks, setWeeks] = useState<Date[][]>(() => {
    const today = new Date(todayStr + "T12:00:00");
    const weekStart = getWeekStartDate(today);
    weekStart.setDate(weekStart.getDate() - WEEKS_BEFORE * 7);
    return generateWeeks(weekStart, WEEKS_BEFORE + WEEKS_AFTER + 1);
  });

  const selectedWeekIndex = useMemo(() => {
    return weeks.findIndex((week) =>
      week.some((d) => toDateString(d) === effectiveDate),
    );
  }, [weeks, effectiveDate]);

  useImperativeHandle(ref, () => ({
    scrollToDate: (dateStr: string) => {
      let weekIndex = weeks.findIndex((week) =>
        week.some((d) => toDateString(d) === dateStr),
      );

      if (weekIndex < 0) {
        const targetDate = new Date(dateStr + "T12:00:00");
        const weekStart = getWeekStartDate(targetDate);
        weekStart.setDate(weekStart.getDate() - WEEKS_BEFORE * 7);
        const newWeeks = generateWeeks(weekStart, WEEKS_BEFORE + WEEKS_AFTER + 1);
        setWeeks(newWeeks);
        hasInitialScrolled.current = false;

        weekIndex = newWeeks.findIndex((week) =>
          week.some((d) => toDateString(d) === dateStr),
        );

        if (scrollRef.current && weekIndex >= 0) {
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              const rowHeight = scrollRef.current.scrollHeight / newWeeks.length;
              const targetScroll = (weekIndex - 1) * rowHeight;
              scrollRef.current.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: "auto",
              });
              hasInitialScrolled.current = true;
            }
          });
        }
        return;
      }

      if (scrollRef.current && weekIndex >= 0) {
        const rowHeight = scrollRef.current.scrollHeight / weeks.length;
        const targetScroll = (weekIndex - 1) * rowHeight;
        scrollRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
      }
    },
  }), [weeks]);

  useEffect(() => {
    if (hasInitialScrolled.current) return;
    if (scrollRef.current && selectedWeekIndex >= 0) {
      const rowHeight = scrollRef.current.scrollHeight / weeks.length;
      const targetScroll = (selectedWeekIndex - 1) * rowHeight;

      scrollRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "auto",
      });
      hasInitialScrolled.current = true;
    }
  }, [selectedWeekIndex, weeks.length]);

  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop += pendingScrollAdjustment.current;
      pendingScrollAdjustment.current = null;
    }
  }, [weeks]);

  const loadMoreWeeks = useCallback((direction: "up" | "down") => {
    setWeeks((prevWeeks) => {
      if (direction === "up") {
        const firstWeekStart = prevWeeks[0][0];
        const newStart = new Date(firstWeekStart);
        newStart.setDate(newStart.getDate() - LOAD_BATCH * 7);
        const newWeeks = generateWeeks(newStart, LOAD_BATCH);

        if (scrollRef.current) {
          const rowHeight = scrollRef.current.scrollHeight / prevWeeks.length;
          pendingScrollAdjustment.current = LOAD_BATCH * rowHeight;
        }

        return [...newWeeks, ...prevWeeks];
      } else {
        const lastWeek = prevWeeks[prevWeeks.length - 1];
        const lastDay = lastWeek[6];
        const newStart = new Date(lastDay);
        newStart.setDate(newStart.getDate() + 1);
        const newWeeks = generateWeeks(newStart, LOAD_BATCH);

        return [...prevWeeks, ...newWeeks];
      }
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (!isTouchingRef.current) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {}, 1000);
    }

    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const rowHeight = scrollHeight / weeks.length;
      const topWeeksHidden = Math.floor(scrollTop / rowHeight);
      const bottomWeeksHidden = Math.floor((scrollHeight - scrollTop - clientHeight) / rowHeight);

      if (topWeeksHidden < LOAD_THRESHOLD) {
        loadMoreWeeks("up");
      } else if (bottomWeeksHidden < LOAD_THRESHOLD) {
        loadMoreWeeks("down");
      }
    }
  }, [weeks.length, loadMoreWeeks]);

  const handleTouchStart = useCallback(() => {
    isTouchingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isTouchingRef.current = false;
  }, []);

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

  const selectedDateObj = useMemo(
    () => new Date(effectiveDate + "T12:00:00"),
    [effectiveDate],
  );

  return (
    <div className="week-strip-container week-strip-vertical">
      <div className="week-strip-weekdays">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="week-strip-weekday">
            {day}
          </div>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="week-strip-scroll-vertical"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {weeks.map((week) => (
          <div key={toDateString(week[0])} className="week-strip-week week-strip-week-vertical">
            {week.map((date, dayIndex) => {
              const dateStr = toDateString(date);
              const isSelected = dateStr === effectiveDate;
              const isToday = dateStr === todayStr;
              const isCurrentMonth = date.getMonth() === selectedDateObj.getMonth();
              const hasEntry = indicators?.entriesDates.has(dateStr) ?? false;
              const hasStickyNote = indicators?.stickyNotesDates.has(dateStr) ?? false;
              const todosCount = indicators?.todosCounts.get(dateStr);
              const hasIndicator =
                hasEntry ||
                hasStickyNote ||
                (todosCount && todosCount.total > 0);

              const isOddMonth = date.getMonth() % 2 === 1;

              return (
                <button
                  key={dayIndex}
                  className={[
                    "week-strip-day",
                    isSelected && "selected",
                    isToday && "today",
                    !isCurrentMonth && "outside-month",
                    !isCurrentMonth && (isOddMonth ? "month-odd" : "month-even"),
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
    </div>
  );
});

export default WeekStrip;
