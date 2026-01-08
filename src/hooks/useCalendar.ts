import { useState, useEffect, useCallback } from 'react';
import type { DayData, StickyNote } from '../types/todo';
import type { MonthIndicators } from '../services/calendar';
import { getMonthIndicators, getDayData } from '../services/calendar';
import { getTodayString } from '../utils/date';
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

  const loadIndicators = useCallback(async () => {
    setIsLoadingIndicators(true);
    const data = await getMonthIndicators(currentYear, currentMonth);
    setIndicators(data);
    setIsLoadingIndicators(false);
  }, [currentYear, currentMonth]);

  const loadDayData = useCallback(async (date: string) => {
    setIsLoadingDayData(true);
    const data = await getDayData(date);
    setDayData(data);

    if (data.stickyNotes.length > 0) {
      setStickyNote(data.stickyNotes[0]);
    } else {
      setStickyNote({ id: '', date, content: '' });
    }

    setIsLoadingDayData(false);
  }, []);

  useEffect(() => {
    loadIndicators();
  }, [loadIndicators]);

  useEffect(() => {
    if (selectedDate) {
      loadDayData(selectedDate);
    } else {
      setDayData(null);
      setStickyNote(null);
    }
  }, [selectedDate, loadDayData]);

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
        return { ...prev, todos: [...prev.todos, todo] };
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
      return {
        ...prev,
        todos: prev.todos.map(t => t.id === id ? { ...t, ...updates } : t)
      };
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
      return { ...prev, todos: prev.todos.filter(t => t.id !== id) };
    });

    const success = await todosService.deleteTodo(id);
    if (success && selectedDate) {
      await loadIndicators();
    }
    return success;
  }, [selectedDate, loadIndicators]);

  const reorderTodos = useCallback(async (todoIds: string[], reorderedTodos: DayData['todos']) => {
    setDayData(prev => prev ? { ...prev, todos: reorderedTodos } : prev);
    await todosService.reorderTodos(todoIds);
  }, []);

  const updateStickyNote = useCallback(async (id: string, content: string) => {
    if (!selectedDate) return null;

    if (!id && content.length > 0) {
      const newNote = await stickyNotesService.createStickyNote(selectedDate, content);
      setStickyNote(newNote);
      await loadIndicators();
      return newNote;
    }

    if (id) {
      const updated = await stickyNotesService.updateStickyNote(id, content);
      if (updated) {
        setStickyNote(updated);
        await loadIndicators();
      }
      return updated;
    }

    return null;
  }, [selectedDate, loadIndicators]);

  const clearStickyNote = useCallback(async (id: string) => {
    if (!selectedDate) return false;
    if (id) {
      await stickyNotesService.deleteStickyNote(id);
      await loadIndicators();
    }
    setStickyNote({ id: '', date: selectedDate, content: '' });
    return true;
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
    clearStickyNote,
    refreshData,
  };
}
