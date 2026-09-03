# Zone-Based Invoice Access Control - Testing Guide

## Overview
This document outlines the testing procedures to verify that admin_zona users can only see invoices from their assigned zone's stores.

## Pre-requisites
1. Database migrations applied:
   - `sql/update_zona_toko_mapping.sql` - Updated zona and toko tables with 143 stores across 17 zones
   - `sql/add_zona_id_to_invoice_file_list.sql` - Added zona_id and toko_id columns to invoice_file_list

2. Backend code updated:
   - `backend/invoice-endpoints.js` - Added zona filtering to /api/invoice/list endpoint

3. Frontend code updated:
   - `js/dashboard.js` - Updated loadFilterOptions() to display zone-filtered supplier list

## Test Cases

### Test 1: Admin Zona User Dashboard Load
**Objective**: Verify admin_zona user sees only their zone's data on dashboard

**Steps**:
1. Login as admin_zona user (e.g., for Zona 01)
2. Navigate to dashboard
3. Open Browser DevTools > Console
4. Look for logs: `[Filter] Current user role: admin_zona zona_id: X`
5. Look for logs: `[Filter] ✅ Admin Zona: Supplier list is zone-filtered`
6. Verify supplier dropdown only shows stores from their zone

**Expected Result**:
- Supplier dropdown shows only stores assigned to user's zona (e.g., for Zona 01: ANKA BEKASI, MEGA BAJA BALARAJA, etc.)
- Statistics cards are HIDDEN for admin_zona users
- Only Year, Month, Supplier, and Keterangan filters are visible
- Console shows zone-filtering logs

---

### Test 2: API Filtering Verification
**Objective**: Verify /api/invoice/list API filters by zona_id for admin_zona

**Steps**:
1. Login as admin_zona user (zona_id = 1 for Zona 01)
2. Open Browser DevTools > Network tab
3. Trigger filter load or navigate to dashboard
4. Find request to `/api/invoice/list?limit=10000&offset=0`
5. Check response data

