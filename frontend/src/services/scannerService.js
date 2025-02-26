import { api } from './api';

export const scannerService = {
    async startServiceScan(host, scanTime) {
        const command = `nmap -sV -Pn -p ${host.ports
            .filter(port => port.state === 'open')
            .map(port => port.portId)
            .join(',')} ${host.address} -oX /watch/${host.address.replace(/\./g, '_')}-ServiceScan.xml`;

        return api.post('/api/execute-scan', {
            command,
            hostAddress: host.address,
            scanTime
        });
    },

    async getScanResults() {
        return api.get('/api/scan-results');
    }
}; 