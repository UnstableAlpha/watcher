import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HostView from '../HostView';

describe('HostView', () => {
    const mockProps = {
        scannedHosts: [
            {
                address: '192.168.1.1',
                ports: [
                    {
                        portId: '80',
                        protocol: 'tcp',
                        state: 'open',
                        service: 'http'
                    }
                ]
            }
        ],
        scanningHosts: {},
        handleServiceScan: vi.fn(),
        formatLastScanTime: () => 'Mock time'
    };

    it('renders host information correctly', () => {
        render(<HostView {...mockProps} />);
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
        expect(screen.getByText('TCP/80')).toBeInTheDocument();
        expect(screen.getByText('http')).toBeInTheDocument();
    });

    it('handles service scan button click', () => {
        render(<HostView {...mockProps} />);
        const scanButton = screen.getByText('Service Scan');
        fireEvent.click(scanButton);
        expect(mockProps.handleServiceScan).toHaveBeenCalledWith(mockProps.scannedHosts[0]);
    });
}); 