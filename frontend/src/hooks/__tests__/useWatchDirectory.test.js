import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWatchDirectory } from '../useWatchDirectory';

describe('useWatchDirectory', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => useWatchDirectory());
        
        expect(result.current.watchDirectory).toBe('');
        expect(result.current.isWatching).toBe(false);
        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('fetches watch directory on mount', async () => {
        const mockDirectory = '/test/dir';
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ directory: mockDirectory }),
        });

        const { result } = renderHook(() => useWatchDirectory());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.watchDirectory).toBe(mockDirectory);
        expect(result.current.isWatching).toBe(true);
        expect(result.current.loading).toBe(false);
    });

    it('handles fetch errors', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useWatchDirectory());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.error).toBe('Failed to fetch current watch directory');
        expect(result.current.loading).toBe(false);
    });

    it('updates watch directory successfully', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true });

        const { result } = renderHook(() => useWatchDirectory());

        await act(async () => {
            const success = await result.current.updateWatchDirectory('/new/dir');
            expect(success).toBe(true);
        });

        expect(result.current.watchDirectory).toBe('/new/dir');
        expect(result.current.isWatching).toBe(true);
        expect(result.current.error).toBeNull();
    });
}); 