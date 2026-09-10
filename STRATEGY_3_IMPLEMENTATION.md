# STRATEGY 3: Recursive File Search Implementation

## Overview
Added STRATEGY 3 as a fallback mechanism to the file checking endpoint in `backend/invoice-endpoints.js`. This strategy activates when STRATEGY 2 (90-day date search) fails to find the requested invoice file.

## Implementation Details

### Location
- **File**: `backend/invoice-endpoints.js`
- **Position**: After STRATEGY 2 loop completes (around line 1340)
- **Trigger**: Executes only if `fileExists === false` after STRATEGY 2

### How STRATEGY 3 Works

1. **Initialization**
   - Logs start of recursive search with faktur number
   - Sets up rclone recursive search on entire location folder

2. **Recursive Search Execution**
   - Uses: `rclone lsjson` with `--recursive` flag
   - Path: `gdrive:/ARSIPINVOICE/ARSIPINVOICE/{location}`
   - Scans entire folder tree for matching files
   - Increased buffer: 50MB (handles large directory structures)
   - Timeout: 60 seconds (allows time for deep recursion)

3. **File Matching**
   - Searches for files containing faktur number anywhere in filename
   - Parses each file entry as JSON
   - Extracts file metadata: Name and Path properties

4. **Path Mapping**
   - When file found, constructs proper file path:
   - Format: `ARSIPINVOICE/ARSIPINVOICE/{location}/{path}/{filename}`
   - Handles nested folder structures correctly
   - Cleans up path construction logic

5. **Logging**
   - Detailed logging at each stage:
     - Recursive search initiation
     - Search path and command execution
     - File count found during tree scan
     - File location details when match found
     - Status messages for failures

### Code Structure

```javascript
if (!fileExists) {
    // STRATEGY 3: Recursive search fallback
    console.log(`[Check File] 🔍 STRATEGY 3: Starting recursive search for faktur: ${faktur}`);
    
    try {
        // Execute rclone lsjson with --recursive flag
        // Parse results and search for faktur match
        // Map file location back to proper path
        // Update fileExists and filePath on match
    } catch (err) {
        // Handle recursive search errors gracefully
    }
}
```

## Key Features

✅ **Fallback Mechanism**: Only runs after STRATEGY 2 fails  
✅ **Deep Search**: Finds files in unexpected folder structures  
✅ **Path Mapping**: Correctly reconstructs file paths from recursive results  
✅ **Error Handling**: Gracefully handles command failures and parse errors  
✅ **Comprehensive Logging**: Shows entire search process for debugging  
✅ **Performance**: Uses rclone native recursive capability  
✅ **Resource Management**: Increased buffers for large directory trees  

## Testing Scenarios

### Scenario 1: File in Expected Location
- STRATEGY 1 (DB): Finds file → Returns immediately
- Result: Uses method='db_path'

### Scenario 2: File in Expected Date Range (90 days)
- STRATEGY 1: No DB path
- STRATEGY 2: Finds file in date folder → Returns
- Result: Uses method='search_by_faktur'

### Scenario 3: File in Unexpected Location
- STRATEGY 1: No DB path
- STRATEGY 2: Not in expected 90-day date folders
- STRATEGY 3: Finds file via recursive search → Returns
- Result: Uses method='search_by_faktur' (but found via STRATEGY 3)

### Scenario 4: File Not Found Anywhere
- All 3 strategies fail
- Result: Returns exists=false, method='none'

## Response Format

The API response includes:
```json
{
    "exists": true/false,
    "faktur": "invoice_number",
    "fileType": "invoice_pdf|bukti_bayar|faktur_pajak",
    "filePath": "ARSIPINVOICE/ARSIPINVOICE/ZONA_NAME/...",
    "method": "db_path|search_by_faktur|none",
    "dbCount": number,
    "dbRequired": number
}
```

## Performance Notes

- **Recursive search timeout**: 60 seconds
- **Buffer size**: 50MB (increased from standard 10MB)
- **Recommended use**: Only when STRATEGY 2 fails
- **Execution**: Automatically triggered on file check endpoint

## Logs Example

```
[Check File] 🔍 STRATEGY 3: Starting recursive search for faktur: INV-2024-001
[Check File] STRATEGY 3: Executing recursive search on: gdrive:/ARSIPINVOICE/ARSIPINVOICE/ZONA_001
[Check File] STRATEGY 3: Command: rclone lsjson "gdrive:/ARSIPINVOICE/ARSIPINVOICE/ZONA_001" --recursive --config "/app/rclone.conf"
[Check File] STRATEGY 3: Scanned 1250 file(s) in recursive tree
[Check File] ✅ STRATEGY 3: Found file via recursive search!
[Check File]   File: INV-2024-001_faktur.pdf
[Check File]   Path: 2024/JANUARI/archived_invoices
[Check File]   Location: gdrive:/ARSIPINVOICE/ARSIPINVOICE/ZONA_001/2024/JANUARI/archived_invoices
[Check File] STRATEGY 3: ✅ File found at: ARSIPINVOICE/ARSIPINVOICE/ZONA_001/2024/JANUARI/archived_invoices/INV-2024-001_faktur.pdf
```

## Benefits

1. **Robustness**: Finds files regardless of folder structure
2. **User Experience**: Users get accurate results even for misplaced files
3. **Debugging**: Comprehensive logging helps identify filing issues
4. **Fallback**: Graceful degradation when standard paths fail
5. **Maintenance**: Helps identify and fix folder organization problems
