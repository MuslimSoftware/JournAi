import { useCallback, useState, useEffect } from "react";
import { useCalendar } from "../../hooks/useCalendar";
import { hapticSelection, hapticImpact } from "../../hooks/useHaptics";
import CalendarGrid from "../calendar/CalendarGrid";
import DayDetail from "../calendar/DayDetail";
import WeekStrip from "./WeekStrip";
import { SkeletonCalendarGrid } from "./Skeleton";
import "../../styles/calendar.css";

export default function MobileCalendar() {
  const {
    currentMonth,
    currentYear,
    selectedDate,
    indicators,
    dayData,
    stickyNote,
    isLoadingIndicators,
    isLoadingDayData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectDate,
    setMonth,
    setYear,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    updateStickyNote,
  } = useCalendar();

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (selectedDate && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [selectedDate]);

  const handleSelectDate = useCallback(
    (date: string | null) => {
      if (date) {
        hapticSelection();
      }
      selectDate(date);
    },
    [selectDate],
  );

  const handleMonthChange = useCallback(
    (direction: "prev" | "next") => {
      hapticSelection();
      if (direction === "prev") {
        goToPreviousMonth();
      } else {
        goToNextMonth();
      }
    },
    [goToPreviousMonth, goToNextMonth],
  );

  const handleExpand = useCallback(() => {
    hapticImpact("light");
    setIsCollapsed(false);
    selectDate(null);
  }, [selectDate]);

  const handleCollapse = useCallback(() => {
    hapticImpact("light");
    setIsCollapsed(true);
  }, []);

  if (isLoadingIndicators && !indicators) {
    return (
      <div className="mobile-calendar-page loading">
        <SkeletonCalendarGrid />
      </div>
    );
  }

  return (
    <div className={`mobile-calendar-page ${isCollapsed ? "collapsed" : ""}`}>
      <div
        className={`calendar-collapse-container ${isCollapsed ? "collapsed" : ""}`}
      >
        <CalendarGrid
          month={currentMonth}
          year={currentYear}
          selectedDate={selectedDate}
          indicators={indicators}
          onPreviousMonth={() => handleMonthChange("prev")}
          onNextMonth={() => handleMonthChange("next")}
          onToday={goToToday}
          onSelectDate={handleSelectDate}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>

      {isCollapsed && selectedDate && (
        <WeekStrip
          selectedDate={selectedDate}
          indicators={indicators}
          onSelectDate={handleSelectDate}
          onExpand={handleExpand}
        />
      )}

      {isCollapsed && selectedDate && (
        <div className="mobile-calendar-detail">
          <DayDetail
            dayData={dayData}
            isLoading={isLoadingDayData}
            stickyNote={stickyNote}
            onCreateTodo={createTodo}
            onUpdateTodo={updateTodo}
            onDeleteTodo={deleteTodo}
            onReorderTodos={reorderTodos}
            onUpdateStickyNote={updateStickyNote}
          />
        </div>
      )}
    </div>
  );
}
