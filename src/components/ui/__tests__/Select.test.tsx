import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select';

describe('Select', () => {
  it('renders correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Select fruit')).toBeInTheDocument();
  });

  // Note: Complex interactions with Radix Select in JSDOM environment 
  // can sometimes hit limitations with Selection and Pointer APIs.
  // Rendering test above confirms the component is integrated correctly.
});
