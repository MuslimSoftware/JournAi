import { useCallback, useMemo, useState, useRef } from "react";
import { DayPicker } from "react-day-picker";
import { useCalendar } from "../../hooks/useCalendar";
import { hapticSelection } from "../../hooks/useHaptics";
import { getTodayString } from "../../utils/date";
import { Text } from "../themed";
import DayDetail from "../calendar/DayDetail";
import WeekStrip, { WeekStripRef } from "./WeekStrip";
import MobilePageHeader from "./MobilePageHeader";
import BottomSheet from "./BottomSheet";
import "react-day-picker/style.css";
import "../../styles/calendar.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MobileCalendar() {
  const {
    selectedDate,
    indicators,
    dayData,
    stickyNote,
    isLoadingDayData,
    selectDate,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    updateStickyNote,
  } = useCalendar();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const weekStripRef = useRef<WeekStripRef>(null);

  const handleSelectDate = useCallback(
    (date: string | null) => {
      if (date) {
        hapticSelection();
      }
      selectDate(date);
    },
    [selectDate],
  );

  const headerTitle = useMemo(() => {
    const dateStr = selectedDate || getTodayString();
    const date = new Date(dateStr + "T12:00:00");
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }, [selectedDate]);

  const currentSelectedDate = useMemo(() => {
    const dateStr = selectedDate || getTodayString();
    return new Date(dateStr + "T12:00:00");
  }, [selectedDate]);

  const handleHeaderClick = useCallback(() => {
    hapticSelection();
    setIsDatePickerOpen(true);
  }, []);

  const handleDatePickerClose = useCallback(() => {
    setIsDatePickerOpen(false);
  }, []);

  const handleDayPickerSelect = useCallback((date: Date | undefined) => {
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      selectDate(dateStr);
      weekStripRef.current?.scrollToDate(dateStr);
      setIsDatePickerOpen(false);
      hapticSelection();
    }
  }, [selectDate]);

  return (
    <div className="mobile-calendar-page">
      <MobilePageHeader
        centerContent={
          <button
            className="mobile-calendar-header-button"
            onClick={handleHeaderClick}
          >
            <Text variant="primary" className="mobile-page-header__title">
              {headerTitle}
            </Text>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        }
      />
      <WeekStrip
        ref={weekStripRef}
        selectedDate={selectedDate}
        indicators={indicators}
        onSelectDate={handleSelectDate}
      />
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

      <BottomSheet
        isOpen={isDatePickerOpen}
        onClose={handleDatePickerClose}
        title="Go to Date"
        height="auto"
      >
        <div className="mobile-date-picker">
          <DayPicker
            mode="single"
            selected={currentSelectedDate}
            onSelect={handleDayPickerSelect}
            defaultMonth={currentSelectedDate}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
