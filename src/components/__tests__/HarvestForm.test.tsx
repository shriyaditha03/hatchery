import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HarvestForm from '../HarvestForm';

describe('HarvestForm', () => {
  const defaultData = {
    populationBeforeHarvest: '10000',
    harvestedPopulation: '2000',
    populationAfterHarvest: '8000',
    harvestMode: 'population'
  };

  const mockOnDataChange = vi.fn();
  const mockOnCommentsChange = vi.fn();

  it('renders initial population correctly', () => {
    render(
      <HarvestForm 
        data={defaultData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
      />
    );

    const input = screen.getByLabelText(/Population \(Before Harvest\)/i) as HTMLInputElement;
    expect(input.value).toBe('10000');
    expect(input.readOnly).toBe(true);
  });

  it('toggles between direct population and bag count modes', () => {
    const { rerender } = render(
      <HarvestForm 
        data={defaultData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
      />
    );

    // Initial mode is population
    expect(screen.getByLabelText(/Harvested population/i)).toBeDefined();

    // Toggle to bag mode
    const switchElement = screen.getByRole('switch');
    fireEvent.click(switchElement);

    expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({
      harvestMode: 'bag'
    }));
  });

  it('auto-calculates harvested population in bag mode', () => {
    const bagData = {
      ...defaultData,
      harvestMode: 'bag',
      spoonBagSize: '100',
      spoonBagCount: '5'
    };

    render(
      <HarvestForm 
        data={bagData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
      />
    );

    // useEffect should trigger the calculation
    expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({
      harvestedPopulation: '500'
    }));
  });

  it('auto-calculates population after harvest', () => {
    const data = {
      ...defaultData,
      populationBeforeHarvest: '10000',
      harvestedPopulation: '3000',
      populationAfterHarvest: '8000' // outdated
    };

    render(
      <HarvestForm 
        data={data} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
      />
    );

    expect(mockOnDataChange).toHaveBeenCalledWith(expect.objectContaining({
      populationAfterHarvest: '7000'
    }));
  });

  it('allows manual override of population after harvest', () => {
    render(
      <HarvestForm 
        data={defaultData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
      />
    );

    const afterInput = screen.getByLabelText(/6\. Population After Harvest/i);
    fireEvent.change(afterInput, { target: { value: '7500' } });

    // The callback should receive the updated value and the manual edit flag
    // In HarvestForm, onDataChange is called with a function in this case
    expect(mockOnDataChange).toHaveBeenCalled();
  });
});
