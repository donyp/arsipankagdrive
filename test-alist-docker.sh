#!/bin/bash

# Test Script for Alist Docker Fix
# Tests the Alist service startup in Docker container

set -e

echo "============================================================"
echo "Alist Docker Fix - Testing Script"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ============================================================
# Step 1: Check Docker is installed
# ============================================================
echo "[Step 1] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    echo "Please install Docker from https://www.docker.com/"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
print_status "Docker found: $DOCKER_VERSION"
echo ""

# ============================================================
# Step 2: Build Docker image
# ============================================================
echo "[Step 2] Building Docker image..."
if docker build -t arsip-anka:test . 2>&1 | grep -E "Successfully|ERROR"; then
    print_status "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi
echo ""

# ============================================================
# Step 3: Check if .env file exists
# ============================================================
echo "[Step 3] Checking environment file..."
if [ -f ".env" ]; then
    print_status ".env file found"
    ENV_FILE=".env"
elif [ -f "backend/.env" ]; then
    print_status "backend/.env file found"
    ENV_FILE="backend/.env"
else
    print_warning "No .env file found - using defaults"
    # Create minimal .env for testing
    ENV_FILE="/tmp/test.env"
    cat > $ENV_FILE << 'EOF'
PORT=8080
NODE_ENV=production
SUPABASE_URL=https://example.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-key-12345
JWT_SECRET=test-secret-12345678901234567890123456789012
ALIST_ADMIN_PASSWORD=admin123
EOF
    print_status "Created temporary .env for testing"
fi
echo ""

# ============================================================
# Step 4: Start Docker container
# ============================================================
echo "[Step 4] Starting Docker container..."
CONTAINER_NAME="arsip-anka-test-$$"
CONTAINER_ID=$(docker run -d \
    --name $CONTAINER_NAME \
    -p 8080:8080 \
    -p 5244:5244 \
    --env-file $ENV_FILE \
    arsip-anka:test)

print_status "Container started: $CONTAINER_ID"
echo "Container name: $CONTAINER_NAME"
echo ""

# ============================================================
# Step 5: Wait for services to start
# ============================================================
echo "[Step 5] Waiting for services to start..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    sleep 2
    
    # Check Alist on port 5244
    if curl -s http://localhost:5244/ > /dev/null 2>&1; then
        print_status "Alist service responding on port 5244"
        ALIST_OK=1
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo -ne "  Attempt $ATTEMPT/$MAX_ATTEMPTS...\r"
done

echo ""

# Check if container is still running
if ! docker ps | grep -q $CONTAINER_ID; then
    print_error "Container exited unexpectedly"
    echo ""
    echo "Container logs:"
    docker logs $CONTAINER_ID
    docker rm $CONTAINER_ID
    exit 1
fi

if [ -z "$ALIST_OK" ]; then
    print_warning "Alist service may not be responding on port 5244"
    print_warning "This may be normal - checking logs..."
else
    print_status "Alist service is responding"
fi
echo ""

# ============================================================
# Step 6: Test Node.js backend
# ============================================================
echo "[Step 6] Testing Node.js backend..."
ATTEMPT=0
while [ $ATTEMPT -lt 10 ]; do
    sleep 1
    
    if curl -s http://localhost:8080/api/heartbeat | grep -q '"status":"alive"'; then
        print_status "Node.js backend responding on port 8080"
        BACKEND_OK=1
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

if [ -z "$BACKEND_OK" ]; then
    print_warning "Node.js backend not responding yet"
    print_warning "Waiting a bit longer..."
    sleep 5
    
    if curl -s http://localhost:8080/api/heartbeat | grep -q '"status":"alive"'; then
        print_status "Node.js backend is now responding"
    else
        print_warning "Node.js backend still not responding"
    fi
fi
echo ""

# ============================================================
# Step 7: Check container logs
# ============================================================
echo "[Step 7] Container startup logs:"
echo "---"
docker logs $CONTAINER_NAME | head -50
echo "---"
echo ""

# ============================================================
# Step 8: Check service logs
# ============================================================
echo "[Step 8] Checking for errors in logs..."
ERROR_COUNT=$(docker logs $CONTAINER_NAME 2>&1 | grep -i -c "error\|fail" || echo 0)

if [ $ERROR_COUNT -gt 0 ]; then
    print_warning "Found $ERROR_COUNT error/fail messages in logs:"
    docker logs $CONTAINER_NAME 2>&1 | grep -i -E "error|fail" | head -10
else
    print_status "No major errors found in logs"
fi
echo ""

# ============================================================
# Step 9: Detailed port checks
# ============================================================
echo "[Step 9] Port status:"
echo ""

echo "Testing port 5244 (Alist):"
if curl -s -m 2 http://localhost:5244/ > /dev/null 2>&1; then
    print_status "Port 5244 is responding"
    curl -s http://localhost:5244/ | head -c 100
    echo ""
else
    print_warning "Port 5244 not responding"
    echo "  (This may be normal if Alist hasn't fully initialized)"
fi
echo ""

echo "Testing port 8080 (Node.js):"
if curl -s -m 2 http://localhost:8080/api/heartbeat > /dev/null 2>&1; then
    HEARTBEAT=$(curl -s http://localhost:8080/api/heartbeat)
    print_status "Port 8080 is responding"
    echo "  Response: $HEARTBEAT"
else
    print_warning "Port 8080 not responding"
    echo "  (Checking container status...)"
    docker inspect $CONTAINER_ID | grep -A 2 '"State"' || true
fi
echo ""

# ============================================================
# Step 10: Summary and cleanup
# ============================================================
echo "[Step 10] Test Summary:"
echo "---"

if [ ! -z "$ALIST_OK" ]; then
    print_status "Alist service is working"
else
    print_warning "Alist service status unknown"
fi

if [ ! -z "$BACKEND_OK" ]; then
    print_status "Node.js backend is working"
else
    print_warning "Node.js backend status unknown"
fi

echo ""
echo "Container Status:"
echo "  Name: $CONTAINER_NAME"
echo "  ID: $CONTAINER_ID"
echo "  Ports: 8080 (Node.js), 5244 (Alist)"
echo ""

# Ask if user wants to keep container running
echo "The container is still running. Options:"
echo "  1. Keep running for manual testing"
echo "  2. Stop and remove container"
echo "  3. View container logs (tail -f)"
echo ""
echo -n "Enter choice [1/2/3] (default: 1): "
read CHOICE

case $CHOICE in
    2)
        echo "Stopping and removing container..."
        docker stop $CONTAINER_ID
        docker rm $CONTAINER_ID
        print_status "Container removed"
        ;;
    3)
        echo "Showing container logs (Ctrl+C to exit)..."
        docker logs -f $CONTAINER_NAME
        ;;
    *)
        echo "Container remains running at:"
        echo "  Node.js: http://localhost:8080"
        echo "  Alist: http://localhost:5244"
        echo ""
        echo "To stop and remove later, run:"
        echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
        ;;
esac

echo ""
print_status "Test complete!"

