import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ObservationForm from '../ObservationForm';

describe('ObservationForm', () => {
  const mockProps = {
    data: {
      animalRatings: {},
      observationWaterData: {},
      presentPopulationM: '100',
      presentPopulationF: '100',
      stockingId: 'batch-123'
    },
    onDataChange: vi.fn(),
    comments: '',
    onCommentsChange: vi.fn(),
    photoUrl: '',
    onPhotoUrlChange: vi.fn(),
    activeFarmCategory: 'LRT'
  };

  it('calculates animal quality average correctly', async () => {
    const dataWithRatings = {
      ...mockProps.data,
      animalRatings: {
        'swimmingActivity': 10,
        'homogenousStage': 8,
        'hepatopancreas': 6
      }
    };
    
    // We render the form and check the calculated avg which is displayed in the button
    render(<ObservationForm {...mockProps} data={dataWithRatings} />);
    
    // Avg of 10, 8, 6 is 8.0
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('calculates water quality compliance correctly', () => {
    const dataWithWater = {
      ...mockProps.data,
      observationWaterData: {
        'Salinity': '30', 
        'pH': '8.2',      
        'Vibrio Count': '500' 
      }
    };

    render(<ObservationForm {...mockProps} data={dataWithWater} />);
    
    // Compliance average: Salinity (10), pH (10), Vibrio Count (10) = 10.0
    expect(screen.getByText('10.0')).toBeInTheDocument();
  });

  it('adjusts population based on mortality in MATURATION mode', () => {
    const maturationProps = {
      ...mockProps,
      activeFarmCategory: 'MATURATION',
      data: {
        ...mockProps.data,
        presentPopulationM: '100',
        presentPopulationF: '100',
        mortalityM: '5',
        mortalityF: '10'
      }
    };

    render(<ObservationForm {...maturationProps} />);

    // The component has a useEffect that calls onDataChange when mortality changes
    // 100 - 5 = 95
    // 100 - 10 = 90
    expect(mockProps.onDataChange).toHaveBeenCalledWith(expect.objectContaining({
      presentPopulationM: '95',
      presentPopulationF: '90'
    }));
  });
});
