import { useIsMobile } from '../hooks/useMediaQuery';
import { useCalendar } from '../hooks/useCalendar';
import { Spinner } from '../components/themed';
import CalendarGrid from '../components/calendar/CalendarGrid';
import SlidePanel from '../components/calendar/SlidePanel';
import DayDetail from '../components/calendar/DayDetail';
import MobileCalendar from '../components/mobile/MobileCalendar';
import '../styles/calendar.css';

export default function Calendar() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileCalendar />;
  }

  return <DesktopCalendar />;
}

function DesktopCalendar() {
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
      <div className="calendar-page loading">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-main panel-open">
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
      </div>
      <SlidePanel isOpen>
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
      </SlidePanel>
    </div>
  );
}
