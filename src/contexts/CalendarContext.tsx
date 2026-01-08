import { createContext, useContext, useState, ReactNode, SetStateAction, Dispatch } from 'react';
import { getTodayString } from '../utils/date';

interface CalendarContextType {
  currentMonth: number;
  currentYear: number;
  selectedDate: string | null;
  setCurrentMonth: Dispatch<SetStateAction<number>>;
  setCurrentYear: Dispatch<SetStateAction<number>>;
  setSelectedDate: Dispatch<SetStateAction<string | null>>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayString());

  return (
    <CalendarContext.Provider
      value={{
        currentMonth,
        currentYear,
        selectedDate,
        setCurrentMonth,
        setCurrentYear,
        setSelectedDate,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}
