const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const xml2js = require('xml2js');
const cors = require('cors');
const { isValidDirectory } = require('./utils/validator');

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

    return result.nmaprun.host.map(host => {
      const address = host.address?.[0]?.$?.addr;
      const status = host.status?.[0]?.$?.state;
      const ports = host.ports?.[0]?.port?.map(port => ({
        portId: port.$?.portid,
        state: port.state?.[0]?.$?.state,
        service: port.service?.[0]?.$?.name,
        script: port.script?.[0]?.$?.output
      })) || [];

      return {
        address,
        status,
        ports,
        timestamp: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error(`Error parsing XML file ${filePath}:`, error);
    return [];
  }
};

// Setup directory watching
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
        const results = await parseNmapXML(filePath);
        if (results.length > 0) {
          scanResults = [...scanResults, ...results];
        }
      }
    })
    .on('change', async (filePath) => {
      if (await isScanComplete(filePath)) {
        const results = await parseNmapXML(filePath);
        if (results.length > 0) {
          scanResults = [...scanResults, ...results];
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