**Expected Result**:
- Response only contains invoices with `zona_id: 1` (matching user's zone)
- All toko values in response belong to Zona 01
- If user is Zona 02 admin, only sees Zona 02 stores

**Response Example** (for Zona 01 admin):
```json
{
  "success": true,
  "data": [
    {
      "faktur": "INV-001",
      "toko": "ANKA BEKASI",
      "zona_id": 1,
      "keterangan": "PPN",
      "total_jumlah_jual": 50000000,
      "status": "PENDING"
    }
  ],
  "count": 42,
  "limit": 10000,
  "offset": 0
}
```

---

### Test 3: Supplier Filter Dropdown
**Objective**: Verify supplier dropdown only shows stores from admin_zona's zone

**Steps**:
1. Login as admin_zona user (e.g., Zona 08)
2. Go to dashboard invoice section
3. Look at "Supplier" dropdown
4. Document all visible options

**Expected Result - Zona 08 Admin should see**:
- Mega Baja Indonesia - Semarang
- Mega Baja Brebes
- Mega Baja Semarang Unggaran
- Mega Baja Pemalang
- Mega Baja Kudus
- Mega Baja Slawi
- Mega Baja Kendal
- Mega Baja Rembang
- Mega Baja Comal
- Mega Baja Temanggung

**Should NOT see** (stores from other zones):
- ANKA BEKASI (Zona 01)
- Mega Baja Bogor (Zona 06A)
- Mega Baja Surabaya (Zona 10)
- etc.

---

### Test 4: Filter Application
**Objective**: Verify filtering works correctly when applied

**Steps**:
1. Login as admin_zona user for Zona 03A
2. Select a supplier from dropdown (e.g., "Mega Baja Condet")
3. Click "Terapkan Filter" button
4. Check results and API request

**Expected Result**:
- Only invoices from selected store and user's zone are displayed
- Console shows: `[Filter] Filtering for admin_zona with zona_id: X`
- Invoice table shows only matching records
- Total count updates accordingly

---

### Test 5: Month/Year Filtering
**Objective**: Verify admin_zona can filter by month and year

**Steps**:
1. Login as admin_zona user
2. Select a Year (e.g., 2026)
3. Select a Month (e.g., September)
4. Click "Terapkan Filter"
5. Verify results

**Expected Result**:
- Only invoices from selected month/year in user's zone are shown
- Combines zona filter + month/year filter correctly
- Data is accurate to the selected period

---

### Test 6: Regular User vs Admin Zona Comparison
**Objective**: Verify regular users see different data than admin_zona

**Prerequisites**: Create/have 2 test users:
- regular_user (non admin_zona)
- admin_zona_user (admin_zona role with zona_id = 1)

**Steps**:
1. Login as regular_user
2. Document visible suppliers in dropdown
3. Note total invoice count
4. Logout and login as admin_zona_user
5. Document visible suppliers
6. Note total invoice count

**Expected Result**:
- Regular user sees ALL suppliers from all zones
- Admin zona user sees ONLY suppliers from their zone
- Admin zona user has fewer invoices in total

**Example**:
- Regular user suppliers: 143 total (all zones)
- Zona 01 admin: 9 stores (Balaraja, Serang Timur, Bitung, etc.)
- Zona 08 admin: 10 stores (Semarang, Brebes, etc.)

---

### Test 7: Statistics Display
**Objective**: Verify statistics are hidden for admin_zona

**Steps**:
1. Login as admin_zona user
2. Navigate to dashboard invoice section
3. Look for statistics cards (Total, Uploaded, Pending, Missing)

**Expected Result**:
- Statistics cards are NOT visible for admin_zona
- Regular users see statistics cards

**Verification in Code**:
```javascript
// setupAdminZonaFilters() hides stats
statsContainer.style.display = 'none';
```

---

### Test 8: Cross-Zone Access Prevention
**Objective**: Verify admin_zona cannot access other zones' data via URL manipulation

**Steps**:
1. Login as Zona 01 admin
2. Try to manually filter by adding `?zona_id=2` to API call
3. Check response

**Expected Result**:
- Backend should either:
  - Ignore the zona_id parameter and use user's actual zona_id
  - OR return 403 Forbidden error
- User cannot see Zona 02 data

---

## Browser Console Log Checklist

When testing admin_zona dashboard, look for these logs:

✅ **Expected Logs**:
```
[Filter] Current user role: admin_zona zona_id: 1
[Filter] Fetching from: /api/invoice/list?limit=10000&offset=0
[Filter] Response status: 200 OK
[Filter] Total invoice count set to: X Invoices received: X
[Filter] ✅ Admin Zona: Supplier list is zone-filtered
[Filter] Loaded options - Tokos: 9 Keterangans: 2
[Filter] Toko select populated with 9 options
[Filter] Keterangan select populated with 2 options
[Invoice List] Filtering for admin_zona with zona_id: 1
[AdminZonaFilters] ✅ Year filter shown
[AdminZonaFilters] ✅ Month filter shown
[AdminZonaFilters] ✅ All statistics cards hidden
```

❌ **Unexpected Logs** (would indicate issues):
```
[Filter] Error loading options: ...
[Invoice List] Returned 0 invoices (total: 0) // unless zone has no data
Uncaught TypeError: ...
```

---

## Database Verification Queries

Run these queries to verify data integrity:

### Check zona_toko mapping:
```sql
SELECT COUNT(*) as total_tokos, 
       COUNT(DISTINCT zona_id) as total_zonas
FROM toko;

-- Should return: 143 total_tokos, 17 total_zonas
```

### Check zona_id population in invoices:
```sql
SELECT COUNT(*) as total_invoices,
       COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as invoices_with_zona,
       COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as invoices_without_zona
FROM invoice_file_list;
```

### Check specific zone's stores:
```sql
SELECT nama, kode 
FROM toko 
WHERE zona_id = (SELECT id FROM zonas WHERE kode = 'Zona 01')
ORDER BY nama;

-- Should return: 9 stores for Zona 01
```

### Check invoices by zone:
```sql
SELECT z.kode, COUNT(*) as invoice_count
FROM invoice_file_list i
JOIN zonas z ON i.zona_id = z.id
GROUP BY z.kode
ORDER BY z.kode;

-- Shows distribution of invoices across zones
```

---

## Rollback Plan

If issues are discovered:

1. **If toko mapping is wrong**:
   ```bash
   git revert <commit> # Revert sql/update_zona_toko_mapping.sql
   ```

2. **If API filtering has bugs**:
   ```bash
   git revert <commit> # Revert backend/invoice-endpoints.js changes
   ```

3. **If frontend display is broken**:
   ```bash
   git revert <commit> # Revert js/dashboard.js changes
   ```

---

## Sign-off Checklist

- [ ] All 8 test cases pass
- [ ] Console logs show correct zone filtering
- [ ] Database queries return expected results
- [ ] admin_zona user sees ONLY their zone data
- [ ] Regular users see ALL zone data
- [ ] Statistics are hidden for admin_zona
- [ ] Filters (Year/Month) work correctly
- [ ] No cross-zone data leakage detected
- [ ] Performance is acceptable

---

## Notes

- Each zona has a different number of stores:
  - Zona 01: 9 stores
  - Zona 02: 9 stores
  - Zona 03A: 9 stores
  - Zona 03B: 2 stores
  - ... (see Excel data for complete list)

- Test users should be created with specific zona_id assignments
- Run tests in all modern browsers (Chrome, Firefox, Safari, Edge)
- Test on both desktop and mobile viewports
