import { useState, useEffect } from 'react';

export const useScanResults = (isWatching) => {
    const [scannedHosts, setScannedHosts] = useState([]);
    const [scanningHosts, setScanningHosts] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isWatching) return;

        const fetchScanResults = async () => {
            try {
                const response = await fetch('/api/scan-results');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setScannedHosts(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching scan results:', err);
                setError('Failed to fetch scan results');
            }
        };

        // Initial fetch
        fetchScanResults();

        // Set up polling interval
        const interval = setInterval(fetchScanResults, 30000);
        return () => clearInterval(interval);
    }, [isWatching]);

    const startServiceScan = async (host) => {
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
            
            // Construct the nmap command
            const command = `nmap -sV -Pn -p ${host.ports
                .filter(port => port.state === 'open')
                .map(port => port.portId)
                .join(',')} ${host.address} -oX /watch/${host.address.replace(/\./g, '_')}-ServiceScan.xml`;
            
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
            
            // Update the host locally
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
            
            return true;
        } catch (error) {
            console.error('Error starting service scan:', error);
            setError(`Failed to start service scan: ${error.message}`);
            
            // Remove from scanning hosts on error
            setScanningHosts(prev => {
                const updated = { ...prev };
                delete updated[host.address];
                return updated;
            });
            
            return false;
        }
    };

    return {
        scannedHosts,
        scanningHosts,
        error,
        startServiceScan
    };
}; 