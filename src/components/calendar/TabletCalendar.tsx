import { useCalendar } from '../../hooks/useCalendar';
import { Spinner } from '../themed';
import CalendarGrid from './CalendarGrid';
import DayDetail from './DayDetail';

export default function TabletCalendar() {
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

  if (isLoadingIndicators && !indicators) {
    return (
      <div className="tablet-calendar-page loading">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="tablet-calendar-page">
      <div className="tablet-calendar-stack">
        <section className="tablet-calendar-calendar-panel">
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
        </section>
        <section className="tablet-calendar-detail-panel">
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
        </section>
      </div>
    </div>
  );
}
