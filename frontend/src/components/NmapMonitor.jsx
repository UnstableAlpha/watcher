import React, { useState, useEffect } from 'react';

const NmapMonitor = ({ view = 'hosts' }) => {
    // Set up our state management for all the features we need
    const [scannedHosts, setScannedHosts] = useState([]);
    const [error, setError] = useState(null);
    const [watchDirectory, setWatchDirectory] = useState('');
    const [isWatching, setIsWatching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [availablePorts, setAvailablePorts] = useState([]);
    const [basePort, setBasePort] = useState(null);
    const [additionalFilters, setAdditionalFilters] = useState([]);
    const [scanningHosts, setScanningHosts] = useState({});

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

    // Update the useEffect that processes available ports
    useEffect(() => {
        if (scannedHosts.length > 0) {
            const ports = new Set();
            scannedHosts.forEach(host => {
                host.ports?.forEach(port => {
                    // Only add open ports
                    if (port.state === 'open') {
                        ports.add(`${port.protocol || 'tcp'}/${port.portId}`);
                    }
                });
            });
            setAvailablePorts(Array.from(ports).sort());
        }
    }, [scannedHosts]);

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

    const formatProtocolPort = (protocol, portId) => {
        return `${(protocol || 'tcp').toUpperCase()}/${portId}`;
    };

    // Update the groupByPorts function
    const groupByPorts = () => {
        const portMap = new Map();
        
        scannedHosts.forEach(host => {
            host.ports?.forEach(port => {
                // Only process open ports
                if (port.state === 'open') {
                    const portKey = `${port.protocol || 'tcp'}/${port.portId}`;
                    if (!portMap.has(portKey)) {
                        portMap.set(portKey, {
                            portId: port.portId,
                            protocol: port.protocol || 'tcp',
                            service: port.service,
                            hosts: []
                        });
                    }
                    portMap.get(portKey).hosts.push({
                        address: host.address,
                        status: host.status
                    });
                }
            });
        });

        return Array.from(portMap.values());
    };

    const handleExport = (portData) => {
        // Create the content with one host per line
        const content = portData.hosts
            .map(host => host.address)
            .join('\n');

        // Create a blob with the content
        const blob = new Blob([content], { type: 'text/plain' });
        
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = `hosts_${portData.protocol}_${portData.portId}.txt`;
        
        // Append link to body, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        window.URL.revokeObjectURL(url);
    };

    const handlePortSelect = (port) => {
        if (!basePort) {
            setBasePort(port);
        } else if (!additionalFilters.some(f => f.port === port)) {
            setAdditionalFilters(prev => [...prev, { port, operation: 'AND' }]);
        }
    };

    const toggleOperation = (index) => {
        setAdditionalFilters(prev => prev.map((filter, i) => {
            if (i === index) {
                const operations = ['AND', 'OR', 'NOT'];
                const currentIndex = operations.indexOf(filter.operation);
                const nextOperation = operations[(currentIndex + 1) % operations.length];
                return { ...filter, operation: nextOperation };
            }
            return filter;
        }));
    };

    const removeFilter = (index) => {
        setAdditionalFilters(prev => prev.filter((_, i) => i !== index));
    };

    const clearAllFilters = () => {
        setBasePort(null);
        setAdditionalFilters([]);
    };

    const getFilteredHosts = () => {
        if (!basePort) return new Set();

        // Get all hosts that have the base port
        let filteredHosts = new Set(
            scannedHosts
                .filter(host => host.ports?.some(p => `${p.protocol || 'tcp'}/${p.portId}` === basePort))
                .map(host => host.address)
        );

        // Apply additional filters
        additionalFilters.forEach(filter => {
            const hostsWithFilter = new Set(
                scannedHosts
                    .filter(host => host.ports?.some(p => `${p.protocol || 'tcp'}/${p.portId}` === filter.port))
                    .map(host => host.address)
            );

            switch (filter.operation) {
                case 'AND':
                    filteredHosts = new Set([...filteredHosts].filter(host => hostsWithFilter.has(host)));
                    break;
                case 'OR':
                    filteredHosts = new Set([...filteredHosts, ...hostsWithFilter]);
                    break;
                case 'NOT':
                    filteredHosts = new Set([...filteredHosts].filter(host => !hostsWithFilter.has(host)));
                    break;
            }
        });

        return filteredHosts;
    };

    const shouldShowPort = (portData) => {
        if (!basePort) return true;
        
        const currentPort = `${portData.protocol}/${portData.portId}`;
        
        // Show if it's the base port
        if (currentPort === basePort) return true;
        
        // Don't show ports that are in NOT filters
        const notFilters = additionalFilters.filter(f => f.operation === 'NOT');
        if (notFilters.some(filter => filter.port === currentPort)) {
            return false;
        }
        
        // Show if it's in AND or OR filters
        return additionalFilters.some(filter => 
            filter.operation !== 'NOT' && filter.port === currentPort
        );
    };

    // Updated renderPortFilter function to display filters inline
    const renderPortFilter = () => {
        if (view !== 'ports') return null;

        return (
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
                <div className="font-medium mb-2">Port Filters:</div>
                
                {/* Base Port and Additional Filters in a single row */}
                <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {basePort ? (
                            <>
                                <div className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
                                    <span className="mr-2">Base:</span>
                                    {basePort}
                                    <button
                                        onClick={clearAllFilters}
                                        className="ml-2 hover:text-blue-200"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                {/* Additional Filters inline */}
                                {additionalFilters.map((filter, index) => (
                                    <div 
                                        key={index}
                                        className="flex items-center bg-gray-100 rounded-lg overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggleOperation(index)}
                                            className={`px-2 py-1 text-sm font-medium ${
                                                filter.operation === 'AND' ? 'bg-blue-500 text-white' :
                                                filter.operation === 'OR' ? 'bg-green-500 text-white' :
                                                'bg-red-500 text-white'
                                            }`}
                                        >
                                            {filter.operation}
                                        </button>
                                        <span className="px-2 py-1 text-sm">{filter.port}</span>
                                        <button
                                            onClick={() => removeFilter(index)}
                                            className="px-2 py-1 text-sm text-red-500 hover:bg-red-100"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="text-sm text-gray-500">Select a base port first</div>
                        )}
                    </div>
                </div>

                {/* Available Ports */}
                <div className="flex flex-wrap gap-2">
                    {availablePorts
                        .filter(port => port !== basePort && !additionalFilters.some(f => f.port === port))
                        .map((port) => (
                            <button
                                key={port}
                                onClick={() => handlePortSelect(port)}
                                className="px-3 py-1 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            >
                                {port}
                            </button>
                        ))}
                </div>

                {basePort && (
                    <div className="mt-2 text-sm text-gray-600">
                        Click on AND/OR/NOT to toggle additional filter operations
                    </div>
                )}
            </div>
        );
    };

    // Add this new function near the other utility functions
    const generateNmapCommand = (host) => {
        if (!host.ports || host.ports.length === 0) return null;
        
        const openPorts = host.ports
            .filter(port => port.state === 'open')
            .map(port => port.portId)
            .join(',');
            
        // Add -Pn flag to skip host discovery
        return `nmap -Pn -sV -p${openPorts} -oA /watch/${host.address}-ServiceScan ${host.address}`;
    };

    // Update the executeNmapScan function
    const executeNmapScan = async (host) => {
        const command = generateNmapCommand(host);
        console.log('Generated command:', command);
        
        if (!command) {
            console.error('No command generated');
            return;
        }

        try {
            // Set this host as scanning
            setScanningHosts(prev => ({
                ...prev,
                [host.address]: true
            }));
            
            console.log('Sending scan request...');
            const response = await fetch('/api/execute-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command }),
            });

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // We don't clear the scanning state here - it will be cleared when results come in
            // Instead, we start a timeout to clear it after 5 minutes in case results never arrive
            setTimeout(() => {
                setScanningHosts(prev => {
                    const updated = { ...prev };
                    delete updated[host.address];
                    return updated;
                });
            }, 300000); // 5 minutes timeout

        } catch (err) {
            console.error('Failed to execute scan:', err);
            console.error('Error details:', err.message);
            
            // Clear scanning state on error
            setScanningHosts(prev => {
                const updated = { ...prev };
                delete updated[host.address];
                return updated;
            });
            
            // Show error message
            const button = document.getElementById(`scan-button-${host.address}`);
            if (button) {
                const originalText = "Launch Nmap Service Scan";
                button.textContent = `Failed: ${err.message}`;
                button.classList.add('bg-red-500');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('bg-red-500');
                }, 2000);
            }
        }
    };

    // Add an effect to clear scanning state when new results come in
    useEffect(() => {
        // When scannedHosts changes, check if any scanning hosts now have serviceScanned=true
        const updatedScanningHosts = { ...scanningHosts };
        let hasChanges = false;
        
        scannedHosts.forEach(host => {
            if (updatedScanningHosts[host.address] && host.serviceScanned) {
                delete updatedScanningHosts[host.address];
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            setScanningHosts(updatedScanningHosts);
        }
    }, [scannedHosts]);

    // Update the renderHostView function to show enhanced service information
    const renderHostView = () => (
        <div className="space-y-4">
            {scannedHosts.map((host, index) => (
                <div key={index} className="p-4 border rounded-lg">
                    <div className="flex flex-col">
                        {/* Host header with status */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="font-medium text-lg">Host: {host.address}</div>
                                <div className="text-sm text-gray-500">Status: {host.status}</div>
                            </div>
                            {host.serviceScanned && (
                                <div className="text-xs text-gray-500">
                                    Service scan: {new Date(host.lastServiceScan).toLocaleString()}
                                </div>
                            )}
                        </div>
                        
                        {/* Scan button */}
                        <div className="mb-3">
                            {host.ports?.some(port => port.state === 'open') && (
                                <button
                                    id={`scan-button-${host.address}`}
                                    onClick={() => !scanningHosts[host.address] && executeNmapScan(host)}
                                    className={`px-3 py-1 text-sm ${
                                        scanningHosts[host.address] 
                                            ? 'bg-amber-500 cursor-not-allowed' 
                                            : 'bg-green-500 hover:bg-green-600'
                                    } text-white rounded transition-colors`}
                                    disabled={scanningHosts[host.address]}
                                >
                                    {scanningHosts[host.address] ? 'Scan in progress...' : 'Launch Nmap Service Scan'}
                                </button>
                            )}
                        </div>
                        
                        {/* Ports table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {host.ports?.filter(port => port.state === 'open' || port.previousState === 'open').map((port, portIndex) => (
                                        <tr key={portIndex} className={portIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                {formatProtocolPort(port.protocol, port.portId)}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                <div className="flex flex-col">
                                                    <div className={`font-medium ${
                                                        port.state === 'open' ? 'text-green-600' : 
                                                        port.state === 'closed' ? 'text-red-600' : 
                                                        port.state === 'filtered' ? 'text-yellow-600' : 'text-gray-600'
                                                    }`}>
                                                        {port.state}
                                                    </div>
                                                    {port.previousState && port.previousState !== port.state && (
                                                        <div className="text-xs text-gray-500">
                                                            Previously: {port.previousState} 
                                                            <span className="ml-1">
                                                                ({new Date(port.previousStateTimestamp).toLocaleString()})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                {port.service || 'unknown'}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                {port.product ? (
                                                    <div>
                                                        <div>{port.product} {port.version}</div>
                                                        {port.extraInfo && (
                                                            <div className="text-xs text-gray-500">{port.extraInfo}</div>
                                                        )}
                                                        {port.osType && (
                                                            <div className="text-xs text-gray-500">OS: {port.osType}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">No version info</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderPortView = () => {
        const filteredHosts = getFilteredHosts();
        const filteredPorts = groupByPorts().filter(shouldShowPort);
        
        return (
            <div className="space-y-4">
                {renderPortFilter()}
                {filteredPorts.map((portData, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                        <div className="flex">
                            {/* Left pane - Port information */}
                            <div className="flex-1 pr-6 border-r">
                                <div className="font-medium">
                                    {formatProtocolPort(portData.protocol, portData.portId)}
                                </div>
                                <div className="text-sm text-gray-500 mb-4">
                                    Service: {portData.service || 'unknown'}
                                </div>
                                <button
                                    onClick={() => handleExport(portData)}
                                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                    Export Hosts
                                </button>
                            </div>

                            {/* Right pane - Hosts list */}
                            <div className="flex-1 pl-6">
                                <div className="text-sm font-medium mb-2">Hosts:</div>
                                <div className="space-y-1">
                                    {portData.hosts
                                        .filter(host => !basePort || filteredHosts.has(host.address))
                                        .map((host, hostIndex) => (
                                            <div key={hostIndex} className="text-sm">
                                                {host.address}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center text-gray-600">
                    Loading monitor status...
                </div>
            );
        }

        if (scannedHosts.length === 0) {
            return (
                <div className="text-center text-gray-600 py-8">
                    No scan results found yet. Place nmap XML files in the monitored directory to see results.
                </div>
            );
        }

        switch (view) {
            case 'ports':
                return renderPortView();
            default:
                return renderHostView();
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                    {view.charAt(0).toUpperCase() + view.slice(1)} View
                </h2>

                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default NmapMonitor;
