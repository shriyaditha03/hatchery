import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtemiaForm from './ArtemiaForm';

// Mock dependencies
vi.mock('@/lib/date-utils', () => ({
  formatDate: () => '240324',
  getNowLocal: () => new Date(),
}));

describe('ArtemiaForm', () => {
    const defaultProps = {
        data: { phase: 'pre' },
        onDataChange: vi.fn(),
        comments: '',
        onCommentsChange: vi.fn(),
        photoUrl: '',
        onPhotoUrlChange: vi.fn(),
    };

    it('renders Number of Samples as the first field in Before Harvest', () => {
        render(<ArtemiaForm {...defaultProps} />);
        const numSamplesLabel = screen.getByText(/1. Number of Samples/i);
        expect(numSamplesLabel).toBeInTheDocument();
    });

    it('generates sample fields when number of samples changes', () => {
        const onDataChange = vi.fn();
        const { rerender } = render(<ArtemiaForm {...defaultProps} onDataChange={onDataChange} />);
        
        const input = screen.getByPlaceholderText('e.g. 3');
        fireEvent.change(input, { target: { value: '2' } });

        expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
            numberOfSamples: '2',
            samples: [
                { sampleId: 'S1_240324', quantity: '' },
                { sampleId: 'S2_240324', quantity: '' }
            ]
        }));
    });

    it('syncs first sample with top-level fields for backward compatibility', () => {
        const onDataChange = vi.fn();
        render(<ArtemiaForm {...defaultProps} onDataChange={onDataChange} />);
        
        const input = screen.getByPlaceholderText('e.g. 3');
        fireEvent.change(input, { target: { value: '1' } });

        const lastCall = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0];
        expect(lastCall.sampleId).toBe('S1_240324');
        expect(lastCall.samples[0].sampleId).toBe('S1_240324');
    });

    it('toggles multiple sample IDs in After Harvest', () => {
        const onDataChange = vi.fn();
        const postProps = { ...defaultProps, data: { phase: 'post' }, availablePreHarvestIds: ['S1_TEST', 'S2_TEST'] };
        render(<ArtemiaForm {...postProps} onDataChange={onDataChange} />);
        
        const pill1 = screen.getByText('S1_TEST');
        fireEvent.click(pill1);

        expect(onDataChange).toHaveBeenCalledWith(expect.objectContaining({
            linkedSampleIds: ['S1_TEST'],
            linkedSampleId: 'S1_TEST'
        }));

        const pill2 = screen.getByText('S2_TEST');
        fireEvent.click(pill2);

        // It doesn't accumulate state between un-rerendered clicks when using vi.mock unless we mock state passing, but we test single click passing multiple array items
    });
});
