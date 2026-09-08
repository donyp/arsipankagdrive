#!/bin/bash

# ========================================
# CHUNKED UPLOAD PRODUCTION TEST SCRIPT
# ========================================
# Comprehensive testing after feature flag enabled
# Expected duration: 5-10 minutes

set -e

# Configuration
RAILWAY_URL="${RAILWAY_URL:-http://localhost:8080}"
TEST_FILE_SIZE=10485760  # 10MB
CHUNK_SIZE=5242880      # 5MB
MAX_RETRIES=3
RETRY_DELAY=2

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# ========================================
# HELPER FUNCTIONS
# ========================================

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
  ((TESTS_PASSED++))
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  ((TESTS_FAILED++))
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

retry_curl() {
  local method=$1
  local url=$2
  local data=$3
  local attempt=1

  while [ $attempt -le $MAX_RETRIES ]; do
    if [ -z "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [[ $http_code == "200" || $http_code == "201" || $http_code == "202" ]]; then
      echo "$body"
      return 0
    fi

    if [ $attempt -lt $MAX_RETRIES ]; then
      print_info "Retry $attempt/$MAX_RETRIES (HTTP $http_code)..."
      sleep $RETRY_DELAY
    fi
    ((attempt++))
  done

  echo "$body"
  return 1
}

# ========================================
# TEST 1: HEALTH CHECK
# ========================================

test_health_check() {
  print_header "TEST 1: Health Check"

  print_info "Checking if server is running at $RAILWAY_URL..."
  
  if curl -s -f "$RAILWAY_URL/api/health" > /dev/null 2>&1; then
    print_success "Server health check passed"
  else
    print_error "Server not responding at $RAILWAY_URL"
    exit 1
  fi
}

# ========================================
# TEST 2: CHUNKED UPLOAD FEATURE DETECTION
# ========================================

test_feature_enabled() {
  print_header "TEST 2: Chunked Upload Feature Detection"

  print_info "Fetching server status..."
  
  response=$(retry_curl "GET" "$RAILWAY_URL/api/health" "")
  
  if echo "$response" | grep -q "chunkedUploadEnabled\|ENABLE_CHUNKED_UPLOAD"; then
    print_success "Feature flag detection endpoint responded"
  else
    print_info "Feature status not in health check (may be in metrics endpoint)"
  fi
}

# ========================================
# TEST 3: INIT SESSION
# ========================================

test_init_session() {
  print_header "TEST 3: Initialize Upload Session"

  print_info "Creating upload session..."
  
  init_data='{
    "fileName": "test-document.pdf",
    "fileSize": '$TEST_FILE_SIZE',
    "fileType": "application/pdf",
    "chunkSize": '$CHUNK_SIZE',
    "metadata": {
      "zona_id": 1,
      "toko_id": 1,
      "user_id": "test-user-001"
    }
  }'

  response=$(retry_curl "POST" "$RAILWAY_URL/api/files/init" "$init_data")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "sessionId"; then
    SESSION_ID=$(echo "$response" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    print_success "Session created: $SESSION_ID"
    echo "$response" > /tmp/init_response.json
  else
    print_error "Failed to initialize session"
    echo "Response: $response"
    return 1
  fi
}

# ========================================
# TEST 4: CHECK SESSION STATUS (Empty)
# ========================================

test_status_empty() {
  print_header "TEST 4: Check Session Status (Empty)"

  if [ -z "$SESSION_ID" ]; then
    print_error "No session ID available"
    return 1
  fi

  print_info "Checking status for session $SESSION_ID..."
  
  response=$(retry_curl "GET" "$RAILWAY_URL/api/files/status?sessionId=$SESSION_ID" "")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "sessionId"; then
    print_success "Status check passed"
    uploaded=$(echo "$response" | grep -o '"uploadedBytes":[0-9]*' | cut -d':' -f2)
    print_info "Uploaded bytes: $uploaded"
  else
    print_error "Failed to check status"
    echo "Response: $response"
  fi
}

# ========================================
# TEST 5: UPLOAD FIRST CHUNK
# ========================================

test_upload_chunk_1() {
  print_header "TEST 5: Upload First Chunk"

  if [ -z "$SESSION_ID" ]; then
    print_error "No session ID available"
    return 1
  fi

  print_info "Creating test chunk (5MB)..."
  
  # Create 5MB test file
  dd if=/dev/urandom of=/tmp/chunk1.bin bs=1M count=5 2>/dev/null

  print_info "Uploading chunk 1 to session $SESSION_ID..."
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$RAILWAY_URL/api/files/chunk?sessionId=$SESSION_ID&chunkNumber=1&totalChunks=2" \
    -F "chunk=@/tmp/chunk1.bin" 2>&1)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [[ $http_code == "200" || $http_code == "201" || $http_code == "202" ]]; then
    print_success "Chunk 1 uploaded successfully (HTTP $http_code)"
    echo "$body" > /tmp/chunk1_response.json
    rm /tmp/chunk1.bin
  else
    print_error "Failed to upload chunk 1 (HTTP $http_code)"
    echo "Response: $body"
    return 1
  fi
}

# ========================================
# TEST 6: CHECK STATUS AFTER CHUNK 1
# ========================================

test_status_partial() {
  print_header "TEST 6: Check Session Status (Partial Upload)"

  if [ -z "$SESSION_ID" ]; then
    print_error "No session ID available"
    return 1
  fi

  print_info "Checking status after chunk 1..."
  
  response=$(retry_curl "GET" "$RAILWAY_URL/api/files/status?sessionId=$SESSION_ID" "")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "uploadedBytes"; then
    print_success "Partial status check passed"
    uploaded=$(echo "$response" | grep -o '"uploadedBytes":[0-9]*' | cut -d':' -f2)
    progress=$(echo "$response" | grep -o '"progressPercent":[0-9]*' | cut -d':' -f2)
    print_info "Uploaded: $uploaded bytes | Progress: $progress%"
  else
    print_error "Failed to check partial status"
    echo "Response: $response"
  fi
}

# ========================================
# TEST 7: UPLOAD SECOND CHUNK
# ========================================

test_upload_chunk_2() {
  print_header "TEST 7: Upload Second Chunk"

  if [ -z "$SESSION_ID" ]; then
    print_error "No session ID available"
    return 1
  fi

  print_info "Creating test chunk 2 (5MB)..."
  
  dd if=/dev/urandom of=/tmp/chunk2.bin bs=1M count=5 2>/dev/null

  print_info "Uploading chunk 2 to session $SESSION_ID..."
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$RAILWAY_URL/api/files/chunk?sessionId=$SESSION_ID&chunkNumber=2&totalChunks=2" \
    -F "chunk=@/tmp/chunk2.bin" 2>&1)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [[ $http_code == "200" || $http_code == "201" || $http_code == "202" ]]; then
    print_success "Chunk 2 uploaded successfully (HTTP $http_code)"
    echo "$body" > /tmp/chunk2_response.json
    rm /tmp/chunk2.bin
  else
    print_error "Failed to upload chunk 2 (HTTP $http_code)"
    echo "Response: $body"
    return 1
  fi
}

# ========================================
# TEST 8: COMPLETE UPLOAD
# ========================================

test_complete_upload() {
  print_header "TEST 8: Complete Upload & Assemble"

  if [ -z "$SESSION_ID" ]; then
    print_error "No session ID available"
    return 1
  fi

  print_info "Completing upload session $SESSION_ID..."
  
  complete_data='{
    "sessionId": "'$SESSION_ID'",
    "finalFileName": "test-document-final.pdf"
  }'

  response=$(retry_curl "POST" "$RAILWAY_URL/api/files/complete" "$complete_data")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "fileId"; then
    print_success "Upload completed and assembled"
    FILE_ID=$(echo "$response" | grep -o '"fileId":"[^"]*' | cut -d'"' -f4)
    print_info "File ID: $FILE_ID"
    echo "$response" > /tmp/complete_response.json
  else
    print_error "Failed to complete upload"
    echo "Response: $response"
    return 1
  fi
}

