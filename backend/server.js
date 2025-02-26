const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');
const cors = require('cors');
const { isValidDirectory } = require('./utils/validator');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const app = express();

// Enable CORS for development
app.use(cors());
app.use(express.json());
// Serve static files from the public directory
app.use(express.static('public'));

// Handle React routing by serving index.html for all non-API routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let watcher;
let scanResults = [];
let currentWatchDir = process.env.WATCH_DIR || '';

// Function to check if nmap scan is complete
const isScanComplete = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.includes('</nmaprun>');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
};

// Function to parse nmap XML
const parseNmapXML = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    
    if (!result.nmaprun || !result.nmaprun.host) {
      return [];
    }

    const scanTime = new Date().toISOString();

    return result.nmaprun.host.map(host => {
      const address = host.address?.[0]?.$?.addr;
      const status = host.status?.[0]?.$?.state;
      const ports = host.ports?.[0]?.port?.map(port => ({
        portId: port.$?.portid,
        protocol: port.$?.protocol || 'tcp',
        state: port.state?.[0]?.$?.state,
        service: port.service?.[0]?.$?.name,
        script: port.script?.[0]?.$?.output,
        stateHistory: [{
          state: port.state?.[0]?.$?.state,
          timestamp: scanTime
        }]
      })) || [];

      return {
        address,
        status,
        ports,
        timestamp: scanTime
      };
    });
  } catch (error) {
    console.error(`Error parsing XML file ${filePath}:`, error);
    return [];
  }
};

// Add a new function to parse service scan results
const parseServiceScanResults = async (filePath) => {
  try {
    // Check if this is a service scan file
    if (!filePath.includes('-ServiceScan.xml')) {
      return null;
    }
    
    console.log(`Parsing service scan results from ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    
    if (!result.nmaprun || !result.nmaprun.host) {
      return null;
    }

    const host = result.nmaprun.host[0];
    const address = host.address?.[0]?.$?.addr;
    
    // Extract detailed service information
    const serviceInfo = [];
    if (host.ports && host.ports[0] && host.ports[0].port) {
      host.ports[0].port.forEach(port => {
        serviceInfo.push({
          portId: port.$?.portid,
          protocol: port.$?.protocol || 'tcp',
          state: port.state?.[0]?.$?.state,
          service: port.service?.[0]?.$?.name,
          product: port.service?.[0]?.$?.product,
          version: port.service?.[0]?.$?.version,
          extraInfo: port.service?.[0]?.$?.extrainfo,
          osType: port.service?.[0]?.$?.ostype
        });
      });
    }

    return {
      address,
      serviceInfo,
      scanTime: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error parsing service scan XML file ${filePath}:`, error);
    return null;
  }
};

