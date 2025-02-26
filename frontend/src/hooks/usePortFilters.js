import { useState, useEffect, useMemo } from 'react';

export const usePortFilters = (scannedHosts) => {
    const [basePort, setBasePort] = useState(null);
    const [additionalFilters, setAdditionalFilters] = useState([]);
    const [availablePorts, setAvailablePorts] = useState([]);

    // Update available ports when scanned hosts change
    useEffect(() => {
        if (scannedHosts.length > 0) {
            const ports = new Set();
            scannedHosts.forEach(host => {
                host.ports?.forEach(port => {
                    if (port.state === 'open') {
                        ports.add(`${port.protocol || 'tcp'}/${port.portId}`);
                    }
                });
            });
            setAvailablePorts(Array.from(ports).sort());
        }
    }, [scannedHosts]);

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

    // Calculate filtered hosts based on port filters
    const filteredHosts = useMemo(() => {
        console.log('Filtering hosts with basePort:', basePort);
        console.log('Additional filters:', additionalFilters);

        if (!basePort && additionalFilters.length === 0) {
            console.log('No filters active, returning all hosts');
            return new Set(scannedHosts.map(host => host.address));
        }

        const hostsWithPort = new Set();
        
        scannedHosts.forEach(host => {
            const hostPorts = host.ports
                ?.filter(port => port.state === 'open')
                .map(port => `${port.protocol || 'tcp'}/${port.portId}`) || [];

            console.log('Host:', host.address, 'has ports:', hostPorts);

            // Start with base port check
            let shouldIncludeHost = basePort ? hostPorts.includes(basePort) : true;
            console.log('After base port check:', shouldIncludeHost);

            // Handle OR filters separately
            const orFilters = additionalFilters.filter(f => f.operation === 'OR');
            const otherFilters = additionalFilters.filter(f => f.operation !== 'OR');

            // If we have OR filters and didn't pass the base port check,
            // check if we match any OR conditions
            if (!shouldIncludeHost && orFilters.length > 0) {
                shouldIncludeHost = orFilters.some(filter => 
                    hostPorts.includes(filter.port)
                );
                console.log('After OR filters:', shouldIncludeHost);
            }

            // If we're still included, check other filters
            if (shouldIncludeHost && otherFilters.length > 0) {
                for (const filter of otherFilters) {
                    const hasPort = hostPorts.includes(filter.port);
                    console.log('Checking filter:', filter, 'hasPort:', hasPort);

                    if (filter.operation === 'AND' && !hasPort) {
                        shouldIncludeHost = false;
                        console.log('Failed AND check');
                        break;
                    }
                    if (filter.operation === 'NOT' && hasPort) {
                        shouldIncludeHost = false;
                        console.log('Failed NOT check');
                        break;
                    }
                }
            }

            console.log('Final decision for host:', host.address, 'include:', shouldIncludeHost);
            if (shouldIncludeHost) {
                hostsWithPort.add(host.address);
            }
        });

        console.log('Final filtered hosts:', [...hostsWithPort]);
        return hostsWithPort;
    }, [scannedHosts, basePort, additionalFilters]);

    return {
        basePort,
        additionalFilters,
        availablePorts,
        filteredHosts,
        handlePortSelect,
        toggleOperation,
        removeFilter,
        clearAllFilters
    };
}; 