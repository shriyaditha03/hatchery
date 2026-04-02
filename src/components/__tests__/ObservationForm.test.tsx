import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ObservationForm from '../ObservationForm';

describe('ObservationForm', () => {
  const mockOnDataChange = vi.fn();
  const mockOnCommentsChange = vi.fn();
  const mockOnPhotoUrlChange = vi.fn();
  const mockOnGoToStocking = vi.fn();

  const lrtData = {
    stockingId: 'BATCH001',
    broodstockSource: 'Hatchery A',
    hatcheryName: 'LRT Section 1',
    tankStockingNumber: '5000',
    naupliiStockedMillion: '0.5',
    presentPopulation: '4500'
  };

  const maturationData = {
    stockingId: 'BATCH002',
    broodstockSource: 'Ocean Center',
    hatcheryName: 'Maturation A',
    broodstockType: 'Wild',
    sex: 'Female',
    tankStockingNumber: '50',
    presentPopulation: '48'
  };

  it('renders LRT-specific fields correctly', () => {
    render(
      <ObservationForm 
        data={lrtData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
        photoUrl=""
        onPhotoUrlChange={mockOnPhotoUrlChange}
        activeFarmCategory="LRT"
      />
    );

    expect(screen.getByText(/Hatchery Source/i)).toBeDefined();
    expect(screen.getByText(/Nauplii Stocked \(M\)/i)).toBeDefined();
    expect(screen.queryByText(/Broodstock Type/i)).toBeNull();
  });

  it('renders Maturation-specific fields correctly', () => {
    render(
      <ObservationForm 
        data={maturationData} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
        photoUrl=""
        onPhotoUrlChange={mockOnPhotoUrlChange}
        activeFarmCategory="MATURATION"
      />
    );

    expect(screen.getByText(/Broodstock Source/i)).toBeDefined();
    expect(screen.getByText(/Broodstock Type/i)).toBeDefined();
    expect(screen.getByText(/Sex/i)).toBeDefined();
    expect(screen.queryByText(/Nauplii Stocked \(M\)/i)).toBeNull();
  });

  it('shows "No Stocking Record Found" when data is missing', () => {
    render(
      <ObservationForm 
        data={{}} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
        photoUrl=""
        onPhotoUrlChange={mockOnPhotoUrlChange}
        onGoToStocking={mockOnGoToStocking}
      />
    );

    const button = screen.getByText(/No Stocking Record Found/i);
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(mockOnGoToStocking).toHaveBeenCalled();
  });

  it('calculates and displays scores correctly', () => {
    const dataWithRatings = {
      ...lrtData,
      animalRatings: { 'swimmingActivity': 8, 'size': 10 },
      observationWaterData: { 'Temperature': '28', 'Salinity': '30' }
    };

    render(
      <ObservationForm 
        data={dataWithRatings} 
        onDataChange={mockOnDataChange} 
        comments="" 
        onCommentsChange={mockOnCommentsChange} 
        photoUrl=""
        onPhotoUrlChange={mockOnPhotoUrlChange}
      />
    );

    // Initial avg should be visible if passed
    expect(screen.getByText('9.0 / 10')).toBeDefined();
  });
});
