# watcher

A web application for monitoring and parsing nmap XML files.

## Features

- Real-time monitoring of Nmap XML output files
- Automatic parsing and display of scan results
- Support for multiple hosts and port information
- Docker-based deployment for easy setup

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
WATCH_DIR=/home/jb/testing/BrysonExternal/nmap/merged

# Port for the web application to listen on
PORT=3000

# Debug mode for additional logging (true/false)
DEBUG=false
```

3. Run with Docker:
   ```bash
   docker-compose up --build
   ```
4. App Useage:
- Browse to the application using your browser. By default this will be http://localhost:3000
- The application monitors the "WATCH_DIR" directory for new nmap .xml output. It will refresh the display. It will take ownership of any new files. You can still run nmap as root.
- The "Hosts" view shows a list of all discovered hosts and their open ports.
- The "Ports" view shows a list of all open ports and their associated hosts. Filter functionality exists to display specific port or service information, with the ability to export host lists for use with other tooling.
- It is also possible to launch a full version scan from the "Hosts" view. This runs from an nmap container launched specifically for this purpose. The application will automatically update itself on completion.

## Project Structure
```
nmap-monitor/
├── backend/           # Express server for file monitoring
├── frontend/         # React frontend application
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Roadmap
- Update application to allow creation of new nmap scans from within the interface.
- Update nmap container to permit use of nmap scripting engine (nse).
- Allow for tool upload from other tooling.
- Permit use of other scanners (E.g. Initial scanning with masscan or rustscan before handoff to nmap).
- Allow file upload from other tools, e.g. Nessus.
- Permit service scanning with other tools direct from interface (E.g. when detecting port 443, launch testssl.sh container for additional scans)
