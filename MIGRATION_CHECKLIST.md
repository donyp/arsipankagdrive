# Database Migration Checklist

Status: **PERLU DI-RUN DI SUPABASE**

## ✅ CRITICAL MIGRATIONS (MUST RUN)

### 1. **add_invoice_file_list.sql** ⭐⭐⭐
- **Status**: CRITICAL - Foundational schema for invoice system
- **Creates**: `invoice_file_list` table, `excel_upload_batches` table
- **Functions**: `get_invoice_statistics()`, `mark_old_pending_as_missing()`
- **Views**: `invoice_dashboard_summary`
- **What it does**: Creates the master invoice table structure
- **Run order**: **FIRST** (prerequisite for all other migrations)

```sql
-- Run in Supabase SQL Editor:
-- Copy entire content from: sql/add_invoice_file_list.sql
```

### 2. **add_invoice_file_tracking.sql** ⭐⭐⭐
- **Status**: CRITICAL - Adds file tracking columns
- **Adds columns**:
  - `invoice_pdf_path` - Path to invoice PDF
  - `bukti_bayar_path` - Path to bukti bayar document
  - `faktur_pajak_path` - Path to faktur pajak document
  - `files_uploaded_count` - Number of files uploaded (0/1/2/3)
  - `files_required_count` - Number of files required (2 or 3)
  - `invoice_uploaded_at` - Timestamp
  - `bukti_bayar_uploaded_at` - Timestamp
  - `faktur_pajak_uploaded_at` - Timestamp

- **Functions**:
  - `calculate_required_files_count()` - Returns 2 for NON PPN, 3 for PPN
  - `calculate_uploaded_files_count()` - Counts uploaded files
  - `get_invoice_file_status()` - Returns status in X/Y format
  - `get_invoice_statistics_v2()` - New statistics with file tracking

- **Views**: `invoice_file_status_summary`

- **What it does**: Adds file tracking and status display (0/2, 1/2, 2/2 for NON PPN; 0/3, 1/3, 2/3, 3/3 for PPN)

- **Run order**: **SECOND** (depends on add_invoice_file_list.sql)

```sql
-- Run in Supabase SQL Editor:
-- Copy entire content from: sql/add_invoice_file_tracking.sql
```

---

## 🟡 OPTIONAL MIGRATIONS

### add_update_history.sql
- Adds audit logging for invoice updates
- Optional but recommended for compliance

### add_notifications_system.sql
- Adds notification system
- Optional - only needed if you want in-app notifications

### add_session_management.sql
- Adds session tracking
- Optional - only needed for device tracking

---

## 🔴 DO NOT RUN (Testing/Debug Files)

These are debug/test files - **DO NOT RUN IN PRODUCTION**:
- `CHECK_*.sql` - Diagnostic queries
- `DEBUG_*.sql` - Debug helper scripts
- `CLEANUP_*.sql` - One-off cleanup scripts
- `CLEAN_*.sql` - Data cleaning scripts
- `MIGRATE_*.sql` - Legacy migration scripts
- `VERIFY_*.sql` - Verification helper scripts
- `COMPARE_*.sql` - Comparison scripts

---

## ✅ HOW TO RUN

### In Supabase Dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy entire content of **add_invoice_file_list.sql**
4. Click **Run** (green play button)
5. Wait for success message: ✅ Invoice file list system tables created successfully
6. Repeat for **add_invoice_file_tracking.sql**

### Verify Success:

```sql
-- Check if tables exist
SELECT * FROM invoice_file_list LIMIT 1;
SELECT * FROM excel_upload_batches LIMIT 1;

-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'invoice_file_list' 
  AND column_name IN ('invoice_pdf_path', 'bukti_bayar_path', 'faktur_pajak_path');

-- Test status view
SELECT * FROM invoice_file_status_summary LIMIT 1;

-- Test statistics function
SELECT * FROM get_invoice_statistics_v2();
```

---

## 📋 WHAT GETS CREATED

### Tables
- ✅ `invoice_file_list` (master invoice table with file tracking)
- ✅ `excel_upload_batches` (track Excel uploads)

### Columns Added to `invoice_file_list`
- ✅ `invoice_pdf_path` - Invoice PDF path
- ✅ `bukti_bayar_path` - Bukti bayar path
- ✅ `faktur_pajak_path` - Faktur pajak path
- ✅ `files_uploaded_count` - Files uploaded (0/1/2/3)
- ✅ `files_required_count` - Files required (2 or 3)
- ✅ `invoice_uploaded_at` - Invoice upload time
- ✅ `bukti_bayar_uploaded_at` - Bukti bayar upload time
- ✅ `faktur_pajak_uploaded_at` - Faktur pajak upload time

### Functions
- ✅ `calculate_required_files_count()`
- ✅ `calculate_uploaded_files_count()`
- ✅ `get_invoice_file_status()`
- ✅ `get_invoice_statistics_v2()`
- ✅ `update_invoice_files_count()`

### Views
- ✅ `invoice_file_status_summary` - Summary of all invoices with file status
- ✅ `invoice_dashboard_summary` - Dashboard view

### Indexes (for performance)
- ✅ `idx_invoice_files_count` - Fast lookup by file count
- ✅ `idx_invoice_faktur` - Fast lookup by faktur number
- ✅ `idx_invoice_status` - Fast lookup by status
- ✅ And 7 more performance indexes

---

## 🚀 NEXT STEPS

After running these migrations, the system will have:

1. ✅ Separate columns for each file type (invoice, bukti_bayar, faktur_pajak)
2. ✅ Automatic file count tracking (0/2, 1/2, 2/2 or 0/3, 1/3, 2/3, 3/3)
3. ✅ Download endpoints for each file type
4. ✅ Status display on frontend
5. ✅ Upload to correct GDrive folders (BUKTIBAYAR, FAKTURPAJAK, PPN/NON PPN)

---

## ❓ QUESTIONS

**Q: Do I need to run all migrations?**
A: No. Run only:
1. `add_invoice_file_list.sql` (REQUIRED)
2. `add_invoice_file_tracking.sql` (REQUIRED)

Others are optional.

**Q: What if I already ran them?**
A: The migrations use `IF NOT EXISTS` so they're safe to re-run.

**Q: Will it affect existing data?**
A: No. It only adds new columns and functions. Existing data is preserved.

**Q: Can I rollback?**
A: Yes, but be careful. You can delete the columns and functions manually if needed.
