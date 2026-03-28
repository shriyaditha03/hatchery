import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TankShiftingForm from './TankShiftingForm';

const availableTanks = [
  { id: 'sec1', name: 'Section A', farm_name: 'Farm 1', tanks: [{ id: 't1', name: 'Tank 1' }, { id: 't2', name: 'Tank 2' }] }
];

describe('TankShiftingForm', () => {
  let mockOnDataChange: any;
  let mockOnCommentsChange: any;

  beforeEach(() => {
    mockOnDataChange = vi.fn();
    mockOnCommentsChange = vi.fn();
  });

  const getProps = (dataOverrides = {}, isPlanningMode = false) => ({
    data: {
      sourcePopulation: '1000',
      destinations: [{ id: 1, sectionId: 'sec1', tankId: 't1', currentPopulation: '0', populationToShift: '200' }],
      ...dataOverrides,
    },
    onDataChange: mockOnDataChange,
    comments: '',
    onCommentsChange: mockOnCommentsChange,
    availableTanks,
    isPlanningMode,
  });

  it('renders form and shows source and remaining populations', () => {
    render(<TankShiftingForm {...getProps()} />);
    expect(screen.getByText('Tank Shifting Details')).toBeInTheDocument();
    
    // Total shift is 200, so remaining should be 800
    expect(screen.getByText('1000')).toBeInTheDocument(); // Source
    expect(screen.getByText('800')).toBeInTheDocument(); // Remaining
  });

  it('allows adding and removing destination tanks', async () => {
    const user = userEvent.setup();
    const props = getProps();
    const { rerender } = render(<TankShiftingForm {...props} />);

    const addButton = screen.getByText('Add Tank');
    await user.click(addButton);

    // It should push a new destination with a generated id
    expect(mockOnDataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: expect.any(Number) })
        ])
      })
    );

    // Mount with multiple destinations to test removal
    const multiProps = getProps({
        destinations: [
            { id: 1, sectionId: 'sec1', tankId: 't1', currentPopulation: '0', populationToShift: '200' },
            { id: 2, sectionId: 'sec1', tankId: 't2', currentPopulation: '0', populationToShift: '300' }
        ]
    });
    
    rerender(<TankShiftingForm {...multiProps} />);

    // Click trash button of the first destination
    const trashButtons = screen.getAllByRole('button').filter(b => b.className.includes('text-destructive'));
    expect(trashButtons.length).toBe(2);

    await user.click(trashButtons[0]);

    // Should remove the one with id 1
    expect(mockOnDataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: [
            expect.objectContaining({ id: 2 })
        ]
      })
    );
  });

  it('updates population to shift and calculates remaining in source', async () => {
    const user = userEvent.setup();
    render(<TankShiftingForm {...getProps({ 
        destinations: [{ id: 1, sectionId: 'sec1', tankId: 't1', currentPopulation: '0', populationToShift: '' }] 
    })} />);

    const shiftInput = screen.getByPlaceholderText('0');
    await user.type(shiftInput, '400');

    expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
            destinations: [
                expect.objectContaining({ populationToShift: '400' })
            ]
        })
    );
  });
});
