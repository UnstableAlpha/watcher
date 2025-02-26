import React from 'react';
import HostView from './monitor/HostView';
import PortView from './monitor/PortView';
import { useWatchDirectory } from '../hooks/useWatchDirectory';
import { useScanResults } from '../hooks/useScanResults';
import { usePortFilters } from '../hooks/usePortFilters';
import { useServiceFilters } from '../hooks/useServiceFilters';
import { formatLastScanTime } from '../utils/formatters';

const NmapMonitor = ({ view = 'hosts' }) => {
    // Directory watching
    const {
        watchDirectory,
        isWatching,
        error: watchError,
        loading,
        updateWatchDirectory
    } = useWatchDirectory();

    // Scan results management
    const {
        scannedHosts,
        scanningHosts,
        error: scanError,
        startServiceScan
    } = useScanResults(isWatching);

    // Port filtering
    const {
        basePort,
        additionalFilters,
        availablePorts,
        filteredHosts: filteredHostsByPort,
        handlePortSelect,
        toggleOperation,
        removeFilter,
        clearAllFilters
    } = usePortFilters(scannedHosts);

    // Service filtering
    const {
        baseService,
        additionalServiceFilters,
        availableServices,
        filteredHostsByService,
        handleServiceSelect,
        toggleServiceOperation,
        removeServiceFilter,
        clearAllServiceFilters
    } = useServiceFilters(scannedHosts);

    // Combine port and service filters
    const getFilteredHosts = () => {
        if (!basePort && !baseService) {
            return new Set(scannedHosts.map(host => host.address));
        }

        const portFiltered = filteredHostsByPort;
        const serviceFiltered = filteredHostsByService;

        if (!basePort) return serviceFiltered;
        if (!baseService) return portFiltered;

        // Intersection of both filters
        return new Set(
            [...portFiltered].filter(host => serviceFiltered.has(host))
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
                return (
                    <PortView
                        groupedPorts={groupByPorts()}
                        filteredHosts={getFilteredHosts()}
                        handleExport={handleExport}
                        basePort={basePort}
                        baseService={baseService}
                        additionalFilters={additionalFilters}
                        additionalServiceFilters={additionalServiceFilters}
                        availablePorts={availablePorts}
                        availableServices={availableServices}
                        handlePortSelect={handlePortSelect}
                        handleServiceSelect={handleServiceSelect}
                        toggleOperation={toggleOperation}
                        toggleServiceOperation={toggleServiceOperation}
                        removeFilter={removeFilter}
                        removeServiceFilter={removeServiceFilter}
                        clearAllFilters={clearAllFilters}
                        clearAllServiceFilters={clearAllServiceFilters}
                    />
                );
            default:
                return (
                    <HostView
                        scannedHosts={scannedHosts}
                        scanningHosts={scanningHosts}
                        handleServiceScan={startServiceScan}
                        formatLastScanTime={formatLastScanTime}
                    />
                );
        }
    };

    const formatProtocolPort = (protocol, portId) => {
        return `${(protocol || 'tcp').toUpperCase()}/${portId}`;
    };

    // Update the groupByPorts function
    const groupByPorts = () => {
        const portMap = new Map();
        const filteredHostsSet = getFilteredHosts();
        
        console.log('Filtered hosts set:', [...filteredHostsSet]);
        
        // If we have a base port, we should only show that port (and any OR'd ports)
        const allowedPorts = new Set();
        if (basePort) {
            allowedPorts.add(basePort);
            // Add any OR'd ports from additional filters
            additionalFilters.forEach(filter => {
                if (filter.operation === 'OR') {
                    allowedPorts.add(filter.port);
                }
            });
        }
        
        console.log('Allowed ports:', [...allowedPorts]);

        scannedHosts.forEach(host => {
            if (filteredHostsSet.has(host.address)) {
                console.log('Processing host:', host.address);
                host.ports?.forEach(port => {
                    if (port.state === 'open') {
                        const portKey = `${port.protocol || 'tcp'}/${port.portId}`;
                        
                        // Only process this port if it's in our allowed set (or if we have no base port)
                        if (!basePort || allowedPorts.has(portKey)) {
                            console.log('Adding port:', portKey, 'for host:', host.address);
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
                        } else {
                            console.log('Skipping port:', portKey, 'not in allowed set');
                        }
                    }
                });
            } else {
                console.log('Skipping host:', host.address, 'not in filtered set');
            }
        });

        const result = Array.from(portMap.values())
            .filter(portData => portData.hosts.length > 0);
        
        console.log('Final grouped ports:', result);
        return result;
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

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                    {view.charAt(0).toUpperCase() + view.slice(1)} View
                </h2>

                <div className="space-y-4">
                    {(watchError || scanError) && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                            {watchError || scanError}
                        </div>
                    )}

                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default NmapMonitor;
