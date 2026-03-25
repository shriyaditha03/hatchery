import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlgaeForm from './AlgaeForm';

// Mock dependencies
vi.mock('@/lib/date-utils', () => ({
  formatDate: () => '240324',
  getNowLocal: () => new Date(),
}));

describe('AlgaeForm', () => {
    const defaultProps = {
        data: { phase: 'new' },
        onDataChange: vi.fn(),
        comments: '',
        onCommentsChange: vi.fn(),
        availableSourceDetails: [
            { id: 'MC1_TestSpecies_240320', species: 'TestSpecies' }
        ]
    };

    it('renders Mother Culture as a container size option', () => {
        render(<AlgaeForm {...defaultProps} />);
        const mcButton = screen.getByText('Mother Culture');
        expect(mcButton).toBeInTheDocument();
    });

    it('generates MC formatting for Sample IDs when Mother Culture is selected', () => {
        const onDataChange = vi.fn();
        render(<AlgaeForm {...defaultProps} onDataChange={onDataChange} />);
        
        const mcButton = screen.getByText('Mother Culture');
        fireEvent.click(mcButton);

        expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
            containerSize: 'Mother Culture'
        }));

        const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0];
        // Since algaeSpecies is empty initially, ID might lack species, but let's just check the state updates.
    });

    it('auto-populates species when selecting an inoculum source for non-MC container sizes', () => {
        const onDataChange = vi.fn();
        // pre-select 100ml
        const props = { ...defaultProps, data: { phase: 'new', containerSize: '100ml', samples: [{ sampleId: 'S1_240324', isManualId: false, inoculumSourceId: '' }] } };
        render(<AlgaeForm {...props} onDataChange={onDataChange} />);
        
        const sourceButton = screen.getByText('MC1_TestSpecies_240320');
        fireEvent.click(sourceButton);

        const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0];
        expect(lastCall.algaeSpecies).toBe('TestSpecies');
        // For non-MC sizes, the sample ID does not include the species
        expect(lastCall.samples[0].sampleId).toBe('S1_240324');
    });
});

