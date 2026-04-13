import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders correctly', () => {
    render(<Checkbox id="terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('can be checked and unchecked', () => {
    render(<Checkbox id="terms" />);
    const checkbox = screen.getByRole('checkbox');
    
    // Radix checkbox uses aria-checked
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('is disabled when the disabled prop is passed', () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
