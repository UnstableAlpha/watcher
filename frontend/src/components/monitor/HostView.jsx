import React from 'react';
import { formatProtocolPort } from '../../utils/formatters';

const HostView = ({ 
    scannedHosts, 
    scanningHosts, 
    handleServiceScan, 
    formatLastScanTime 
}) => {
    return (
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
};

export default HostView; 