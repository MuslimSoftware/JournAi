import { describe, it, expect } from 'vitest';
import { parseCursor, createCursor } from '../db';

describe('Database Utilities', () => {
  describe('parseCursor', () => {
    it('parses cursor with default separator', () => {
      const result = parseCursor('2025-12-20|abc123', { columns: ['date', 'id'], separator: '|' });
      expect(result).toEqual(['2025-12-20', 'abc123']);
    });

    it('parses cursor with custom separator', () => {
      const result = parseCursor('2025-12-20::abc123', { columns: ['date', 'id'], separator: '::' });
      expect(result).toEqual(['2025-12-20', 'abc123']);
    });
  });

  describe('createCursor', () => {
    it('creates cursor with default separator', () => {
      const result = createCursor(['2025-12-20', 'abc123'], { columns: ['date', 'id'], separator: '|' });
      expect(result).toBe('2025-12-20|abc123');
    });

    it('creates cursor with custom separator', () => {
      const result = createCursor(['2025-12-20', 'abc123'], { columns: ['date', 'id'], separator: '::' });
      expect(result).toBe('2025-12-20::abc123');
    });
  });
});
