import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RecordActivity from './RecordActivity';
import { MemoryRouter } from 'react-router-dom';

const mockAuthContext = {
    user: { id: '123', role: 'supervisor', hatchery_id: '456' },
    activeFarmId: 'farm1',
    activeSectionId: 'sec1',
};

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => mockAuthContext,
}));

const { mockSupabaseChain } = vi.hoisted(() => {
  const mockSupabaseResponse = Promise.resolve({ data: [], error: null });
  return {
    mockSupabaseChain: {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      then: function (resolve: any) {
        return mockSupabaseResponse.then(resolve);
      },
      catch: function (reject: any) {
        return mockSupabaseResponse.catch(reject);
      },
      finally: function (cb: any) {
        return mockSupabaseResponse.finally(cb);
      }
    }
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue(mockSupabaseChain),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Provide a mock for ResizeObserver if recharts or other UI components need it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('RecordActivity', () => {
    it('renders without crashing', async () => {
        render(
            <MemoryRouter>
                <RecordActivity />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.getByText(/Plan Activity/i)).toBeInTheDocument();
        });
    });

    it('renders the "Assign To" field in planning mode', async () => {
        render(
            <MemoryRouter initialEntries={['/record-activity?mode=instruction']}>
                <RecordActivity />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.getByText(/Assign To/i)).toBeInTheDocument();
        });
    });
    
    it('does not render "Assign To" field in regular mode', async () => {
        render(
            <MemoryRouter initialEntries={['/record-activity?mode=activity']}>
                <RecordActivity />
            </MemoryRouter>
        );
        await waitFor(() => {
            expect(screen.queryByText(/Assign To/i)).not.toBeInTheDocument();
        });
    });
});
