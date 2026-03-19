import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

describe('Breadcrumbs', () => {
    it('renders null when on the login page', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            isAuthenticated: false,
        } as any);

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Breadcrumbs />
            </MemoryRouter>
        );
        expect(screen.queryByRole('nav')).not.toBeInTheDocument();
    });

    it('renders home link for owner dashboard', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { role: 'owner', hatchery_name: 'Test Hatchery' },
            loading: false,
            isAuthenticated: true,
        } as any);

        render(
            <MemoryRouter initialEntries={['/owner/dashboard']}>
                <Breadcrumbs />
            </MemoryRouter>
        );
        
        expect(screen.getByText('Test Hatchery')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders functional paths correctly', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { role: 'owner', hatchery_name: 'Test Hatchery' },
            loading: false,
            isAuthenticated: true,
        } as any);

        render(
            <MemoryRouter initialEntries={['/owner/manage-users']}>
                <Breadcrumbs />
            </MemoryRouter>
        );
        
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });

    it('applies light theme styles', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { role: 'owner', hatchery_name: 'Test Hatchery' },
            loading: false,
            isAuthenticated: true,
        } as any);

        render(
            <MemoryRouter initialEntries={['/owner/dashboard']}>
                <Breadcrumbs lightTheme={true} />
            </MemoryRouter>
        );
        
        // Home link should have light theme classes
        const homeLink = screen.getByRole('link', { name: /test hatchery/i });
        expect(homeLink).toHaveClass('text-white/80');
    });
});
