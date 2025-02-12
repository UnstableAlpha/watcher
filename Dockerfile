# Base stage - This sets up our foundational image
FROM node:20-alpine AS base
WORKDIR /app

# Frontend build stage - This compiles our React application
FROM base AS frontend-builder
WORKDIR /app/frontend
# Copy package files first to leverage Docker cache
COPY frontend/package*.json ./
RUN npm install
# Copy the rest of the frontend files
COPY frontend/ .
# Build the frontend application
RUN npm run build

# Ensure all configuration files are copied
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/vite.config.js ./
RUN npm run build

# Backend build stage - This prepares our server application
FROM base AS backend-builder
WORKDIR /app/backend
# Copy package files first to leverage Docker cache
COPY backend/package*.json ./
RUN npm install
# Copy the rest of the backend files
COPY backend/ .

# Production stage - This creates our final, optimised image
FROM node:20-alpine
WORKDIR /app
# Copy built backend and frontend files
COPY --from=backend-builder /app/backend ./
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose the port our application will run on
EXPOSE 3000
# Start the application
CMD ["npm", "start"]
