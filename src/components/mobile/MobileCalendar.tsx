import { useCallback, useMemo, useState, useRef } from "react";
import { useCalendar } from "../../hooks/useCalendar";
import { hapticSelection } from "../../hooks/useHaptics";
import { getTodayString } from "../../utils/date";
import { Text } from "../themed";
import DayDetail from "../calendar/DayDetail";
import WeekStrip, { WeekStripRef } from "./WeekStrip";
import MobilePageHeader from "./MobilePageHeader";
import BottomSheet from "./BottomSheet";
import MonthYearPicker from "./MonthYearPicker";
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
    setMonth,
    setYear,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    updateStickyNote,
  } = useCalendar();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pendingMonth, setPendingMonth] = useState(0);
  const [pendingYear, setPendingYear] = useState(2025);
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
    setPendingMonth(currentSelectedDate.getMonth());
    setPendingYear(currentSelectedDate.getFullYear());
    setIsDatePickerOpen(true);
  }, [currentSelectedDate]);

  const handleDatePickerCancel = useCallback(() => {
    setIsDatePickerOpen(false);
  }, []);

  const handleDatePickerDone = useCallback(() => {
    const currentDate = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
    const isInSelectedMonth = currentDate &&
      currentDate.getMonth() === pendingMonth &&
      currentDate.getFullYear() === pendingYear;

    let targetDateStr: string;
    if (isInSelectedMonth && selectedDate) {
      targetDateStr = selectedDate;
    } else {
      targetDateStr = `${pendingYear}-${String(pendingMonth + 1).padStart(2, '0')}-01`;
      selectDate(targetDateStr);
    }

    setMonth(pendingMonth);
    setYear(pendingYear);
    weekStripRef.current?.scrollToDate(targetDateStr);
    hapticSelection();
    setIsDatePickerOpen(false);
  }, [pendingMonth, pendingYear, selectedDate, selectDate, setMonth, setYear]);

  const handlePickerChange = useCallback((month: number, year: number) => {
    setPendingMonth(month);
    setPendingYear(year);
  }, []);

  const handleTodayPress = useCallback(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    selectDate(dateStr);
    weekStripRef.current?.scrollToDate(dateStr);
    setIsDatePickerOpen(false);
    hapticSelection();
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
        onClose={handleDatePickerCancel}
        title="Go to Date"
        headerLeft={<button type="button" onClick={handleDatePickerCancel}>Cancel</button>}
        headerRight={<button type="button" onClick={handleDatePickerDone}>Done</button>}
        height="auto"
      >
        <MonthYearPicker
          month={pendingMonth}
          year={pendingYear}
          onChange={handlePickerChange}
          onTodayPress={handleTodayPress}
        />
      </BottomSheet>
    </div>
  );
}
