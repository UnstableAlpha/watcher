import React from 'react';

const ServiceFilter = ({
    baseService,
    additionalServiceFilters,
    availableServices,
    onServiceSelect,
    onToggleServiceOperation,
    onRemoveServiceFilter,
    onClearAllServiceFilters
}) => {
    return (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <div className="font-medium mb-2">Service Filters:</div>
            
            <div className="mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    {baseService ? (
                        <>
                            <div className="flex items-center bg-purple-500 text-white px-3 py-1 rounded-md text-sm">
                                <span className="mr-2">Base:</span>
                                {baseService}
                                <button
                                    onClick={onClearAllServiceFilters}
                                    className="ml-2 hover:text-purple-200"
                                >
                                    ×
                                </button>
                            </div>
                            
                            {additionalServiceFilters.map((filter, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center bg-gray-100 rounded-lg overflow-hidden"
                                >
                                    <button
                                        onClick={() => onToggleServiceOperation(index)}
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
                                        onClick={() => onRemoveServiceFilter(index)}
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

            <div className="flex flex-wrap gap-2">
                {availableServices
                    .filter(service => service !== baseService && !additionalServiceFilters.some(f => f.service === service))
                    .map((service) => (
                        <button
                            key={service}
                            onClick={() => onServiceSelect(service)}
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

export default ServiceFilter; 