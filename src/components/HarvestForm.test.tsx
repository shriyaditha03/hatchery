import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HarvestForm from './HarvestForm';

describe('HarvestForm', () => {
  let mockOnDataChange: any;
  let mockOnCommentsChange: any;

  beforeEach(() => {
    mockOnDataChange = vi.fn();
    mockOnCommentsChange = vi.fn();
  });

  const getProps = (dataOverrides = {}, isPlanningMode = false) => ({
    data: {
      harvestMode: 'population',
      populationBeforeHarvest: '1000',
      ...dataOverrides,
    },
    onDataChange: mockOnDataChange,
    comments: '',
    onCommentsChange: mockOnCommentsChange,
    isPlanningMode,
  });

  it('renders correctly and shows renamed "To Harvest" field in population mode', () => {
    render(<HarvestForm {...getProps()} />);
    expect(screen.getByText('3. To Harvest *')).toBeInTheDocument();
    expect(screen.getByText('6. Population After Harvest')).toBeInTheDocument();
  });

  it('calculates harvestedPopulation automatically in bag mode', async () => {
    const user = userEvent.setup();
    render(<HarvestForm {...getProps({ harvestMode: 'bag' })} />);

    const sizeInput = screen.getByPlaceholderText('Qty per bag');
    const countInput = screen.getByPlaceholderText('Total bags');

    // Simulate entering bag size
    await user.type(sizeInput, '50');
    expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({ spoonBagSize: '50' }));

    // By re-rendering with updated props, we could test the effect, but we can also just provide both to see if the effect fires
  });

  it('triggers auto-calculation of harvestedPopulation when bag details change', () => {
    // If spoonBagSize and spoonBagCount are present in data and harvestMode is bag, the effect will call onDataChange
    render(<HarvestForm {...getProps({ harvestMode: 'bag', spoonBagSize: '50', spoonBagCount: '10' })} />);
    
    // The effect should trigger an onDataChange with harvestedPopulation: "500"
    expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({ harvestedPopulation: '500' })
    );
  });

  it('auto-calculates population after harvest correctly', () => {
    render(<HarvestForm {...getProps({ populationBeforeHarvest: '1000', harvestedPopulation: '200' })} />);
    
    expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.objectContaining({ populationAfterHarvest: '800' })
    );
  });

  it('stops auto-calculating and appends Manual Edit label when population after harvest is manually edited', async () => {
    const user = userEvent.setup();
    const props = getProps({ populationBeforeHarvest: '1000', harvestedPopulation: '200' });
    const { rerender } = render(<HarvestForm {...props} />);
    
    // To manually edit, the user types in the "Calculated automatically" input (Population After Harvest)
    const afterHarvestInput = screen.getByPlaceholderText('Calculated automatically');
    await user.clear(afterHarvestInput);
    await user.type(afterHarvestInput, '750');

    // The handler should notify the manual edit
    expect(mockOnDataChange).toHaveBeenCalledWith(expect.any(Function));

    // To verify the functional state update manually:
    const updateFn = mockOnDataChange.mock.calls[mockOnDataChange.mock.calls.length - 1][0];
    const newState = updateFn(props.data);
    expect(newState.populationAfterHarvest).toBe('750');
    expect(newState.isAfterPopulationManuallyEdited).toBe(true);

    // If we re-render with manual edit flag true, it should show the "Manual Edit" badge
    rerender(<HarvestForm {...getProps({ populationBeforeHarvest: '1000', harvestedPopulation: '200', populationAfterHarvest: '750', isAfterPopulationManuallyEdited: true })} />);
    expect(screen.getByText('Manual Edit')).toBeInTheDocument();
  });

  it('does not auto-calculate after manual edit', () => {
    render(<HarvestForm {...getProps({ 
        populationBeforeHarvest: '1000', 
        harvestedPopulation: '300', 
        populationAfterHarvest: '750', // Mathematically 700, but manually set to 750
        isAfterPopulationManuallyEdited: true 
    })} />);

    // onDataChange should NOT have been called with an auto-calculated 700
    expect(mockOnDataChange).not.toHaveBeenCalledWith(expect.objectContaining({ populationAfterHarvest: '700' }));
  });
});
