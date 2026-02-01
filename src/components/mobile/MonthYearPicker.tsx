import { useCallback, useEffect, useRef } from "react";
import { Text } from "../themed";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ITEM_HEIGHT = 44;

interface MonthYearPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  onTodayPress: () => void;
  minYear?: number;
  maxYear?: number;
}

export default function MonthYearPicker({
  month,
  year,
  onChange,
  onTodayPress,
  minYear = 2000,
  maxYear = new Date().getFullYear() + 5,
}: MonthYearPickerProps) {
  const monthWheelRef = useRef<HTMLDivElement>(null);
  const yearWheelRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  const scrollToItem = useCallback((
    wheelRef: React.RefObject<HTMLDivElement | null>,
    index: number,
    smooth = true
  ) => {
    if (wheelRef.current) {
      const scrollTop = index * ITEM_HEIGHT;
      wheelRef.current.scrollTo({
        top: scrollTop,
        behavior: smooth ? "smooth" : "instant",
      });
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      requestAnimationFrame(() => {
        scrollToItem(monthWheelRef, month, false);
        scrollToItem(yearWheelRef, year - minYear, false);
      });
    }
  }, [month, year, minYear, scrollToItem]);

  const handleMonthScroll = useCallback(() => {
    if (monthWheelRef.current) {
      const scrollTop = monthWheelRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const newMonth = Math.max(0, Math.min(11, index));
      if (newMonth !== month) {
        onChange(newMonth, year);
      }
    }
  }, [month, year, onChange]);

  const handleYearScroll = useCallback(() => {
    if (yearWheelRef.current) {
      const scrollTop = yearWheelRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(years.length - 1, index));
      const newYear = years[clampedIndex];
      if (newYear !== year) {
        onChange(month, newYear);
      }
    }
  }, [month, year, years, onChange]);

  const handleMonthClick = useCallback((index: number) => {
    scrollToItem(monthWheelRef, index);
    onChange(index, year);
  }, [scrollToItem, year, onChange]);

  const handleYearClick = useCallback((clickedYear: number) => {
    const index = clickedYear - minYear;
    scrollToItem(yearWheelRef, index);
    onChange(month, clickedYear);
  }, [minYear, scrollToItem, month, onChange]);

  return (
    <div className="month-year-picker">
      <div className="month-year-picker__wheels">
        <div className="picker-wheel-container">
          <div className="picker-wheel-highlight" />
          <div
            ref={monthWheelRef}
            className="picker-wheel"
            onScroll={handleMonthScroll}
          >
            <div className="picker-wheel__padding" />
            {MONTHS.map((m, index) => (
              <button
                key={m}
                type="button"
                className="picker-item"
                onClick={() => handleMonthClick(index)}
              >
                <Text variant="primary">{m}</Text>
              </button>
            ))}
            <div className="picker-wheel__padding" />
          </div>
          <div className="picker-wheel-fade picker-wheel-fade--top" />
          <div className="picker-wheel-fade picker-wheel-fade--bottom" />
        </div>

        <div className="picker-wheel-container">
          <div className="picker-wheel-highlight" />
          <div
            ref={yearWheelRef}
            className="picker-wheel"
            onScroll={handleYearScroll}
          >
            <div className="picker-wheel__padding" />
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className="picker-item"
                onClick={() => handleYearClick(y)}
              >
                <Text variant="primary">{y}</Text>
              </button>
            ))}
            <div className="picker-wheel__padding" />
          </div>
          <div className="picker-wheel-fade picker-wheel-fade--top" />
          <div className="picker-wheel-fade picker-wheel-fade--bottom" />
        </div>
      </div>

      <button
        type="button"
        className="month-year-picker__today"
        onClick={onTodayPress}
      >
        Today
      </button>
    </div>
  );
}
