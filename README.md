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

## Setup

1. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Configure environment:
   - Copy .env.example to .env
   - Set your watch directory in .env

3. Run with Docker:
   ```bash
   docker-compose up --build
   ```

## Development

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && npm run dev`

## Project Structure
```
nmap-monitor/
├── backend/           # Express server for file monitoring
├── frontend/         # React frontend application
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Security

This application implements security best practices including:
- Input validation
- Path traversal prevention
- Secure file handling
- Error handling
