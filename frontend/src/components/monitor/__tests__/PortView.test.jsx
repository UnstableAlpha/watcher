import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PortView from '../PortView';

describe('PortView', () => {
    const mockProps = {
        groupedPorts: [
            {
                portId: '80',
                protocol: 'tcp',
                service: 'http',
                hosts: [
                    { address: '192.168.1.1', status: 'up' },
                    { address: '192.168.1.2', status: 'up' }
                ]
            }
        ],
        filteredHosts: new Set(['192.168.1.1', '192.168.1.2']),
        handleExport: vi.fn(),
        basePort: null,
        baseService: null,
        additionalFilters: [],
        additionalServiceFilters: [],
        availablePorts: ['80', '443'],
        availableServices: ['http', 'https'],
        handlePortSelect: vi.fn(),
        handleServiceSelect: vi.fn(),
        toggleOperation: vi.fn(),
        toggleServiceOperation: vi.fn(),
        removeFilter: vi.fn(),
        removeServiceFilter: vi.fn(),
        clearAllFilters: vi.fn(),
        clearAllServiceFilters: vi.fn()
    };

    it('renders port information correctly', () => {
        render(<PortView {...mockProps} />);
        expect(screen.getByText('TCP/80')).toBeInTheDocument();
        expect(screen.getByText('Service: http')).toBeInTheDocument();
    });

    it('renders host list correctly', () => {
        render(<PortView {...mockProps} />);
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.2')).toBeInTheDocument();
    });

    it('handles export button click', () => {
        render(<PortView {...mockProps} />);
        const exportButton = screen.getByText('Export Hosts');
        fireEvent.click(exportButton);
        expect(mockProps.handleExport).toHaveBeenCalledWith(mockProps.groupedPorts[0]);
    });
}); 