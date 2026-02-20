import type { DayData } from '../types/todo';
import { select } from '../lib/db';
import { getTodosByDateRange, getTodosCountByDate } from './todos';
import { getStickyNotesByDateRange, getDatesWithStickyNotes } from './stickyNotes';

interface EntryRow {
  id: string;
  date: string;
  content: string;
}

export interface MonthIndicators {
  entriesDates: Set<string>;
  todosCounts: Map<string, { total: number; completed: number }>;
  stickyNotesDates: Set<string>;
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getMonthIndicatorsRange(year: number, month: number): { startDate: string; endDate: string } {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const startBuffer = new Date(firstOfMonth);
  startBuffer.setDate(startBuffer.getDate() - 7);

  const endBuffer = new Date(lastOfMonth);
  endBuffer.setDate(endBuffer.getDate() + 7);

  return {
    startDate: toDateString(startBuffer),
    endDate: toDateString(endBuffer),
  };
}

export async function getIndicatorsByDateRange(startDate: string, endDate: string): Promise<MonthIndicators> {
  const normalizedStart = startDate <= endDate ? startDate : endDate;
  const normalizedEnd = startDate <= endDate ? endDate : startDate;

  const [entriesRows, todosCounts, stickyNotesDates] = await Promise.all([
    select<{ date: string }>('SELECT DISTINCT date FROM entries WHERE date >= $1 AND date <= $2', [normalizedStart, normalizedEnd]),
    getTodosCountByDate(normalizedStart, normalizedEnd),
    getDatesWithStickyNotes(normalizedStart, normalizedEnd),
  ]);

  return {
    entriesDates: new Set(entriesRows.map(r => r.date)),
    todosCounts,
    stickyNotesDates,
  };
}

export async function getMonthIndicators(year: number, month: number): Promise<MonthIndicators> {
  const { startDate, endDate } = getMonthIndicatorsRange(year, month);
  return getIndicatorsByDateRange(startDate, endDate);
}

export async function getDayData(date: string): Promise<DayData> {
  const [entryRows, todos, stickyNotes] = await Promise.all([
    select<EntryRow>('SELECT id, date, content FROM entries WHERE date = $1 ORDER BY created_at DESC LIMIT 1', [date]),
    getTodosByDateRange(date, date),
    getStickyNotesByDateRange(date, date),
  ]);

  const entry = entryRows[0];
  const preview = entry?.content
    ? (entry.content.length > 100 ? entry.content.substring(0, 100) + '...' : entry.content)
    : null;

  return {
    date,
    hasEntry: !!entry,
    entryId: entry?.id ?? null,
    entryPreview: preview,
    todos,
    stickyNotes,
  };
}
