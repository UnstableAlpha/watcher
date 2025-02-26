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
    
    // Add state for service filtering
    const [availableServices, setAvailableServices] = useState([]);
    const [baseService, setBaseService] = useState(null);
    const [additionalServiceFilters, setAdditionalServiceFilters] = useState([]);

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

    // Add useEffect to process available services
    useEffect(() => {
        if (scannedHosts.length > 0) {
            const services = new Set();
            scannedHosts.forEach(host => {
                host.ports?.forEach(port => {
                    if (port.state === 'open' && port.service && port.service !== 'unknown') {
                        services.add(port.service);
                    }
                });
            });
            setAvailableServices(Array.from(services).sort());
        }
    }, [scannedHosts]);

    // Add a useEffect to clear scanning state when new results come in
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
    }, [scannedHosts, scanningHosts]);

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

    // Add service filter handlers
    const handleServiceSelect = (service) => {
        if (!baseService) {
            setBaseService(service);
        } else if (!additionalServiceFilters.some(f => f.service === service)) {
            setAdditionalServiceFilters(prev => [...prev, { service, operation: 'AND' }]);
        }
    };

    const toggleServiceOperation = (index) => {
        setAdditionalServiceFilters(prev => prev.map((filter, i) => {
            if (i === index) {
                const operations = ['AND', 'OR', 'NOT'];
                const currentIndex = operations.indexOf(filter.operation);
                const nextOperation = operations[(currentIndex + 1) % operations.length];
                return { ...filter, operation: nextOperation };
            }
            return filter;
        }));
    };

    const removeServiceFilter = (index) => {
        setAdditionalServiceFilters(prev => prev.filter((_, i) => i !== index));
    };

    const clearAllServiceFilters = () => {
        setBaseService(null);
        setAdditionalServiceFilters([]);
    };

    const getFilteredHosts = () => {
        // Start with all hosts
        let filteredHosts = new Set(scannedHosts.map(host => host.address));
        let appliedFilters = false;
        
        // Apply port filters if there's a base port
        if (basePort) {
            appliedFilters = true;
            // Get hosts with base port
            filteredHosts = new Set(
                scannedHosts
                    .filter(host => host.ports?.some(p => `${p.protocol || 'tcp'}/${p.portId}` === basePort))
                    .map(host => host.address)
            );

            // Apply additional port filters
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
        }
        
        // Apply service filters if there's a base service
        if (baseService) {
            appliedFilters = true;
            // Get hosts with base service
            const hostsWithBaseService = new Set(
                scannedHosts
                    .filter(host => host.ports?.some(p => p.service === baseService))
                    .map(host => host.address)
            );
            
            // If we have port filters, intersect with service filters
            if (basePort) {
                filteredHosts = new Set([...filteredHosts].filter(host => hostsWithBaseService.has(host)));
            } else {
                // Otherwise, start with hosts that have the base service
                filteredHosts = hostsWithBaseService;
            }
            
            // Apply additional service filters
            additionalServiceFilters.forEach(filter => {
                const hostsWithFilter = new Set(
                    scannedHosts
                        .filter(host => host.ports?.some(p => p.service === filter.service))
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
        }
        
        // If no filters are applied, return all hosts
        if (!appliedFilters) {
            return new Set(scannedHosts.map(host => host.address));
        }
        
        return filteredHosts;
    };

    // Update the shouldShowPort function to also consider service filters
    const shouldShowPort = (portData) => {
        // If no filters are applied, show all ports
        if (!basePort && !baseService) return true;
        
        // If we have a service filter, check if this port has that service
        if (baseService) {
            // If this port has the base service, show it
            if (portData.service === baseService) return true;
            
            // Check if this port has any of the OR service filters
            const orServiceFilters = additionalServiceFilters.filter(f => f.operation === 'OR');
            if (orServiceFilters.some(filter => filter.service === portData.service)) {
                return true;
            }
            
            // If we only have service filters (no port filters), check NOT filters
            if (!basePort) {
                // Don't show ports with services that are in NOT filters
                const notServiceFilters = additionalServiceFilters.filter(f => f.operation === 'NOT');
                if (notServiceFilters.some(filter => filter.service === portData.service)) {
                    return false;
                }
            }
        }
        
        // If we have a port filter, apply the port filter logic
        if (basePort) {
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
        }
        
        // If we have service filters but this port doesn't match any of them
        return false;
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

    // Add service filter UI
    const renderServiceFilter = () => {
        if (view !== 'ports') return null;

        return (
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
                <div className="font-medium mb-2">Service Filters:</div>
                
                {/* Base Service and Additional Filters in a single row */}
                <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {baseService ? (
                            <>
                                <div className="flex items-center bg-purple-500 text-white px-3 py-1 rounded-md text-sm">
                                    <span className="mr-2">Base:</span>
                                    {baseService}
                                    <button
                                        onClick={clearAllServiceFilters}
                                        className="ml-2 hover:text-purple-200"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                {/* Additional Service Filters inline */}
                                {additionalServiceFilters.map((filter, index) => (
                                    <div 
                                        key={index}
                                        className="flex items-center bg-gray-100 rounded-lg overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggleServiceOperation(index)}
                                            className={`px-2 py-1 text-sm font-medium ${
                                                filter.operation === 'AND' ? 'bg-purple-500 text-white' :
                                                filter.operation === 'OR' ? 'bg-green-500 text-white' :
                                                'bg-red-500 text-white'
                                            }`}
                                        >
                                            {filter.operation}
                                        </button>
                                        <span className="px-2 py-1 text-sm">{filter.service}</span>
                                        <button
                                            onClick={() => removeServiceFilter(index)}
                                            className="px-2 py-1 text-sm text-red-500 hover:bg-red-100"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="text-sm text-gray-500">Select a base service first</div>
                        )}
                    </div>
                </div>

                {/* Available Services */}
                <div className="flex flex-wrap gap-2">
                    {availableServices
                        .filter(service => service !== baseService && !additionalServiceFilters.some(f => f.service === service))
                        .map((service) => (
                            <button
                                key={service}
                                onClick={() => handleServiceSelect(service)}
                                className="px-3 py-1 rounded-md text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                            >
                                {service}
                            </button>
                        ))}
                </div>

                {baseService && (
                    <div className="mt-2 text-sm text-gray-600">
                        Click on AND/OR/NOT to toggle additional filter operations
                    </div>
                )}
            </div>
        );
    };

    const renderHostView = () => (
        <div className="space-y-4">
            {scannedHosts.map((host, index) => (
                <div key={index} id={`host-${host.address}`} className="p-4 border rounded-lg">
                    <div className="mb-4">
                        <div className="font-medium">{host.address}</div>
                        <div className="flex items-center gap-3 mt-2">
                            {scanningHosts[host.address] ? (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                                    Scanning...
                                </span>
                            ) : (
                                <button
                                    onClick={() => handleServiceScan(host)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                                >
                                    Service Scan
                                </button>
                            )}
                            {host.serviceScanned && (
                                <div className="text-xs text-gray-500">
                                    Last scan: {formatLastScanTime(host)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
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
                {/* Two-column filter layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>{renderPortFilter()}</div>
                    <div>{renderServiceFilter()}</div>
                </div>
                
                {filteredPorts.length > 0 ? (
                    filteredPorts.map((portData, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                            <div className="flex flex-col md:flex-row">
                                {/* Left pane - Port information */}
                                <div className="md:flex-1 pr-0 md:pr-6 border-b md:border-b-0 md:border-r pb-4 md:pb-0">
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
                                <div className="md:flex-1 pl-0 md:pl-6 pt-4 md:pt-0">
                                    <div className="text-sm font-medium mb-2">Hosts:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {portData.hosts
                                            .filter(host => filteredHosts.has(host.address))
                                            .map((host, hostIndex) => (
                                                <a 
                                                    key={hostIndex} 
                                                    href="#" 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        // Navigate to the host view
                                                        window.location.href = '/';
                                                        // Store the host to navigate to
                                                        sessionStorage.setItem('navigateToHost', host.address);
                                                    }}
                                                    className="px-3 py-1 bg-gray-100 rounded text-sm text-blue-600 hover:bg-gray-200 hover:text-blue-800 cursor-pointer"
                                                >
                                                    {host.address}
                                                </a>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-4 bg-gray-50 text-gray-500 text-center rounded-lg">
                        No ports match the current filters
                    </div>
                )}
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

    // Update the handleServiceScan function to store the timestamp more reliably
    const handleServiceScan = async (host) => {
        try {
            // Mark this host as being scanned
            setScanningHosts(prev => ({
                ...prev,
                [host.address]: true
            }));
            
            // Get current timestamp for tracking
            const scanTime = new Date();
            const scanTimeStr = scanTime.toLocaleString();
            const scanTimeISO = scanTime.toISOString();
            
            // Store the scan time in localStorage for persistence
            localStorage.setItem(`scanTime_${host.address}`, scanTimeStr);
            
            // Construct the nmap command for service scanning
            const command = `nmap -sV -Pn -p ${host.ports
                .filter(port => port.state === 'open')
                .map(port => port.portId)
                .join(',')} ${host.address} -oX /watch/${host.address.replace(/\./g, '_')}-ServiceScan.xml`;
            
            console.log('Executing service scan:', command);
            
            // Send the scan command to the backend
            const response = await fetch('/api/execute-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    command,
                    hostAddress: host.address,
                    scanTime: scanTimeISO
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start service scan');
            }
            
            // Update the host locally with the scan time
            setScannedHosts(prev => prev.map(h => {
                if (h.address === host.address) {
                    return {
                        ...h,
                        serviceScanned: true,
                        serviceScannedTime: scanTimeISO,
                        serviceScannedTimeStr: scanTimeStr
                    };
                }
                return h;
            }));
            
            // Success message
            console.log('Service scan started successfully');
        } catch (error) {
            console.error('Error starting service scan:', error);
            setError(`Failed to start service scan: ${error.message}`);
            
            // Remove from scanning hosts on error
            setScanningHosts(prev => {
                const updated = { ...prev };
                delete updated[host.address];
                return updated;
            });
        }
    };

    // Update the formatLastScanTime function to check localStorage
    const formatLastScanTime = (host) => {
        // First check localStorage for a stored timestamp
        const storedTime = localStorage.getItem(`scanTime_${host.address}`);
        if (storedTime) {
            return storedTime;
        }
        
        // Then check the host object properties
        if (host.serviceScannedTimeStr) {
            return host.serviceScannedTimeStr;
        }
        
        if (host.serviceScannedTime) {
            try {
                // Try various parsing methods as before
                // ...
            } catch (error) {
                console.error('Error formatting scan time:', error);
            }
        }
        
        return 'Unknown';
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
