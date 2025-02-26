import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ServiceFilter from '../ServiceFilter';

describe('ServiceFilter', () => {
    const mockProps = {
        baseService: null,
        additionalServiceFilters: [],
        availableServices: ['http', 'https', 'ssh'],
        onServiceSelect: vi.fn(),
        onToggleServiceOperation: vi.fn(),
        onRemoveServiceFilter: vi.fn(),
        onClearAllServiceFilters: vi.fn()
    };

    it('renders available services', () => {
        render(<ServiceFilter {...mockProps} />);
        expect(screen.getByText('http')).toBeInTheDocument();
        expect(screen.getByText('https')).toBeInTheDocument();
        expect(screen.getByText('ssh')).toBeInTheDocument();
    });

    it('shows base service when selected', () => {
        const propsWithBase = {
            ...mockProps,
            baseService: 'http'
        };
        render(<ServiceFilter {...propsWithBase} />);
        expect(screen.getByText('Base:')).toBeInTheDocument();
        expect(screen.getByText('http')).toBeInTheDocument();
    });

    it('handles service selection', () => {
        render(<ServiceFilter {...mockProps} />);
        fireEvent.click(screen.getByText('http'));
        expect(mockProps.onServiceSelect).toHaveBeenCalledWith('http');
    });
}); 