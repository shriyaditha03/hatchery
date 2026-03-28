import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecordActivity from './RecordActivity';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => ({
    user: { id: '123', role: 'supervisor', hatchery_id: '456' },
    activeFarmId: 'farm1',
    activeSectionId: 'sec1',
  }),
}));

describe('RecordActivity', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <RecordActivity />
            </MemoryRouter>
        );
    });

    it('renders the "Assign To" field in planning mode', () => {
        render(
            <MemoryRouter initialEntries={['/record-activity?mode=instruction']}>
                <RecordActivity />
            </MemoryRouter>
        );
        expect(screen.getByText(/Assign To \(Optional\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Anyone \(Open Instruction\)/i)).toBeInTheDocument();
    });
    
    it('does not render "Assign To" field in regular mode', () => {
        render(
            <MemoryRouter initialEntries={['/record-activity?mode=activity']}>
                <RecordActivity />
            </MemoryRouter>
        );
        expect(screen.queryByText(/Assign To \(Optional\)/i)).not.toBeInTheDocument();
    });
});
