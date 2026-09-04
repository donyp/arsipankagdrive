# Use Node.js 22 slim as base image (Node 18 deprecated for Supabase WebSocket support)
FROM node:22-slim

# Set working directory early
WORKDIR /app

# Update apt and install system dependencies (without Alist - causes build failure on Railway)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    rclone \
    git \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy backend dependencies first (better layer caching)
# Last updated: 2026-09-04 - Added root package.json for pdf-parse
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --production && cd backend && npm install --production && npm cache clean --force

# Copy frontend files
COPY css ./css
COPY js ./js
COPY *.html ./
COPY *.md ./

# Copy backend application
COPY backend ./backend
COPY start.sh ./
COPY generate-rclone-config.js ./

# Rclone config will be generated at runtime from environment variables
# No need to copy rclone.conf (it's in .gitignore anyway)

# Ensure scripts are executable
RUN chmod +x /app/start.sh

# Create data directories
RUN mkdir -p /app/data/log /app/data/temp /app/backend/data/log /app/backend/data/temp

# Environment variables
# Cloud Run uses PORT environment variable (default 8080)
# But we keep 7860 as default for local/Hugging Face compatibility
ENV PORT=${PORT:-8080}
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512
ENV LOG_LEVEL=warn

# Expose port
# 8080 for Cloud Run / Node backend
# (Alist disabled in this build - use rclone for storage instead)
EXPOSE 8080

# Add Health Check for Cloud Run / Kubernetes environments
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/heartbeat || exit 1

# Note on Different Environments:
# - Cloud Run: Uses PORT env var (8080), Health check enabled
# - Hugging Face Spaces: Uses PORT=7860, relies on port binding
# - Local/K8s: Uses PORT env var, Health check enabled
# - Railway: Uses PORT env var, Alist disabled
# - The app handles all scenarios via PORT environment variable
# 
# Note: Alist service disabled in this build to prevent Railway build failures
# Storage uses rclone (Google Drive) instead

# Start application
CMD ["/bin/bash", "/app/start.sh"]
