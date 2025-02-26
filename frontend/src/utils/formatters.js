export const formatProtocolPort = (protocol, portId) => {
    return `${(protocol || 'tcp').toUpperCase()}/${portId}`;
};

export const formatLastScanTime = (host) => {
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
            return new Date(host.serviceScannedTime).toLocaleString();
        } catch (error) {
            console.error('Error formatting scan time:', error);
        }
    }
    
    return 'Unknown';
}; 