import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TankShiftingForm from './TankShiftingForm';

const availableTanks = [
  { id: 'sec1', name: 'Section A', farm_name: 'Farm 1', tanks: [{ id: 't1', name: 'Tank 1' }, { id: 't2', name: 'Tank 2' }, { id: 't3', name: 'Tank 3' }] }
];

describe('TankShiftingForm', () => {
  let mockOnDataChange: any;
  let mockOnCommentsChange: any;
  let mockFetchLatestPopulation: any;

  beforeEach(() => {
    mockOnDataChange = vi.fn();
    mockOnCommentsChange = vi.fn();
    mockFetchLatestPopulation = vi.fn().mockResolvedValue(500);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const getProps = (dataOverrides = {}, additionalProps = {}) => ({
    data: {
      sourcePopulation: '1000',
      totalShifted: 0,
      remainingInSource: 1000,
      destinations: [{ id: 1, sectionId: 'sec1', tankId: '', currentPopulation: '0', populationToShift: '' }],
      ...dataOverrides,
    },
    onDataChange: mockOnDataChange,
    comments: '',
    onCommentsChange: mockOnCommentsChange,
    availableTanks,
    isPlanningMode: false,
    sourceTankId: 't1',
    stockedTankIds: ['t2'], // t2 already has stock
    fetchLatestPopulation: mockFetchLatestPopulation,
    ...additionalProps,
  });

  it('renders form and shows source and remaining populations', () => {
    render(<TankShiftingForm {...getProps({
      destinations: [{ id: 1, sectionId: 'sec1', tankId: '', currentPopulation: '0', populationToShift: '200' }],
    })} />);
    expect(screen.getByText('Tank Shifting Details')).toBeInTheDocument();
    
    // Total shift is 200, so remaining should be 800
    expect(screen.getByText('1000')).toBeInTheDocument(); // Source
    expect(screen.getByText('800')).toBeInTheDocument(); // Remaining
  });

  it('filters out the source tank from destination tank options', async () => {
    const user = userEvent.setup();
    render(<TankShiftingForm {...getProps()} />);
    
    // Open destination tank select (t1 is sourceTankId)
    const tankSelect = screen.getAllByRole('combobox')[1]; 
    await user.click(tankSelect);

    // It should have t2 and t3, but NOT t1
    expect(screen.getByText('Tank 2')).toBeInTheDocument();
    expect(screen.getByText('Tank 3')).toBeInTheDocument();
    expect(screen.queryByText('Tank 1')).not.toBeInTheDocument();
  });

  it('triggers mixing warning and auto-populates population when selecting a stocked destination tank', async () => {
    const user = userEvent.setup();
    render(<TankShiftingForm {...getProps()} />);
    
    // Select t2 which is in stockedTankIds
    const tankSelect = screen.getAllByRole('combobox')[1]; 
    await user.click(tankSelect);
    
    const optionT2 = screen.getByText('Tank 2');
    await user.click(optionT2);

    expect(window.confirm).toHaveBeenCalledWith('You are mixing 2 Tanks, are you sure you want to go ahead');
    
    await waitFor(() => {
      // Mock returns 500, so checking if updateDestinations was called with currentPopulation = '500'
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({
          destinations: [
            expect.objectContaining({ currentPopulation: '500', tankId: 't2' })
          ]
        })
      );
    });
  });

  it('cancels destination selection if mixing warning is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false); // User clicks cancel
    const user = userEvent.setup();
    render(<TankShiftingForm {...getProps()} />);
    
    const tankSelect = screen.getAllByRole('combobox')[1]; 
    await user.click(tankSelect);
    
    const optionT2 = screen.getByText('Tank 2');
    await user.click(optionT2);

    expect(window.confirm).toHaveBeenCalledWith('You are mixing 2 Tanks, are you sure you want to go ahead');
    
    // Because they cancelled, onDataChange should NOT be called to update tankId
    expect(mockOnDataChange).not.toHaveBeenCalled();
  });
});
