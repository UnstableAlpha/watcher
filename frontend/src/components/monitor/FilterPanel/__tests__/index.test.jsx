import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FilterPanel from '../index';

describe('FilterPanel', () => {
    const mockProps = {
        basePort: null,
        baseService: null,
        additionalFilters: [],
        additionalServiceFilters: [],
        availablePorts: ['80', '443'],
        availableServices: ['http', 'https'],
        onPortSelect: () => {},
        onServiceSelect: () => {},
        onToggleOperation: () => {},
        onToggleServiceOperation: () => {},
        onRemoveFilter: () => {},
        onRemoveServiceFilter: () => {},
        onClearAllFilters: () => {},
        onClearAllServiceFilters: () => {}
    };

    it('renders both filter components', () => {
        const { container } = render(<FilterPanel {...mockProps} />);
        expect(container.querySelectorAll('.mb-4.p-4.bg-white')).toHaveLength(2);
    });
}); 