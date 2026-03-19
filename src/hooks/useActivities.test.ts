import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivities } from './useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [{ id: '1', activity_type: 'feed' }], error: null })),
                single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => Promise.resolve({ data: [{ id: '1', activity_type: 'updated' }], error: null })),
                })),
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
        })),
    },
}));

describe('useActivities hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'user-123' },
        } as any);
    });

    it('fetches activities successfully', async () => {
        const { result } = renderHook(() => useActivities());
        
        await result.current.fetchActivities();
        
        await waitFor(() => {
            expect(result.current.activities).toHaveLength(1);
            expect(result.current.activities[0].activity_type).toBe('feed');
        });
    });

    it('adds an activity successfully', async () => {
        const { result } = renderHook(() => useActivities());
        
        let newId: string | undefined;
        await waitFor(async () => {
            newId = await result.current.addActivity({
                activity_type: 'treatment',
                data: { test: true }
            });
        });
        
        expect(newId).toBe('new-id');
        await waitFor(() => {
            expect(result.current.activities).toHaveLength(1);
        });
    });

    it('deletes an activity successfully', async () => {
        const { result } = renderHook(() => useActivities());
        
        // Initial state
        await result.current.fetchActivities();
        await waitFor(() => {
            expect(result.current.activities).toHaveLength(1);
        });
        
        await result.current.deleteActivity('1');
        
        await waitFor(() => {
            expect(result.current.activities).toHaveLength(0);
        });
    });
});
