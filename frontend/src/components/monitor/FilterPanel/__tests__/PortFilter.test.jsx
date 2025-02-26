import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PortFilter from '../PortFilter';

describe('PortFilter', () => {
    const mockProps = {
        basePort: null,
        additionalFilters: [],
        availablePorts: ['80', '443', '22'],
        onPortSelect: vi.fn(),
        onToggleOperation: vi.fn(),
        onRemoveFilter: vi.fn(),
        onClearAllFilters: vi.fn()
    };

    it('renders available ports', () => {
        render(<PortFilter {...mockProps} />);
        expect(screen.getByText('80')).toBeInTheDocument();
        expect(screen.getByText('443')).toBeInTheDocument();
        expect(screen.getByText('22')).toBeInTheDocument();
    });

    it('shows base port when selected', () => {
        const propsWithBase = {
            ...mockProps,
            basePort: '80'
        };
        render(<PortFilter {...propsWithBase} />);
        expect(screen.getByText('Base:')).toBeInTheDocument();
        expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('handles port selection', () => {
        render(<PortFilter {...mockProps} />);
        fireEvent.click(screen.getByText('80'));
        expect(mockProps.onPortSelect).toHaveBeenCalledWith('80');
    });
}); 