# watcher

A web application for monitoring and parsing nmap XML files.

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

## Security

This application implements security best practices including:
- Input validation
- Path traversal prevention
- Secure file handling
- Error handling