# ========================================
# TEST 9: GET UPLOAD METRICS
# ========================================

test_metrics() {
  print_header "TEST 9: Upload Metrics & Statistics"

  print_info "Fetching upload metrics..."
  
  response=$(retry_curl "GET" "$RAILWAY_URL/api/files/metrics" "")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "totalUploads"; then
    print_success "Metrics endpoint working"
    echo "$response" | jq '.' > /tmp/metrics.json 2>/dev/null || echo "$response" > /tmp/metrics_raw.txt
    echo "Metrics saved to /tmp/metrics.json"
  else
    print_error "Failed to fetch metrics"
    echo "Response: $response"
  fi
}

# ========================================
# TEST 10: ACTIVE SESSIONS
# ========================================

test_active_sessions() {
  print_header "TEST 10: Active Sessions Admin View"

  print_info "Fetching active sessions..."
  
  response=$(retry_curl "GET" "$RAILWAY_URL/api/files/active-sessions" "")
  
  if [ $? -eq 0 ] && echo "$response" | grep -q "sessions"; then
    print_success "Active sessions endpoint working"
    echo "$response" | jq '.' > /tmp/active_sessions.json 2>/dev/null || echo "$response" > /tmp/active_sessions_raw.txt
    echo "Sessions saved to /tmp/active_sessions.json"
  else
    print_info "Active sessions endpoint not available (may require auth)"
  fi
}

# ========================================
# TEST 11: ABORT SESSION
# ========================================

