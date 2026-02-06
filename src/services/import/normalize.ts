import type { ImportStickyNoteRecord, ImportTodoRecord } from './types';

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const TRUE_VALUES = new Set(['true', '1', 'yes', 'x']);
const FALSE_VALUES = new Set(['false', '0', 'no', '']);

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function normalizeDate(value: string): string {
  return value.trim();
}

export function isValidDateString(value: string): boolean {
  const match = DATE_REGEX.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
  );
}

export function normalizeContent(value: string): string {
  return normalizeLineEndings(value).trim();
}

export function normalizeScheduledTime(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = normalizeLineEndings(String(value)).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCompletedValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return null;
}

export function normalizeTextForKey(value: string): string {
  return normalizeLineEndings(value)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeScheduledTimeForKey(value: string | null): string {
  return normalizeTextForKey(value ?? '');
}

export function buildTodoDedupeKey(todo: ImportTodoRecord): string {
  return [
    todo.date,
    normalizeTextForKey(todo.content),
    todo.completed ? '1' : '0',
    normalizeScheduledTimeForKey(todo.scheduledTime),
  ].join('|');
}

export function buildStickyNoteDedupeKey(note: ImportStickyNoteRecord): string {
  return [
    note.date,
    normalizeTextForKey(note.content),
  ].join('|');
}

export function generateImportContentHash(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildImportMarker(contentHash: string): string {
  return `<!-- journai-import:${contentHash} -->`;
}

export function hasImportMarker(content: string, contentHash: string): boolean {
  return normalizeLineEndings(content).includes(buildImportMarker(contentHash));
}

export function extractImportMarkers(content: string): Set<string> {
  const markers = new Set<string>();
  const normalized = normalizeLineEndings(content);
  const regex = /<!--\s*journai-import:([0-9a-fA-F]+)\s*-->/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    markers.add(match[1].toLowerCase());
  }

  return markers;
}

export function appendImportedContent(existingContent: string, importedContent: string, contentHash: string): string {
  const existing = normalizeLineEndings(existingContent).trimEnd();
  const imported = normalizeContent(importedContent);
  return `${existing}\n\n---\n\n${buildImportMarker(contentHash)}\n${imported}`;
}
