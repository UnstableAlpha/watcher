import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePortFilters } from '../usePortFilters';

describe('usePortFilters', () => {
    const mockHosts = [
        {
            address: '192.168.1.1',
            ports: [
                { portId: '80', protocol: 'tcp', state: 'open' },
                { portId: '443', protocol: 'tcp', state: 'open' }
            ]
        },
        {
            address: '192.168.1.2',
            ports: [
                { portId: '80', protocol: 'tcp', state: 'open' },
                { portId: '22', protocol: 'tcp', state: 'open' }
            ]
        }
    ];

    it('initializes with default values', () => {
        const { result } = renderHook(() => usePortFilters([]));
        
        expect(result.current.basePort).toBeNull();
        expect(result.current.additionalFilters).toEqual([]);
        expect(result.current.availablePorts).toEqual([]);
        expect(result.current.filteredHosts.size).toBe(0);
    });

    it('updates available ports from scanned hosts', () => {
        const { result } = renderHook(() => usePortFilters(mockHosts));
        
        expect(result.current.availablePorts).toEqual([
            'tcp/22',
            'tcp/80',
            'tcp/443'
        ]);
    });

    it('handles port selection correctly', () => {
        const { result } = renderHook(() => usePortFilters(mockHosts));

        act(() => {
            result.current.handlePortSelect('tcp/80');
        });

        expect(result.current.basePort).toBe('tcp/80');
        expect(result.current.filteredHosts.size).toBe(2); // Both hosts have port 80
    });

    it('handles additional filters', () => {
        const { result } = renderHook(() => usePortFilters(mockHosts));

        act(() => {
            result.current.handlePortSelect('tcp/80'); // base port
            result.current.handlePortSelect('tcp/443'); // AND filter
        });

        expect(result.current.additionalFilters).toHaveLength(1);
        expect(result.current.filteredHosts.size).toBe(1); // Only first host has both ports
    });

    it('toggles filter operations correctly', () => {
        const { result } = renderHook(() => usePortFilters(mockHosts));

        act(() => {
            result.current.handlePortSelect('tcp/80');
            result.current.handlePortSelect('tcp/443');
            result.current.toggleOperation(0);
        });

        expect(result.current.additionalFilters[0].operation).toBe('OR');
    });

    it('clears all filters', () => {
        const { result } = renderHook(() => usePortFilters(mockHosts));

        act(() => {
            result.current.handlePortSelect('tcp/80');
            result.current.handlePortSelect('tcp/443');
            result.current.clearAllFilters();
        });

        expect(result.current.basePort).toBeNull();
        expect(result.current.additionalFilters).toEqual([]);
        expect(result.current.filteredHosts.size).toBe(2); // All hosts shown when no filters
    });
}); 