// Modify the setupWatcher function to handle service scan results
const setupWatcher = async (directory) => {
  if (watcher) {
    await watcher.close();
  }

  watcher = chokidar.watch(path.join(directory, '*.xml'), {
    persistent: true,
    ignoreInitial: false,
    depth: 0
  });

  watcher
    .on('add', async (filePath) => {
      if (await isScanComplete(filePath)) {
        if (filePath.includes('-ServiceScan.xml')) {
          // Handle service scan results
          const serviceResults = await parseServiceScanResults(filePath);
          if (serviceResults) {
            // Update existing host with service information
            scanResults = scanResults.map(host => {
              if (host.address === serviceResults.address) {
                // Merge service information with existing host data
                const updatedPorts = [...host.ports];
                
                // Update ports with detailed service information
                serviceResults.serviceInfo.forEach(servicePort => {
                  const existingPortIndex = updatedPorts.findIndex(
                    p => p.portId === servicePort.portId && (p.protocol || 'tcp') === servicePort.protocol
                  );
                  
                  if (existingPortIndex >= 0) {
                    updatedPorts[existingPortIndex] = {
                      ...updatedPorts[existingPortIndex],
                      ...servicePort
                    };
                  } else {
                    updatedPorts.push(servicePort);
                  }
                });
                
                return {
                  ...host,
                  ports: updatedPorts,
                  serviceScanned: true,
                  lastServiceScan: serviceResults.scanTime
                };
              }
              return host;
            });
            
            console.log(`Updated host ${serviceResults.address} with service scan results`);
          }
        } else {
          // Handle regular scan results with port state history
          const results = await parseNmapXML(filePath);
          if (results.length > 0) {
            // Check for existing hosts and update them
            const updatedResults = results.map(newHost => {
              const existingHost = scanResults.find(h => h.address === newHost.address);
              
              if (!existingHost) {
                return newHost; // New host, just add it
              }
              
              // Update existing host with new scan data
              const updatedPorts = [...newHost.ports];
              
              // For each port in the existing host, check if state has changed
              existingHost.ports.forEach(existingPort => {
                const matchingNewPort = newHost.ports.find(
                  p => p.portId === existingPort.portId && p.protocol === existingPort.protocol
                );
                
                if (!matchingNewPort) {
                  // Port was in previous scan but not in new scan
                  // Add it as closed with history
                  updatedPorts.push({
                    ...existingPort,
                    state: 'closed',
                    stateHistory: [
                      ...(existingPort.stateHistory || []),
                      { state: 'closed', timestamp: newHost.timestamp }
                    ]
                  });
                } else {
                  // Port exists in both scans
                  const newPortIndex = updatedPorts.findIndex(
                    p => p.portId === existingPort.portId && p.protocol === existingPort.protocol
                  );
                  
                  if (newPortIndex >= 0) {
                    // If state has changed, update history
                    if (matchingNewPort.state !== existingPort.state) {
                      updatedPorts[newPortIndex] = {
                        ...matchingNewPort,
                        stateHistory: [
                          ...(existingPort.stateHistory || []),
                          { state: matchingNewPort.state, timestamp: newHost.timestamp }
                        ],
                        previousState: existingPort.state,
                        previousStateTimestamp: existingPort.stateHistory ? 
                          existingPort.stateHistory[existingPort.stateHistory.length - 1].timestamp : 
                          existingPort.timestamp
                      };
                    } else {
                      // State hasn't changed, keep existing history
                      updatedPorts[newPortIndex] = {
                        ...matchingNewPort,
                        stateHistory: existingPort.stateHistory || []
                      };
                    }
                  }
                }
              });
              
              // Check for new ports that weren't in the existing host
              newHost.ports.forEach(newPort => {
                const existingPort = existingHost.ports.find(
                  p => p.portId === newPort.portId && p.protocol === newPort.protocol
                );
                
                if (!existingPort) {
                  // This is a new port, add it with its history
                  const portIndex = updatedPorts.findIndex(
                    p => p.portId === newPort.portId && p.protocol === newPort.protocol
                  );
                  
                  if (portIndex < 0) {
                    updatedPorts.push(newPort);
                  }
                }
              });
              
              return {
                ...newHost,
                ports: updatedPorts,
                serviceScanned: existingHost.serviceScanned,
                lastServiceScan: existingHost.lastServiceScan
              };
            });
            
            // Replace existing hosts with updated ones
            scanResults = updatedResults.map(newHost => {
              const existingIndex = scanResults.findIndex(h => h.address === newHost.address);
              return existingIndex >= 0 ? newHost : newHost;
            });
            
            // Add any hosts that don't already exist
            const newHosts = results.filter(
              newHost => !scanResults.some(h => h.address === newHost.address)
            );
            
            if (newHosts.length > 0) {
              scanResults = [...scanResults, ...newHosts];
            }
          }
        }
      }
    })
    .on('change', async (filePath) => {
      // Similar logic for file changes
      if (await isScanComplete(filePath)) {
        if (filePath.includes('-ServiceScan.xml')) {
          const serviceResults = await parseServiceScanResults(filePath);
          if (serviceResults) {
            // Update existing host with service information (same logic as above)
            scanResults = scanResults.map(host => {
              if (host.address === serviceResults.address) {
                const updatedPorts = [...host.ports];
                
                serviceResults.serviceInfo.forEach(servicePort => {
                  const existingPortIndex = updatedPorts.findIndex(
                    p => p.portId === servicePort.portId && (p.protocol || 'tcp') === servicePort.protocol
                  );
                  
                  if (existingPortIndex >= 0) {
                    updatedPorts[existingPortIndex] = {
                      ...updatedPorts[existingPortIndex],
                      ...servicePort
                    };
                  } else {
                    updatedPorts.push(servicePort);
                  }
                });
                
                return {
                  ...host,
                  ports: updatedPorts,
                  serviceScanned: true,
                  lastServiceScan: serviceResults.scanTime
                };
              }
              return host;
            });
          }
        } else {
          const results = await parseNmapXML(filePath);
          if (results.length > 0) {
            scanResults = [...scanResults, ...results];
          }
        }
      }
    })
    .on('error', error => {
      console.error('Error in file watcher:', error);
    });

  return watcher;
};

