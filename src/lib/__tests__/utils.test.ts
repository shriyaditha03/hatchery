import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('should handle conditional classes', () => {
      expect(cn('bg-red-500', true && 'text-white', false && 'hidden')).toBe('bg-red-500 text-white');
    });

    it('should merge tailwind classes properly (tailwind-merge)', () => {
      // should merge p-2 and p-4 into p-4
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('should handle undefined and null inputs', () => {
      expect(cn('p-2', undefined, null)).toBe('p-2');
    });
  });
});
