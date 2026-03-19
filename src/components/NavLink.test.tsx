import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavLink } from './NavLink';

describe('NavLink', () => {
    it('renders with children', () => {
        render(
            <MemoryRouter>
                <NavLink to="/test">Test Link</NavLink>
            </MemoryRouter>
        );
        expect(screen.getByText('Test Link')).toBeInTheDocument();
    });

    it('applies activeClassName when active', () => {
        render(
            <MemoryRouter initialEntries={['/test']}>
                <NavLink to="/test" activeClassName="active-class">Test Link</NavLink>
            </MemoryRouter>
        );
        const link = screen.getByRole('link');
        expect(link).toHaveClass('active-class');
    });

    it('applies className when not active', () => {
        render(
            <MemoryRouter initialEntries={['/other']}>
                <NavLink to="/test" className="inactive-class">Test Link</NavLink>
            </MemoryRouter>
        );
        const link = screen.getByRole('link');
        expect(link).toHaveClass('inactive-class');
        expect(link).not.toHaveClass('active-class');
    });
});
