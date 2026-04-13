import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import EggCountForm from '../EggCountForm';

describe('EggCountForm', () => {
  const mockProps = {
    data: {
      entries: [
        {
          id: '1',
          tankId: 'tank-1',
          tankName: 'Tank 1',
          spawnedCount: '10',
          totalEggsMillions: '100',
          fertilizationPercent: '90'
        },
        {
          id: '2',
          tankId: 'tank-2',
          tankName: 'Tank 2',
          spawnedCount: '10',
          totalEggsMillions: '100',
          fertilizationPercent: '80'
        }
      ],
      summary: {}
    },
    onDataChange: vi.fn(),
    comments: '',
    onCommentsChange: vi.fn(),
    photoUrl: '',
    onPhotoUrlChange: vi.fn(),
    availableTanks: [],
    farmId: 'farm-1'
  };

  it('calculates summary stats correctly', async () => {
    // Total Eggs: 100 + 100 = 200
    // Total Fertilized: (100 * 0.9) + (100 * 0.8) = 90 + 80 = 170
    // Avg Fert %: (170 / 200) * 100 = 85%
    // Eggs per Animal: (170 * 1,000,000) / (20) = 170,000,000 / 20 = 8,500,000
    
    render(<EggCountForm {...mockProps} />);
    
    // The useEffect in EggCountForm calculates this and calls onDataChange
    expect(mockProps.onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      summary: {
        totalEggs: 200,
        totalFertilized: 170,
        avgFertilization: 85,
        totalAnimals: 20,
        eggsPerAnimal: 8.5
      }
    }));
  });

  it('displays summary metrics in cards', () => {
    const dataWithSummary = {
      ...mockProps.data,
      summary: {
        totalEggs: 200,
        totalFertilized: 170,
        avgFertilization: 85,
        totalAnimals: 20,
        eggsPerAnimal: 8.5
      }
    };
    
    render(<EggCountForm {...mockProps} data={dataWithSummary} />);
    
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('170')).toBeInTheDocument();
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });
});
