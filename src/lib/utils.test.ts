import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge class names correctly', () => {
        expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
        expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
    });

    it('should merge tailwind classes correctly via twMerge', () => {
        // p-4 and p-8 should merge to p-8
        expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should handle undefined and null inputs', () => {
        expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
    });

    it('should handle complex nesting', () => {
        expect(cn('class1', ['class2', ['class3']], { 'class4': true, 'class5': false })).toBe('class1 class2 class3 class4');
    });
});
