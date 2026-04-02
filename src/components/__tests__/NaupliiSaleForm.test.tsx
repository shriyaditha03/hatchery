import { render, screen, fireEvent } from '@testing-library/react';
import NaupliiSaleForm from '../NaupliiSaleForm';
import { vi } from 'vitest';

const mockAvailableTanks = [
  {
    id: 's1',
    name: 'Section 1',
    tanks: [
      { id: 't1', name: 'Tank 1' },
      { id: 't2', name: 'Tank 2' }
    ]
  }
];

describe('NaupliiSaleForm', () => {
  const defaultProps = {
    data: {},
    onDataChange: vi.fn(),
    comments: '',
    onCommentsChange: vi.fn(),
    photoUrl: '',
    onPhotoUrlChange: vi.fn(),
    availableTanks: mockAvailableTanks
  };

  it('renders all required fields', () => {
    render(<NaupliiSaleForm {...defaultProps} />);
    
    expect(screen.getByText(/1. Select Nauplii Tanks/i)).toBeInTheDocument();
    expect(screen.getByText(/Bonus Percentage/i)).toBeInTheDocument();
    expect(screen.getByText(/No. of Packs Packed/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Gross Nauplii/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Nauplii/i)).toBeInTheDocument();
  });

  it('calculates total gross correctly', () => {
    const { rerender } = render(<NaupliiSaleForm {...defaultProps} />);
    
    // Add a second tank
    const addButton = screen.getByText(/Add Tanks/i);
    fireEvent.click(addButton);

    const inputs = screen.getAllByPlaceholderText('0.0');
    fireEvent.change(inputs[0], { target: { value: '10' } });
    fireEvent.change(inputs[1], { target: { value: '5.5' } });

    // The data change should be reflected in the next render or via the callback
    expect(defaultProps.onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      totalGross: 15.5
    }));
  });

  it('calculates net nauplii with bonus correctly', () => {
    render(<NaupliiSaleForm {...defaultProps} />);
    
    const popInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(popInput, { target: { value: '100' } });

    const bonusInput = screen.getByPlaceholderText('0');
    fireEvent.change(bonusInput, { target: { value: '10' } });

    expect(defaultProps.onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      totalGross: 100,
      netNauplii: 110
    }));
  });
});