// API Routes
app.post('/api/watch', async (req, res) => {
  const { directory } = req.body;
  
  if (!directory || typeof directory !== 'string') {
    return res.status(400).json({ error: 'Invalid directory path provided' });
  }

  try {
    if (!(await isValidDirectory(directory))) {
      return res.status(400).json({ error: 'Directory does not exist or is not accessible' });
    }

    await setupWatcher(directory);
    currentWatchDir = directory;
    res.json({ success: true, directory });
  } catch (error) {
    console.error('Error setting up directory watch:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scan-results', (req, res) => {
  res.json(scanResults);
});

app.get('/api/watch-directory', (req, res) => {
  res.json({ directory: currentWatchDir });
});

// Add new endpoint for executing nmap scans
app.post('/api/execute-scan', async (req, res) => {
    const { command } = req.body;
    
    console.log('Received scan command:', command);
    
    if (!command || !(command.startsWith('nmap -sV') || command.startsWith('nmap -Pn'))) {
        console.log('Invalid command format received');
        return res.status(400).json({ error: 'Invalid command' });
    }

    try {
        // Get all containers and log them
        const { stdout: containerList } = await execAsync('sudo docker ps --format "{{.Names}}"');
        const containers = containerList.trim().split('\n');
        console.log('Available containers:', containers);
        
        // Try to find the nmap container
        const nmapContainer = containers.find(name => name.includes('nmap') && !name.includes('monitor'));
        
        if (!nmapContainer) {
            // If we can't find it by name, let's try to install nmap in the current container
            console.log('Nmap container not found. Installing nmap in the current container...');
            try {
                // Try to install the full nmap package
                await execAsync('sudo apk add --no-cache nmap nmap-scripts');
                console.log('Nmap installed successfully');
            } catch (err) {
                console.error('Error installing nmap:', err);
                // Fall back to basic nmap without scripts
                await execAsync('sudo apk add --no-cache nmap');
                // Modify command to remove -sC if present
                command = command.replace('-sVC', '-sV');
            }
            
            // Execute nmap directly
            console.log('Executing nmap directly:', command);
            const { stdout, stderr } = await execAsync(command);
            console.log('Scan started:', stdout);
            if (stderr) console.error('Scan stderr:', stderr);
            res.json({ success: true, message: 'Scan started successfully' });
            return;
        }
        
        console.log('Found nmap container:', nmapContainer);
        
        // Execute the command in the nmap container with sudo
        const dockerCommand = `sudo docker exec ${nmapContainer} ${command}`;
        console.log('Executing docker command:', dockerCommand);
        
        const { stdout, stderr } = await execAsync(dockerCommand);
        console.log('Scan started:', stdout);
        if (stderr) console.error('Scan stderr:', stderr);
        res.json({ success: true, message: 'Scan started successfully' });
    } catch (error) {
        console.error('Error executing scan:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            cmd: error.cmd
        });
        res.status(500).json({ 
            error: 'Failed to execute scan',
            details: error.message
        });
    }
});

// Initialize watcher with environment variable if provided
if (currentWatchDir) {
  setupWatcher(currentWatchDir).catch(error => {
    console.error('Error setting up initial watcher:', error);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
