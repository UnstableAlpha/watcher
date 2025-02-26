import React from 'react';
import { formatProtocolPort } from '../../utils/formatters';
import FilterPanel from './FilterPanel';

const PortView = ({
    groupedPorts,
    filteredHosts,
    handleExport,
    basePort,
    baseService,
    additionalFilters,
    additionalServiceFilters,
    availablePorts,
    availableServices,
    handlePortSelect,
    handleServiceSelect,
    toggleOperation,
    toggleServiceOperation,
    removeFilter,
    removeServiceFilter,
    clearAllFilters,
    clearAllServiceFilters
}) => {
    return (
        <div className="space-y-4">
            {/* Two-column filter layout */}
            <FilterPanel
                basePort={basePort}
                baseService={baseService}
                additionalFilters={additionalFilters}
                additionalServiceFilters={additionalServiceFilters}
                availablePorts={availablePorts}
                availableServices={availableServices}
                onPortSelect={handlePortSelect}
                onServiceSelect={handleServiceSelect}
                onToggleOperation={toggleOperation}
                onToggleServiceOperation={toggleServiceOperation}
                onRemoveFilter={removeFilter}
                onRemoveServiceFilter={removeServiceFilter}
                onClearAllFilters={clearAllFilters}
                onClearAllServiceFilters={clearAllServiceFilters}
            />
            
            {groupedPorts.length > 0 ? (
                groupedPorts.map((portData, index) => (
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
                                                    window.location.href = '/';
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

export default PortView; 