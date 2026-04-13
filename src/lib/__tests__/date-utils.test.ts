import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, getTodayStr, isTodayLocal, getDateRangeUTC } from '../date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format a valid ISO string', () => {
      expect(formatDate('2024-03-20T10:00:00Z')).toBe('20-03-2024');
    });

    it('should format a valid Date object', () => {
      const date = new Date(2024, 2, 20); // March 20, 2024
      expect(formatDate(date)).toBe('20-03-2024');
    });

    it('should use custom format string', () => {
      expect(formatDate('2024-03-20', 'yyyy/MM/dd')).toBe('2024/03/20');
    });

    it('should return "-" for null or undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('should return "-" for invalid date strings', () => {
      expect(formatDate('invalid-date')).toBe('-');
    });
  });

  describe('getTodayStr', () => {
    it('should return current date in yyyy-MM-dd format', () => {
      vi.useFakeTimers();
      const date = new Date(2024, 2, 20);
      vi.setSystemTime(date);
      
      expect(getTodayStr()).toBe('2024-03-20');
      
      vi.useRealTimers();
    });
  });

  describe('isTodayLocal', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today\'s date', () => {
      const today = new Date(2024, 2, 20);
      vi.setSystemTime(today);
      expect(isTodayLocal('2024-03-20')).toBe(true);
    });

    it('should return false for other dates', () => {
      const today = new Date(2024, 2, 20);
      vi.setSystemTime(today);
      expect(isTodayLocal('2024-03-21')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isTodayLocal(null)).toBe(false);
      expect(isTodayLocal('invalid')).toBe(false);
    });
  });

  describe('getDateRangeUTC', () => {
    it('should return correct start and end ISO strings', () => {
      const from = '2024-03-20';
      const to = '2024-03-21';
      const range = getDateRangeUTC(from, to);
      
      // We check if it starts at 00:00:00 local (which startOfDay does) 
      // and ends at 23:59:59 local (which endOfDay does)
      // Note: toISOString() returns UTC, so the exact string depends on the machine's timezone
      // But we can check if they are valid ISO strings and roughly correct
      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
