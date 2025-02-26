import React from 'react';
import PortFilter from './PortFilter';
import ServiceFilter from './ServiceFilter';

const FilterPanel = ({
    basePort,
    baseService,
    additionalFilters,
    additionalServiceFilters,
    availablePorts,
    availableServices,
    onPortSelect,
    onServiceSelect,
    onToggleOperation,
    onToggleServiceOperation,
    onRemoveFilter,
    onRemoveServiceFilter,
    onClearAllFilters,
    onClearAllServiceFilters
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <PortFilter
                    basePort={basePort}
                    additionalFilters={additionalFilters}
                    availablePorts={availablePorts}
                    onPortSelect={onPortSelect}
                    onToggleOperation={onToggleOperation}
                    onRemoveFilter={onRemoveFilter}
                    onClearAllFilters={onClearAllFilters}
                />
            </div>
            <div>
                <ServiceFilter
                    baseService={baseService}
                    additionalServiceFilters={additionalServiceFilters}
                    availableServices={availableServices}
                    onServiceSelect={onServiceSelect}
                    onToggleServiceOperation={onToggleServiceOperation}
                    onRemoveServiceFilter={onRemoveServiceFilter}
                    onClearAllServiceFilters={onClearAllServiceFilters}
                />
            </div>
        </div>
    );
};

export default FilterPanel; 