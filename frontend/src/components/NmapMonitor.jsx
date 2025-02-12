import React, { useState, useEffect } from 'react';

const NmapMonitor = () => {
    // Set up our state management for all the features we need
    const [scannedHosts, setScannedHosts] = useState([]);
    const [error, setError] = useState(null);
    const [watchDirectory, setWatchDirectory] = useState('');
    const [isWatching, setIsWatching] = useState(false);
    const [loading, setLoading] = useState(true);

    // This effect runs when the component mounts to fetch the initial watch directory
    useEffect(() => {
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
            } catch (err) {
                console.error('Error fetching watch directory:', err);
                setError('Failed to fetch current watch directory');
            } finally {
                setLoading(false);
            }
        };

        fetchWatchDirectory();
    }, []);

    // This effect handles the periodic checking for new scan results
    useEffect(() => {
        if (!isWatching) return;

        console.log('Setting up scan results monitoring...');
        const checkForFiles = async () => {
            try {
                const response = await fetch('/api/scan-results');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Received scan results:', data);
                setScannedHosts(data);
            } catch (err) {
                console.error('Error fetching scan results:', err);
                setError('Failed to fetch scan results');
            }
        };

        const interval = setInterval(checkForFiles, 30000);
        checkForFiles(); // Initial check

        return () => clearInterval(interval);
    }, [isWatching]);

    // Function to handle starting/changing directory monitoring
    const handleDirectoryChange = async () => {
        if (!watchDirectory) {
            setError('Please specify a directory to monitor');
            return;
        }

        try {
            console.log('Attempting to set watch directory:', watchDirectory);
            const response = await fetch('/api/watch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ directory: watchDirectory }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setIsWatching(true);
            setError(null);
            console.log('Successfully set watch directory');
        } catch (err) {
            console.error('Error setting watch directory:', err);
            setError(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                    Scan Monitor
                </h2>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Enter directory path to monitor"
                            value={watchDirectory}
                            onChange={(e) => setWatchDirectory(e.target.value)}
                            className="flex-grow p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                            onClick={handleDirectoryChange}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            disabled={loading}
                        >
                            {isWatching ? 'Change Directory' : 'Start Monitoring'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {isWatching && (
                        <div className="p-4 bg-green-100 text-green-700 rounded-lg">
                            Currently monitoring: {watchDirectory}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-gray-600">
                            Loading monitor status...
                        </div>
                    ) : scannedHosts.length > 0 ? (
                        <div className="space-y-4">
                            {scannedHosts.map((host, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                    <div className="font-medium">Host: {host.address}</div>
                                    <div className="text-sm text-gray-500">Status: {host.status}</div>
                                    {host.ports?.length > 0 && (
                                        <div className="mt-2">
                                            <div className="text-sm font-medium">Open Ports:</div>
                                            <div className="grid grid-cols-3 gap-2 mt-1">
                                                {host.ports.map((port, portIndex) => (
                                                    <div key={portIndex} className="text-sm">
                                                        {port.portId} ({port.service || 'unknown'})
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-600 py-8">
                            No scan results found yet. Place nmap XML files in the monitored directory to see results.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NmapMonitor;
