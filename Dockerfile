# Build stage for frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app/backend

# Install necessary packages including Docker
RUN apk add --no-cache \
    sudo \
    docker \
    docker-cli-compose && \
    echo "node ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/node && \
    chmod 0440 /etc/sudoers.d/node

# Copy backend files
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# Copy built frontend files from build stage
COPY --from=frontend-build /app/frontend/dist/ /app/backend/public/

# Create watch directory with appropriate permissions
RUN mkdir -p /watch && \
    chown -R node:node /watch

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
