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

# Install necessary packages and configure sudo
RUN apk add --no-cache sudo && \
    echo "node ALL=(ALL) NOPASSWD: /bin/chown" >> /etc/sudoers.d/node && \
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

# Start command - updated to use server.js
CMD ["node", "server.js"]
