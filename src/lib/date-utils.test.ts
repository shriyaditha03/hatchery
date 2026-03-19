import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, toLocal, isTodayLocal, getDateRangeUTC, getTodayStr } from './date-utils';

describe('date-utils', () => {
    beforeEach(() => {
        // Mocking Date to ensure consistent tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('toLocal', () => {
        it('should correctly convert string to Date object', () => {
            const dateStr = '2026-01-01T10:00:00Z';
            const date = toLocal(dateStr);
            expect(date).toBeInstanceOf(Date);
            expect(date.toISOString()).toBe('2026-01-01T10:00:00.000Z');
        });

        it('should return current date if input is invalid', () => {
            const date = toLocal('invalid-date');
            expect(date).toBeInstanceOf(Date);
            // Since we mocked time to 2026-03-18T12:00:00Z
            expect(date.toISOString()).toBe('2026-03-18T12:00:00.000Z');
        });
    });

    describe('formatDate', () => {
        it('should format date with default pattern', () => {
            const date = '2026-03-18T10:00:00'; // local time
            // Depending on timezone, this might be tricky, but let's assume local
            // Let's use a more explicit date
            const d = new Date(2026, 2, 18); // March 18, 2026
            expect(formatDate(d)).toBe('18-03-2026');
        });

        it('should format date with custom pattern', () => {
            const d = new Date(2026, 2, 18);
            expect(formatDate(d, 'yyyy/MM/dd')).toBe('2026/03/18');
        });
    });

    describe('getTodayStr', () => {
        it('should return current date in yyyy-MM-dd format', () => {
            // Note: getNowLocal returns new Date() which is mocked to 2026-03-18 12:00:00Z
            // If local timezone is UTC, it should be 2026-03-18
            const today = getTodayStr();
            expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(today).toBe('2026-03-18');
        });
    });

    describe('isTodayLocal', () => {
        it('should return true for today', () => {
            const today = new Date('2026-03-18T15:00:00Z');
            expect(isTodayLocal(today)).toBe(true);
        });

        it('should return false for different day', () => {
            const yesterday = new Date('2026-03-17T15:00:00Z');
            expect(isTodayLocal(yesterday)).toBe(false);
        });
    });

    describe('getDateRangeUTC', () => {
        it('should return correct UTC range for local date strings', () => {
            const from = '2026-03-18';
            const to = '2026-03-19';
            const range = getDateRangeUTC(from, to);
            
            // Start of day on 2026-03-18 in local time
            // End of day on 2026-03-19 in local time
            // The result will depend on the system's local timezone.
            // Let's just check if it returns ISO strings and start is before end.
            expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(new Date(range.startDate).getTime()).toBeLessThan(new Date(range.endDate).getTime());
        });
    });
});
