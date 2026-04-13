import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpawningForm from '../SpawningForm';

describe('SpawningForm', () => {
  const mockProps = {
    data: {
      spawningTanks: [
        {
          id: '1',
          tankId: 'tank-1',
          tankName: 'Tank 1',
          shiftedCount: '10',
          spawnedCount: '4',
          balanceCount: '6'
        }
      ],
      returnDestinations: [
        {
          id: 's1',
          tankId: 'source-1',
          tankName: 'Source 1',
          returnCount: '5',
          initialPopulation: 100
        }
      ]
    },
    onDataChange: vi.fn(),
    comments: '',
    onCommentsChange: vi.fn(),
    photoUrl: '',
    onPhotoUrlChange: vi.fn(),
    availableTanks: [],
    farmId: 'farm-1'
  };

  it('calculates balance count and totals correctly', () => {
    render(<SpawningForm {...mockProps} />);
    
    // Total Female Spawned: 4. Check for the value in the summary Card area.
    // The component renders it as: <span className="text-xl font-black text-emerald-950">{totalFemaleSpawned}</span>
    const spawnedSum = screen.getByText('4');
    expect(spawnedSum).toBeInTheDocument();
    // Total Un-spawned: 6. Appears in tank row and summary.
    const unspawnedSums = screen.getAllByText('6');
    expect(unspawnedSums.length).toBe(2);
  });

  it('calculates new population for return destinations', () => {
    render(<SpawningForm {...mockProps} />);
    
    // Initial (100) + Return (5) = 105
    expect(screen.getByText('105')).toBeInTheDocument();
  });

  it('updates balanceCount when spawnedCount changes', () => {
    render(<SpawningForm {...mockProps} />);
    
    // Target the specific input with value '4'
    const input = screen.getByDisplayValue('4');
    fireEvent.change(input, { target: { value: '7' } });
    
    // 10 - 7 = 3
    expect(mockProps.onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      spawningTanks: expect.arrayContaining([
        expect.objectContaining({ 
          spawnedCount: '7',
          balanceCount: '3'
        })
      ])
    }));
  });
});
