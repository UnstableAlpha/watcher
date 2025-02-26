import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useServiceFilters } from '../useServiceFilters';

describe('useServiceFilters', () => {
    const mockHosts = [
        {
            address: '192.168.1.1',
            ports: [
                { portId: '80', protocol: 'tcp', state: 'open', service: 'http' },
                { portId: '443', protocol: 'tcp', state: 'open', service: 'https' }
            ]
        },
        {
            address: '192.168.1.2',
            ports: [
                { portId: '80', protocol: 'tcp', state: 'open', service: 'http' },
                { portId: '22', protocol: 'tcp', state: 'open', service: 'ssh' }
            ]
        }
    ];

    it('initializes with default values', () => {
        const { result } = renderHook(() => useServiceFilters([]));
        
        expect(result.current.baseService).toBeNull();
        expect(result.current.additionalServiceFilters).toEqual([]);
        expect(result.current.availableServices).toEqual([]);
        expect(result.current.filteredHostsByService.size).toBe(0);
    });

    it('updates available services from scanned hosts', () => {
        const { result } = renderHook(() => useServiceFilters(mockHosts));
        
        expect(result.current.availableServices).toEqual([
            'http',
            'https',
            'ssh'
        ]);
    });

    it('handles service selection correctly', () => {
        const { result } = renderHook(() => useServiceFilters(mockHosts));

        act(() => {
            result.current.handleServiceSelect('http');
        });

        expect(result.current.baseService).toBe('http');
        expect(result.current.filteredHostsByService.size).toBe(2); // Both hosts have http
    });

    it('handles additional service filters', () => {
        const { result } = renderHook(() => useServiceFilters(mockHosts));

        act(() => {
            result.current.handleServiceSelect('http'); // base service
            result.current.handleServiceSelect('https'); // AND filter
        });

        expect(result.current.additionalServiceFilters).toHaveLength(1);
        expect(result.current.filteredHostsByService.size).toBe(1); // Only first host has both services
    });

    it('toggles filter operations correctly', () => {
        const { result } = renderHook(() => useServiceFilters(mockHosts));

        act(() => {
            result.current.handleServiceSelect('http');
            result.current.handleServiceSelect('https');
            result.current.toggleServiceOperation(0);
        });

        expect(result.current.additionalServiceFilters[0].operation).toBe('OR');
    });

    it('clears all service filters', () => {
        const { result } = renderHook(() => useServiceFilters(mockHosts));

        act(() => {
            result.current.handleServiceSelect('http');
            result.current.handleServiceSelect('https');
            result.current.clearAllServiceFilters();
        });

        expect(result.current.baseService).toBeNull();
        expect(result.current.additionalServiceFilters).toEqual([]);
        expect(result.current.filteredHostsByService.size).toBe(2); // All hosts shown when no filters
    });
}); 