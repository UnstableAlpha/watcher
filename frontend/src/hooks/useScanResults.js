import { useState, useEffect } from 'react';
import { scannerService } from '../services/scannerService';
import { APIError } from '../services/api';

export const useScanResults = (isWatching) => {
    const [scannedHosts, setScannedHosts] = useState([]);
    const [scanningHosts, setScanningHosts] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isWatching) return;

        const fetchScanResults = async () => {
            try {
                const data = await scannerService.getScanResults();
                setScannedHosts(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching scan results:', err);
                setError(err instanceof APIError ? err.message : 'Failed to fetch scan results');
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
            
            // Store the scan time in localStorage for persistence
            localStorage.setItem(`scanTime_${host.address}`, scanTime.toLocaleString());
            
            await scannerService.startServiceScan(host, scanTime.toISOString());
            
            // Update the host locally
            setScannedHosts(prev => prev.map(h => {
                if (h.address === host.address) {
                    return {
                        ...h,
                        serviceScanned: true,
                        serviceScannedTime: scanTime.toISOString(),
                        serviceScannedTimeStr: scanTime.toLocaleString()
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