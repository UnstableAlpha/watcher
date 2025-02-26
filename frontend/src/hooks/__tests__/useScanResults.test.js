import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useScanResults } from '../useScanResults';

describe('useScanResults', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mockHost = {
        address: '192.168.1.1',
        ports: [
            { portId: '80', state: 'open' },
            { portId: '443', state: 'open' }
        ]
    };

    it('initializes with default values', () => {
        const { result } = renderHook(() => useScanResults(false));
        
        expect(result.current.scannedHosts).toEqual([]);
        expect(result.current.scanningHosts).toEqual({});
        expect(result.current.error).toBeNull();
    });

    it('fetches scan results when watching is enabled', async () => {
        const mockResults = [mockHost];
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResults
        });

        const { result } = renderHook(() => useScanResults(true));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.scannedHosts).toEqual(mockResults);
    });

    it('handles service scan start correctly', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true
        });

        const { result } = renderHook(() => useScanResults(true));

        await act(async () => {
            const success = await result.current.startServiceScan(mockHost);
            expect(success).toBe(true);
        });

        expect(result.current.scanningHosts[mockHost.address]).toBe(true);
        expect(localStorage.getItem(`scanTime_${mockHost.address}`)).toBeTruthy();
    });

    it('polls for updates at regular intervals', async () => {
        const mockResults1 = [mockHost];
        const mockResults2 = [...mockResults1, { address: '192.168.1.2', ports: [] }];

        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockResults1
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockResults2
            });

        renderHook(() => useScanResults(true));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await act(async () => {
            vi.advanceTimersByTime(30000);
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
}); 