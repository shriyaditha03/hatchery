import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RatingScale from './RatingScale';

describe('RatingScale', () => {
    it('renders label and correct number of buttons', () => {
        const onChange = vi.fn();
        render(<RatingScale value={0} label="Quality" onChange={onChange} />);
        
        expect(screen.getByText('Quality')).toBeInTheDocument();
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(10);
    });

    it('highlights the selected button', () => {
        const onChange = vi.fn();
        render(<RatingScale value={3} onChange={onChange} label="Quality" />);
        
        let buttons = screen.getAllByRole('button');
        // value 3 is the 3rd button (index 2)
        expect(buttons[2]).toHaveClass('bg-primary');
        expect(buttons[0]).not.toHaveClass('bg-primary');
    });

    it('calls onChange when a button is clicked', () => {
        const onChange = vi.fn();
        render(<RatingScale value={0} label="Quality" onChange={onChange} />);
        
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[3]); // n=4
        
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(4);
    });
});
