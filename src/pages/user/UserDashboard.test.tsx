import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserDashboard from './UserDashboard';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => ({
    user: { id: 'w1', name: 'John', role: 'worker', hatchery_id: 'h1', access: [{ section_id: 'sec1', section_name: 'Section A', farm_id: 'f1', farm_name: 'Farm 1' }] },
    activeFarmId: 'f1',
    activeSectionId: 'sec1',
    setActiveFarmId: vi.fn(),
    setActiveSectionId: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (callback: any) => callback({ data: [] }), // Default empty response
    })),
  },
}));

const mockInstructions = [
  {
    id: 'i1',
    activity_type: 'Feed',
    sections: { name: 'Grow Out' },
    tanks: { name: 'T1' },
    is_completed: false,
    planned_data: { amount: '10', unit: 'kg', item: 'Grower' },
  },
  {
    id: 'i2',
    activity_type: 'Feed',
    sections: { name: 'Grow Out' },
    tanks: { name: 'T2' },
    is_completed: false,
    planned_data: { amount: '10', unit: 'kg', item: 'Grower' },
  },
  {
    id: 'i3',
    activity_type: 'Water Quality',
    sections: { name: 'Grow Out' },
    tanks: null, // Section-wide
    is_completed: false,
    planned_data: { instructions: 'Check pH' },
  },
  {
    id: 'i4',
    activity_type: 'Observation',
    sections: null,
    farms: { name: 'Main Farm' }, // Farm wide
    tanks: null,
    is_completed: false,
    planned_data: { instructions: 'Farm check' },
  }
];

describe('UserDashboard', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup supabase mock to return our specific structured instructions
    const mockQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };
    
    // The query execution resolves here
    mockQueryBuilder.then = (cb: any) => cb({ data: mockInstructions, error: null });
    
    // For async/await wrapper
    mockQueryBuilder.catch = vi.fn().mockReturnThis();
    const thennable = {
      then: (res: any) => { res({ data: mockInstructions, error: null }); }
    };

    (supabase.from as any) = vi.fn(() => {
        const chain: any = {
            select: () => chain,
            eq: () => chain,
            lte: () => chain,
            or: () => chain,
            order: () => chain,
            then: (resolve: any) => resolve({ data: mockInstructions, error: null }),
        };
        return chain;
    });
  });

  it('renders pending tasks grouped by Section and Activity', async () => {
    render(
      <MemoryRouter>
        <UserDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // It should display exactly 2 "Pending Instructions" groups based on sections:
      // "Grow Out" and "Main Farm (Farm Wide)"
      expect(screen.getAllByText('Grow Out')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Main Farm (Farm Wide)')[0]).toBeInTheDocument();

      // Within "Grow Out", there should be "Feed" and "Water Quality"
      expect(screen.getAllByText('Feed')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Water Quality')[0]).toBeInTheDocument();
      
      // Check that individual cards are rendered inside these groups
      expect(screen.getAllByText('Tank T1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Tank T2')[0]).toBeInTheDocument();
      
      // i3 has null tanks, so it should say "Section Wide"
      expect(screen.getAllByText('Section Wide')[0]).toBeInTheDocument();
    });
  });
});
