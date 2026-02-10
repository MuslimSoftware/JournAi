import { useState, useEffect, useCallback, useRef } from 'react';
import type { DayData, StickyNote } from '../types/todo';
import type { MonthIndicators } from '../services/calendar';
import { getMonthIndicators, getDayData } from '../services/calendar';
import { getTodayString, parseLocalDate, toDateString } from '../utils/date';
import * as todosService from '../services/todos';
import * as stickyNotesService from '../services/stickyNotes';
import { useCalendarContext } from '../contexts/CalendarContext';

export function useCalendar() {
  const {
    currentMonth,
    currentYear,
    selectedDate,
    setCurrentMonth,
    setCurrentYear,
    setSelectedDate,
  } = useCalendarContext();
  const [indicators, setIndicators] = useState<MonthIndicators | null>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [stickyNote, setStickyNote] = useState<StickyNote | null>(null);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(true);
  const [isLoadingDayData, setIsLoadingDayData] = useState(false);
  const dayDataCacheRef = useRef<Map<string, DayData>>(new Map());

  const setDayDataWithStickyNote = useCallback((data: DayData | null) => {
    setDayData(data);
    if (!data) {
      setStickyNote(null);
      return;
    }

    dayDataCacheRef.current.set(data.date, data);

    if (data.stickyNotes.length > 0) {
      setStickyNote(data.stickyNotes[0]);
    } else {
      setStickyNote({ id: '', date: data.date, content: '' });
    }
  }, []);

  const loadIndicators = useCallback(async () => {
    setIsLoadingIndicators(true);
    try {
      const data = await getMonthIndicators(currentYear, currentMonth);
      setIndicators(data);
    } catch (error) {
      console.error('Failed to load calendar indicators:', error);
    } finally {
      setIsLoadingIndicators(false);
    }
  }, [currentYear, currentMonth]);

  const loadDayData = useCallback(async (date: string) => {
    setIsLoadingDayData(true);
    const cached = dayDataCacheRef.current.get(date);
    if (cached) {
      setDayDataWithStickyNote(cached);
    }

    try {
      const data = await getDayData(date);
      setDayDataWithStickyNote(data);
    } catch (error) {
      console.error('Failed to load calendar day data:', error);
      if (!cached) {
        setDayDataWithStickyNote(null);
      }
    } finally {
      setIsLoadingDayData(false);
    }
  }, [setDayDataWithStickyNote]);

  const prefetchDayData = useCallback(async (date: string) => {
    if (dayDataCacheRef.current.has(date)) {
      return;
    }

    try {
      const data = await getDayData(date);
      dayDataCacheRef.current.set(date, data);
    } catch (error) {
      console.error('Failed to prefetch calendar day data:', error);
    }
  }, []);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  useEffect(() => {
    if (selectedDate) {
      loadDayData(selectedDate);
      const baseDate = parseLocalDate(selectedDate);
      const previousDate = new Date(baseDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 1);
      prefetchDayData(toDateString(previousDate));
      prefetchDayData(toDateString(nextDate));
    } else {
      setDayData(null);
      setStickyNote(null);
    }
  }, [selectedDate, loadDayData, prefetchDayData]);

  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(getTodayString());
  }, []);

  const selectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
  }, []);

  const setMonth = useCallback((month: number) => {
    setCurrentMonth(month);
  }, []);

  const setYear = useCallback((year: number) => {
    setCurrentYear(year);
  }, []);

  const createTodo = useCallback(async (content: string) => {
    if (!selectedDate) return null;
    const todo = await todosService.createTodo(selectedDate, content);
    if (todo) {
      setDayData(prev => {
        if (!prev) return prev;
        const next = { ...prev, todos: [...prev.todos, todo] };
        dayDataCacheRef.current.set(next.date, next);
        return next;
      });
      await loadIndicators();
    }
    return todo;
  }, [selectedDate, loadIndicators]);

  const updateTodo = useCallback(async (
    id: string,
    updates: { content?: string; completed?: boolean }
  ) => {
    setDayData(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        todos: prev.todos.map(t => t.id === id ? { ...t, ...updates } : t)
      };
      dayDataCacheRef.current.set(next.date, next);
      return next;
    });

    const updated = await todosService.updateTodo(id, updates);
    if (selectedDate && updates.completed !== undefined) {
      await loadIndicators();
    }
    return updated;
  }, [selectedDate, loadIndicators]);

  const deleteTodo = useCallback(async (id: string) => {
    setDayData(prev => {
      if (!prev) return prev;
      const next = { ...prev, todos: prev.todos.filter(t => t.id !== id) };
      dayDataCacheRef.current.set(next.date, next);
      return next;
    });

    const success = await todosService.deleteTodo(id);
    if (success && selectedDate) {
      await loadIndicators();
    }
    return success;
  }, [selectedDate, loadIndicators]);

  const reorderTodos = useCallback(async (todoIds: string[], reorderedTodos: DayData['todos']) => {
    setDayData(prev => {
      if (!prev) return prev;
      const next = { ...prev, todos: reorderedTodos };
      dayDataCacheRef.current.set(next.date, next);
      return next;
    });
    await todosService.reorderTodos(todoIds);
  }, []);

  const updateStickyNote = useCallback(async (id: string, content: string) => {
    if (!selectedDate) return null;
    const trimmedContent = content.trim();

    if (!id && trimmedContent.length > 0) {
      const newNote = await stickyNotesService.createStickyNote(selectedDate, content);
      if (!newNote) {
        return null;
      }
      setStickyNote(newNote);
      setDayData(prev => {
        if (!prev) return prev;
        const next = { ...prev, stickyNotes: [newNote] };
        dayDataCacheRef.current.set(next.date, next);
        return next;
      });
      await loadIndicators();
      return newNote;
    }

    if (id && trimmedContent.length === 0) {
      await stickyNotesService.deleteStickyNote(id);
      setStickyNote({ id: '', date: selectedDate, content: '' });
      setDayData(prev => {
        if (!prev) return prev;
        const next = { ...prev, stickyNotes: [] };
        dayDataCacheRef.current.set(next.date, next);
        return next;
      });
      await loadIndicators();
      return null;
    }

    if (id) {
      const updated = await stickyNotesService.updateStickyNote(id, content);
      if (updated) {
        setStickyNote(updated);
        setDayData(prev => {
          if (!prev) return prev;
          const next = { ...prev, stickyNotes: [updated] };
          dayDataCacheRef.current.set(next.date, next);
          return next;
        });
        await loadIndicators();
      }
      return updated;
    }

    return null;
  }, [selectedDate, loadIndicators]);

  const refreshData = useCallback(async () => {
    await loadIndicators();
    if (selectedDate) {
      await loadDayData(selectedDate);
    }
  }, [loadIndicators, loadDayData, selectedDate]);

  return {
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
    refreshData,
  };
}
