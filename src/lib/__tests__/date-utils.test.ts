import { describe, it, expect, vi } from 'vitest';
import { toLocal, formatDate, getTodayStr, isTodayLocal, getDateRangeUTC } from '../date-utils';

describe('date-utils', () => {
  describe('toLocal', () => {
    it('should convert a string to a Date object', () => {
      const dateStr = '2026-03-31';
      const result = toLocal(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should handle timestamp numbers', () => {
      const timestamp = 1711843200000; // 2024-03-31 GMT
      const result = toLocal(timestamp);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('formatDate', () => {
    it('should format a date string correctly with default pattern', () => {
      // Use a date that is likely to be stable across timezones or just test the pattern
      const date = new Date(2026, 2, 31); // Mar 31 2026 local
      const result = formatDate(date);
      expect(result).toBe('31-03-2026');
    });

    it('should format a date with custom pattern', () => {
      const date = new Date(2026, 2, 31);
      const result = formatDate(date, 'yyyy/MM/dd');
      expect(result).toBe('2026/03/31');
    });
  });

  describe('getTodayStr', () => {
    it('should return a string in yyyy-MM-dd format', () => {
      const result = getTodayStr();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isTodayLocal', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isTodayLocal(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isTodayLocal(yesterday)).toBe(false);
    });
  });

  describe('getDateRangeUTC', () => {
    it('should return valid ISO strings for start and end of day local', () => {
      const range = getDateRangeUTC('2026-03-31', '2026-03-31');
      // Should be valid ISO strings (ending with Z)
      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // The difference between start and end should be exactly 1 day (minus 1ms)
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diff = end.getTime() - start.getTime();
      expect(diff).toBe(86400000 - 1); 
    });
  });
});
