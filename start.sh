#!/bin/bash

# Pusat Arsip Anka - Startup Script
# This script starts Alist service (port 5244) and Node.js backend (port 8080/7860)

echo "=========================================="
echo "Starting Pusat Arsip Anka"
echo "=========================================="

# Create necessary directories
mkdir -p /app/data/log
mkdir -p /app/data/temp
mkdir -p /app/backend/data/log
mkdir -p /app/backend/data/temp
mkdir -p /app/backend/tmp
mkdir -p /root/.config/alist
chmod -R 777 /app/data /app/backend/tmp

# Export PORT for Hugging Face (default 7860) / Cloud Run (8080)
export PORT=${PORT:-7860}
export NODE_ENV=production

echo "[INIT] PORT is set to: $PORT"
echo "[INIT] NODE_ENV is set to: $NODE_ENV"

# Generate rclone.conf from environment variables
echo "[INIT] Generating rclone.conf from environment variables..."
node /app/generate-rclone-config.js

# ============================================================
# START ALIST SERVICE (Background)
# ============================================================

echo "[INIT] Starting Alist service on port 5244..."

# Create Alist config directory
mkdir -p /root/.config/alist

# Start Alist in background with nohup
# Alist logs go to /app/data/log/alist.log
nohup /usr/local/bin/alist server > /app/data/log/alist.log 2>&1 &
ALIST_PID=$!
echo "[ALIST] Process ID: $ALIST_PID"

# Wait for Alist to start and check if port 5244 is listening
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 1
    if nc -z localhost 5244 2>/dev/null; then
        echo "[ALIST] ✅ Service is listening on port 5244"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    
    # Check if Alist process is still running
    if ! kill -0 $ALIST_PID 2>/dev/null; then
        echo "[ALIST] ⚠️  Process died, checking logs:"
        tail -20 /app/data/log/alist.log
        echo "[ALIST] WARNING: Alist process exited unexpectedly, continuing with Node.js..."
        break
    fi
    
    echo "[ALIST] Waiting for service... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
done

# If Alist didn't start, show warning but continue
if ! nc -z localhost 5244 2>/dev/null; then
    echo "[ALIST] ⚠️  WARNING: Alist service may not be running on port 5244"
    echo "[ALIST] Check logs at: /app/data/log/alist.log"
else
    echo "[ALIST] ✅ Alist service started successfully"
fi

# ============================================================
# FUNCTION TO CLEAN UP PROCESSES
# ============================================================

cleanup() {
    echo "[SHUTDOWN] Cleaning up processes..."
    
    # Kill Alist if running
    if [ ! -z "$ALIST_PID" ] && kill -0 $ALIST_PID 2>/dev/null; then
        echo "[SHUTDOWN] Killing Alist (PID: $ALIST_PID)..."
        kill $ALIST_PID 2>/dev/null || true
        sleep 1
        kill -9 $ALIST_PID 2>/dev/null || true
    fi
    
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGTERM SIGINT

# ============================================================
# START NODE.JS BACKEND
# ============================================================

echo "[INIT] Starting Node.js backend server..."
cd /app/backend

# Start Node in foreground
# It will connect to Alist on localhost:5244 or fall back to LocalStorage
node server.js 2>&1 &
NODE_PID=$!

# Wait for Node to complete
wait $NODE_PID

# Node exited, clean up and exit
echo "[SHUTDOWN] Node.js server exited"
cleanup

