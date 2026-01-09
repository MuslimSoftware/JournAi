import { useCallback } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { hapticSelection } from '../../hooks/useHaptics';
import CalendarGrid from '../calendar/CalendarGrid';
import DayDetail from '../calendar/DayDetail';
import BottomSheet from './BottomSheet';
import { SkeletonCalendarGrid } from './Skeleton';
import '../../styles/calendar.css';

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

  const handleSelectDate = useCallback((date: string | null) => {
    if (date) {
      hapticSelection();
    }
    selectDate(date);
  }, [selectDate]);

  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    hapticSelection();
    if (direction === 'prev') {
      goToPreviousMonth();
    } else {
      goToNextMonth();
    }
  }, [goToPreviousMonth, goToNextMonth]);

  if (isLoadingIndicators && !indicators) {
    return (
      <div className="mobile-calendar-page loading">
        <SkeletonCalendarGrid />
      </div>
    );
  }

  return (
    <div className="mobile-calendar-page">
      <CalendarGrid
        month={currentMonth}
        year={currentYear}
        selectedDate={selectedDate}
        indicators={indicators}
        onPreviousMonth={() => handleMonthChange('prev')}
        onNextMonth={() => handleMonthChange('next')}
        onToday={goToToday}
        onSelectDate={handleSelectDate}
        onMonthChange={setMonth}
        onYearChange={setYear}
      />

      <BottomSheet
        isOpen={!!selectedDate}
        onClose={() => selectDate(null)}
        title="Day Details"
        height="half"
      >
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
      </BottomSheet>
    </div>
  );
}
