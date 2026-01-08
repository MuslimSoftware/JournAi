import { useCalendar } from '../../hooks/useCalendar';
import { Spinner } from '../themed';
import CalendarGrid from '../calendar/CalendarGrid';
import DayDetail from '../calendar/DayDetail';
import BottomSheet from './BottomSheet';
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
    clearStickyNote,
  } = useCalendar();

  if (isLoadingIndicators && !indicators) {
    return (
      <div className="mobile-calendar-page loading">
        <Spinner size="lg" />
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
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        onSelectDate={selectDate}
        onMonthChange={setMonth}
        onYearChange={setYear}
      />

      <BottomSheet
        isOpen={!!selectedDate}
        onClose={() => selectDate(null)}
        title="Day Details"
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
          onClearStickyNote={clearStickyNote}
        />
      </BottomSheet>
    </div>
  );
}
