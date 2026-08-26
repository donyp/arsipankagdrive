FROM node:20-alpine

WORKDIR /app

# Install rclone
RUN apk add --no-cache rclone curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/heartbeat || exit 1

# Start application
CMD ["node", "server.js"]
