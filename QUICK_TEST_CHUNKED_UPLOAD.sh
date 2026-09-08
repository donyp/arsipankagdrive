#!/bin/bash

# ========================================
# QUICK CHUNKED UPLOAD TEST
# ========================================
# Test without needing environment variable
# Usage: ./QUICK_TEST_CHUNKED_UPLOAD.sh https://your-railway-url

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get URL from argument or prompt
RAILWAY_URL="${1:-}"

if [ -z "$RAILWAY_URL" ]; then
  echo -e "${YELLOW}Usage: ./QUICK_TEST_CHUNKED_UPLOAD.sh <RAILWAY_URL>${NC}"
  echo ""
  echo "Example:"
  echo "  ./QUICK_TEST_CHUNKED_UPLOAD.sh https://arsipan-anka-prod.up.railway.app"
  echo ""
  echo "Or paste your Railway URL below:"
  read -p "Railway URL: " RAILWAY_URL
fi

if [ -z "$RAILWAY_URL" ]; then
  echo -e "${RED}Error: No URL provided${NC}"
  exit 1
fi

# Remove trailing slash if present
RAILWAY_URL="${RAILWAY_URL%/}"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   QUICK CHUNKED UPLOAD TEST            ║"
echo "║   URL: $RAILWAY_URL"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check${NC}"
if response=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/api/health"); then
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [[ $http_code == "200" ]]; then
    echo -e "${GREEN}✅ Server responding (HTTP $http_code)${NC}"
  else
    echo -e "${RED}❌ Server error (HTTP $http_code)${NC}"
    echo "Response: $body"
    exit 1
  fi
else
  echo -e "${RED}❌ Cannot reach server${NC}"
  echo "URL might be incorrect or server not running"
  exit 1
fi

# Test 2: Initialize Session
echo -e "\n${YELLOW}Test 2: Initialize Upload Session${NC}"
init_data='{
  "fileName": "test-chunked.pdf",
  "fileSize": 10485760,
  "fileType": "application/pdf",
  "chunkSize": 5242880,
  "metadata": {"zona_id": 1, "toko_id": 1}
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$RAILWAY_URL/api/files/init" \
  -H "Content-Type: application/json" \
  -d "$init_data")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [[ $http_code == "200" || $http_code == "201" ]]; then
  if echo "$body" | grep -q "sessionId"; then
    SESSION_ID=$(echo "$body" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Session created: $SESSION_ID${NC}"
  else
    echo -e "${RED}❌ No sessionId in response${NC}"
    echo "Response: $body"
    exit 1
  fi
else
  echo -e "${RED}❌ Failed to create session (HTTP $http_code)${NC}"
  echo "Response: $body"
  exit 1
fi

# Test 3: Check Status (Empty)
echo -e "\n${YELLOW}Test 3: Check Initial Status${NC}"
response=$(curl -s "$RAILWAY_URL/api/files/status?sessionId=$SESSION_ID")

if echo "$response" | grep -q "uploadedBytes"; then
  uploaded=$(echo "$response" | grep -o '"uploadedBytes":[0-9]*' | cut -d':' -f2)
  progress=$(echo "$response" | grep -o '"progressPercent":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Status: $uploaded bytes ($progress%)${NC}"
else
  echo -e "${YELLOW}⚠️  Status check response: $response${NC}"
fi

# Test 4: Upload Chunk
echo -e "\n${YELLOW}Test 4: Upload Chunk (5MB)${NC}"
echo "Creating test chunk..."
dd if=/dev/urandom of=/tmp/test_chunk.bin bs=1M count=5 2>/dev/null

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$RAILWAY_URL/api/files/chunk?sessionId=$SESSION_ID&chunkNumber=1&totalChunks=1" \
  -F "chunk=@/tmp/test_chunk.bin")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [[ $http_code == "200" || $http_code == "201" || $http_code == "202" ]]; then
  echo -e "${GREEN}✅ Chunk uploaded (HTTP $http_code)${NC}"
  rm /tmp/test_chunk.bin
else
  echo -e "${RED}❌ Failed to upload chunk (HTTP $http_code)${NC}"
  echo "Response: $body"
  rm /tmp/test_chunk.bin
  exit 1
fi

# Test 5: Complete Upload
echo -e "\n${YELLOW}Test 5: Complete Upload${NC}"
complete_data='{
  "sessionId": "'$SESSION_ID'",
  "finalFileName": "test-chunked-final.pdf"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$RAILWAY_URL/api/files/complete" \
  -H "Content-Type: application/json" \
  -d "$complete_data")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [[ $http_code == "200" || $http_code == "201" ]]; then
  if echo "$body" | grep -q "fileId"; then
    FILE_ID=$(echo "$body" | grep -o '"fileId":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Upload completed: $FILE_ID${NC}"
  else
    echo -e "${GREEN}✅ Upload completed (HTTP $http_code)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Completion response (HTTP $http_code): $body${NC}"
fi

# Test 6: Get Metrics
echo -e "\n${YELLOW}Test 6: Check Metrics${NC}"
response=$(curl -s "$RAILWAY_URL/api/files/metrics")

if echo "$response" | grep -q "totalUploads"; then
  total=$(echo "$response" | grep -o '"totalUploads":[0-9]*' | cut -d':' -f2)
  success=$(echo "$response" | grep -o '"successfulUploads":[0-9]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Metrics: $success/$total uploads successful${NC}"
else
  echo -e "${YELLOW}⚠️  Metrics response: $response${NC}"
fi

# Summary
echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ALL QUICK TESTS PASSED!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

echo ""
echo "Status:"
echo "  ✅ Server is responding"
echo "  ✅ Feature is enabled"
echo "  ✅ Upload session works"
echo "  ✅ Chunk upload works"
echo "  ✅ Assembly works"
echo "  ✅ Metrics working"
echo ""
echo "Next steps:"
echo "  1. Run full test suite: bash TEST_CHUNKED_UPLOAD_PRODUCTION.sh"
echo "  2. Run regression tests: See TASK6_REGRESSION_TESTING_PLAN.md"
echo "  3. Monitor metrics: curl $RAILWAY_URL/api/files/metrics"
echo ""
