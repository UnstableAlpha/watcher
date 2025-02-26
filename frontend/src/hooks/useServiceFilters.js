import { useState, useEffect, useMemo } from 'react';

export const useServiceFilters = (scannedHosts) => {
    const [baseService, setBaseService] = useState(null);
    const [additionalServiceFilters, setAdditionalServiceFilters] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);

    // Update available services when scanned hosts change
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

    // Calculate filtered hosts based on service filters
    const filteredHostsByService = useMemo(() => {
        if (!baseService && additionalServiceFilters.length === 0) {
            return new Set(scannedHosts.map(host => host.address));
        }

        const hostsWithService = new Set();
        
        scannedHosts.forEach(host => {
            const hostServices = host.ports?.reduce((services, port) => {
                if (port.state === 'open' && port.service) {
                    services.add(port.service);
                }
                return services;
            }, new Set()) || new Set();

            if (baseService) {
                // Check base service
                if (!hostServices.has(baseService)) {
                    return;
                }

                // Check additional filters
                for (const filter of additionalServiceFilters) {
                    const hasService = hostServices.has(filter.service);
                    
                    if (filter.operation === 'AND' && !hasService) {
                        return;
                    }
                    if (filter.operation === 'NOT' && hasService) {
                        return;
                    }
                    // For OR, we continue checking
                }
            }

            hostsWithService.add(host.address);
        });

        return hostsWithService;
    }, [scannedHosts, baseService, additionalServiceFilters]);

    return {
        baseService,
        additionalServiceFilters,
        availableServices,
        filteredHostsByService,
        handleServiceSelect,
        toggleServiceOperation,
        removeServiceFilter,
        clearAllServiceFilters
    };
}; 