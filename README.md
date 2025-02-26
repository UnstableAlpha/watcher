# watcher

A web application for monitoring and parsing nmap XML files.

## Features

- Real-time monitoring of Nmap XML output files
- Automatic parsing and display of scan results
- Support for multiple hosts and port information
- Advanced filtering capabilities:
  - Port-based filtering with AND/OR/NOT operations
  - Service-based filtering with AND/OR/NOT operations
  - Combined port and service filters
- Export functionality for filtered host lists
- Docker-based deployment for easy setup
- Service version scanning integration

## Prerequisites

- Docker
- Docker Compose
- Node.js (for development)
The local user should also be a member of the docker group for correct execution

## Setup

1. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Configure environment:
   - Create a .env file in the project root
   - Set your watch directory in .env - this is the directory that the application will watch for new nmap output.
```bash
# Nmap Monitor Configuration

# Directory to watch for Nmap XML files
# This directory will be mounted into the Docker container at /watch
WATCH_DIR=/path/to/your/nmap/directory

# Port for the web application to listen on
PORT=3000

# Debug mode for additional logging (true/false)
DEBUG=false
```

3. Run with Docker:
   ```bash
   docker-compose up --build
   ```

## Usage

1. Browse to the application using your browser (default: http://localhost:3000)
2. The application monitors the "WATCH_DIR" directory for new nmap .xml output
3. Views:
   - **Hosts View**: Shows all discovered hosts and their open ports
     - Supports service scanning for detailed port information
     - Maintains scan history and state changes
   - **Ports View**: Shows all open ports and their associated hosts
     - Advanced filtering system for specific port/service combinations
     - Export functionality for filtered host lists

## Project Structure
```
nmap-monitor/
├── backend/           # Express server for file monitoring
│   ├── src/
│   │   ├── services/ # Core services
│   │   └── utils/    # Utility functions
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/      # Custom React hooks
│   │   └── utils/      # Utility functions
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Roadmap
- Update application to allow creation of new nmap scans from within the interface
- Update nmap container to permit use of nmap scripting engine (nse)
- Allow for tool upload from other tooling
- Permit use of other scanners (E.g. Initial scanning with masscan or rustscan before handoff to nmap)
- Allow file upload from other tools, e.g. Nessus
- Permit service scanning with other tools direct from interface (E.g. when detecting port 443, launch testssl.sh container for additional scans)
