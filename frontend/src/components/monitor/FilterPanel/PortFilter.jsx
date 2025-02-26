import React from 'react';

const PortFilter = ({
    basePort,
    additionalFilters,
    availablePorts,
    onPortSelect,
    onToggleOperation,
    onRemoveFilter,
    onClearAllFilters
}) => {
    return (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <div className="font-medium mb-2">Port Filters:</div>
            
            <div className="mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    {basePort ? (
                        <>
                            <div className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
                                <span className="mr-2">Base:</span>
                                {basePort}
                                <button
                                    onClick={onClearAllFilters}
                                    className="ml-2 hover:text-blue-200"
                                >
                                    ×
                                </button>
                            </div>
                            
                            {additionalFilters.map((filter, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center bg-gray-100 rounded-lg overflow-hidden"
                                >
                                    <button
                                        onClick={() => onToggleOperation(index)}
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
                                        onClick={() => onRemoveFilter(index)}
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

            <div className="flex flex-wrap gap-2">
                {availablePorts
                    .filter(port => port !== basePort && !additionalFilters.some(f => f.port === port))
                    .map((port) => (
                        <button
                            key={port}
                            onClick={() => onPortSelect(port)}
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

export default PortFilter; 