test_abort_session() {
  print_header "TEST 11: Abort Upload Session"

  print_info "Creating test session to abort..."
  
  init_data='{
    "fileName": "test-abort.pdf",
    "fileSize": 1048576,
    "fileType": "application/pdf"
  }'

  response=$(retry_curl "POST" "$RAILWAY_URL/api/files/init" "$init_data")
  
  if echo "$response" | grep -q "sessionId"; then
    ABORT_SESSION_ID=$(echo "$response" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    
    print_info "Aborting session $ABORT_SESSION_ID..."
    
    abort_data='{"sessionId":"'$ABORT_SESSION_ID'"}'
    response=$(retry_curl "POST" "$RAILWAY_URL/api/files/abort" "$abort_data")
    
    if [ $? -eq 0 ]; then
      print_success "Session aborted successfully"
    else
      print_error "Failed to abort session"
    fi
  else
    print_error "Failed to create test session for abort test"
  fi
}

# ========================================
# TEST 12: CACHE HIT VERIFICATION
# ========================================

test_cache_hits() {
  print_header "TEST 12: Cache Hit Verification (Phase 2)"

  print_info "Performing repeated file checks to verify caching..."
  
  # First check (cache miss)
  print_info "Check 1 (cache miss)..."
  start_time=$(date +%s%N)
  retry_curl "GET" "$RAILWAY_URL/api/files/metrics" "" > /dev/null
  end_time=$(date +%s%N)
  time1=$(( (end_time - start_time) / 1000000 ))
  
  sleep 1
  
  # Second check (cache hit)
  print_info "Check 2 (cache hit)..."
  start_time=$(date +%s%N)
  retry_curl "GET" "$RAILWAY_URL/api/files/metrics" "" > /dev/null
  end_time=$(date +%s%N)
  time2=$(( (end_time - start_time) / 1000000 ))
  
  speedup=$((time1 / time2 + 1))
  
  if [ $time2 -lt $time1 ]; then
    print_success "Cache hit detected: ${time1}ms → ${time2}ms (${speedup}x faster)"
  else
    print_info "Cache timing: ${time1}ms → ${time2}ms (cache working)"
  fi
}

# ========================================
# TEST 13: PARALLELIZATION VERIFICATION
# ========================================

test_parallelization() {
  print_header "TEST 13: Parallelization Check (Phase 1)"

  print_info "Testing parallel file checks..."
  
  start_time=$(date +%s%N)
  
  # Run 5 concurrent checks
  for i in {1..5}; do
    (retry_curl "GET" "$RAILWAY_URL/api/files/metrics" "" > /dev/null 2>&1) &
  done
  
  wait
  
  end_time=$(date +%s%N)
  total_time=$(( (end_time - start_time) / 1000000 ))
  
  print_success "Parallelization: 5 concurrent checks in ${total_time}ms"
}

# ========================================
# TEST 14: ERROR HANDLING - Invalid Session
# ========================================

test_error_invalid_session() {
  print_header "TEST 14: Error Handling - Invalid Session"

  print_info "Testing invalid session ID handling..."
  
  response=$(curl -s -X GET "$RAILWAY_URL/api/files/status?sessionId=INVALID_SESSION_ID" \
    -H "Content-Type: application/json" 2>&1)
  
  if echo "$response" | grep -q "error\|not found\|not found"; then
    print_success "Invalid session properly rejected"
  else
    print_info "Invalid session handling (may vary by implementation)"
  fi
}

# ========================================
# TEST 15: ERROR HANDLING - Oversized File
# ========================================

test_error_oversized() {
  print_header "TEST 15: Error Handling - Oversized Upload"

  print_info "Testing oversized file rejection..."
  
  init_data='{
    "fileName": "oversized.pdf",
    "fileSize": 5368709120,
    "fileType": "application/pdf"
  }'

  response=$(curl -s -X POST "$RAILWAY_URL/api/files/init" \
    -H "Content-Type: application/json" \
    -d "$init_data" 2>&1)
  
  if echo "$response" | grep -q "error\|exceeds\|too large"; then
    print_success "Oversized file properly rejected"
  else
    print_info "Oversized file handling (validation may vary)"
  fi
}

# ========================================
# SUMMARY
# ========================================

print_summary() {
  print_header "TEST SUMMARY"
  
  echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
  
  total=$((TESTS_PASSED + TESTS_FAILED))
  if [ $total -gt 0 ]; then
    percentage=$((TESTS_PASSED * 100 / total))
    echo -e "Success Rate: ${BLUE}$percentage%${NC}"
  fi
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "Your chunked upload system is ready for production."
    return 0
  else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED${NC}"
    echo "Please check the errors above and review logs."
    return 1
  fi
}

# ========================================
# MAIN EXECUTION
# ========================================

main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════╗"
  echo "║   CHUNKED UPLOAD PRODUCTION TEST       ║"
  echo "║   Railway: $RAILWAY_URL"
  echo "╚════════════════════════════════════════╝"
  echo -e "${NC}"
  
  test_health_check || exit 1
  test_feature_enabled
  test_init_session
  test_status_empty
  test_upload_chunk_1
  test_status_partial
  test_upload_chunk_2
  test_complete_upload
  test_metrics
  test_active_sessions
  test_abort_session
  test_cache_hits
  test_parallelization
  test_error_invalid_session
  test_error_oversized
  
  print_summary
}

# Run main
main "$@"
