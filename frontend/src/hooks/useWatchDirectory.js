import { useState, useEffect } from 'react';

export const useWatchDirectory = () => {
    const [watchDirectory, setWatchDirectory] = useState('');
    const [isWatching, setIsWatching] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchWatchDirectory = async () => {
        try {
            console.log('Fetching initial watch directory...');
            const response = await fetch('/api/watch-directory');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Received watch directory:', data);
            setWatchDirectory(data.directory);
            setIsWatching(Boolean(data.directory));
            setError(null);
        } catch (err) {
            console.error('Error fetching watch directory:', err);
            setError('Failed to fetch current watch directory');
        } finally {
            setLoading(false);
        }
    };

    const updateWatchDirectory = async (newDirectory) => {
        if (!newDirectory) {
            setError('Please specify a directory to monitor');
            return false;
        }

        try {
            console.log('Attempting to set watch directory:', newDirectory);
            const response = await fetch('/api/watch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ directory: newDirectory }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setWatchDirectory(newDirectory);
            setIsWatching(true);
            setError(null);
            return true;
        } catch (err) {
            console.error('Error setting watch directory:', err);
            setError(err.message);
            return false;
        }
    };

    useEffect(() => {
        fetchWatchDirectory();
    }, []);

    return {
        watchDirectory,
        isWatching,
        error,
        loading,
        updateWatchDirectory,
        refreshWatchDirectory: fetchWatchDirectory
    };
}; 