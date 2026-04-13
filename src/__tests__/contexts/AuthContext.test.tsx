import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import React from 'react';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}));

// Helper to wrap with AuthProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock getSession to return no session by default
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
  });

  it('initializes with loading state and null user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('handles successful login with legacy admin', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.loginWithUsername('admin', 'admin123');
      expect(response.error).toBe(null);
    });

    expect(result.current.user?.username).toBe('admin');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login failure with invalid credentials', async () => {
    (supabase.rpc as any).mockResolvedValue({ data: 'test@example.com', error: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ 
      data: { user: null }, 
      error: { message: 'Invalid credentials' } 
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.loginWithUsername('wronguser', 'wrongpass');
      expect(response.error).toEqual({ message: 'Invalid credentials' });
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('detects concurrent sessions during login', async () => {
    // 1. Success mock for login flow
    (supabase.rpc as any).mockResolvedValue({ data: 'test@test.com', error: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ 
      data: { user: { id: 'auth-1', email: 'test@test.com' } }, 
      error: null 
    });
    
    // 2. Mock profile fetch with conflicting session key
    // fetchProfile is called during login with skipSessionCheck = true (to allow the initial key set)
    // Wait, the check happens in fetchProfile.
    // If we want to test the CONCURRENT detection, we should test a profile restoration where keys don't match.

    const mockProfile = { 
        id: 'user-1', 
        auth_user_id: 'auth-1', 
        username: 'testuser',
        role: 'worker',
        current_session_key: 'key-in-db' 
    };
    
    // Simulate a pre-existing local key that differs from DB
    localStorage.setItem('session_key_user-1', 'key-local-different');

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });

    // We capture the onAuthStateChange callback
    let authCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: any) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    renderHook(() => useAuth(), { wrapper });

    // Simulate an event that triggers fetchProfile with skipSessionCheck = false
    await act(async () => {
        authCallback('INITIAL_SESSION', { user: { id: 'auth-1', email: 'test@test.com' } });
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
