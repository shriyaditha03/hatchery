import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActivities } from '../useActivities';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useActivities', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  it('should fetch activities successfully', async () => {
    const mockData = [{ id: '1', activity_type: 'test' }];
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useActivities());

    await act(async () => {
      await result.current.fetchActivities();
    });

    expect(result.current.activities).toEqual(mockData);
    expect(result.current.loading).toBe(false);
  });

  it('should add activity successfully', async () => {
    const newRecord = { activity_type: 'spawning', data: {} };
    const mockResponse = { id: 'new-id', ...newRecord };
    
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
    });

    const { result } = renderHook(() => useActivities());

    let id;
    await act(async () => {
      id = await result.current.addActivity(newRecord);
    });

    expect(id).toBe('new-id');
    expect(result.current.activities).toContainEqual(mockResponse);
  });

  it('should handle fetch errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
    });

    const { result } = renderHook(() => useActivities());

    await act(async () => {
      await result.current.fetchActivities();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
