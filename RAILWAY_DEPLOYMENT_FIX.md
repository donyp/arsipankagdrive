# Railway Deployment Fixes ✅

## Errors Found
1. **404 Error**: `js/api.js` not found
2. **MIME Type Error**: Server returning HTML instead of JS
3. **ReferenceError**: `API is not defined`
4. **Syntax Error**: `currentPage has already been declared`
5. **ReferenceError**: `getToken is not defined`

## Root Causes & Fixes

### 1. Missing `js/api.js`
**Problem**: 
- `dashboard.html` was trying to load `js/api.js` which doesn't exist
- The API wrapper is actually in `js/supabase.js`

**Solution** (dashboard.html):
```javascript
<!-- BEFORE -->
<script src="js/api.js"></script>

<!-- AFTER -->
<script src="js/config.js"></script>
<script src="js/supabase.js"></script>
<script src="js/auth.js"></script>
<script src="js/utils.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/invoice-list.js"></script>
```

**Why**: 
- `config.js` must load first (contains CONFIG object)
- `supabase.js` defines the global `API` object
- `utils.js` provides Toast and other utilities
- Proper order prevents undefined reference errors

### 2. Duplicate `currentPage` Variable
**Problem**:
- `js/dashboard.js` declares: `let currentPage = 1;`
- `js/invoice-list.js` also declares: `let currentPage = 0;`
- When both files load in dashboard, duplicate variable error

**Solution** (js/invoice-list.js):
- Renamed all references from `currentPage` → `invoiceCurrentPage`
- Affects lines: 6, 176, 183, 188, 200, 207, 216

**Why**: 
- Prevents global namespace collision
- Each module can manage its own pagination state
- No side effects on old dashboard code

### 3. Undefined `getToken()` Function
**Problem**:
- `js/invoice-list.js` called `getToken()` directly
- Should be called as `API.getToken()` (from supabase.js)
- Function doesn't exist without API object

**Solution** (js/invoice-list.js):
```javascript
// BEFORE
'Authorization': `Bearer ${getToken()}`

// AFTER
'Authorization': `Bearer ${API.getToken()}`
```

**Locations Fixed**:
- Line 80: loadStats()
- Line 110: loadInvoiceList()
- Line 269: uploadPDF()
- Line 365: uploadBulkPDFs()

### 4. Missing DOM Check in init()
**Problem**:
- `invoice-list.js` tried to call `init()` with `isAuthenticated()` check
- Function `isAuthenticated()` doesn't exist
- When embedded in dashboard, redirect logic could fail

**Solution** (js/invoice-list.js):
```javascript
// BEFORE
if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
}

// AFTER
if (!tableBody || !btnApplyFilter) {
    console.warn('[Invoice List] DOM elements not found, skipping init');
    return;
}
```

**Why**:
- When embedded, elements might not be immediately available
- Gracefully handles partial initialization
- No redirect when embedded in dashboard

---

## Files Modified

### 1. `dashboard.html`
- Fixed script loading order
- Added missing config.js and utils.js
- Changed api.js → supabase.js
- Commit: d577690

### 2. `js/invoice-list.js`
- Renamed `currentPage` → `invoiceCurrentPage` (6 occurrences)
- Changed `getToken()` → `API.getToken()` (4 occurrences)
- Fixed init() authentication check
- Commit: d577690

### 3. `sql/add_invoice_file_list.sql`
- Added DROP TRIGGER IF EXISTS before CREATE TRIGGER
- Prevents duplicate trigger error on re-run
- Commit: 56c2f4f

### 4. `js/dashboard.js`
- Disabled old event listeners (setupEventListeners)
- Disabled old intersection observer
- Disabled auto-reload on window focus
- Commit: 56c2f4f

---

## Deployment Checklist

### Before Restart
- [ ] All commits pushed to GitHub
- [ ] Database migration ready (sql/add_invoice_file_list.sql)

### Railway Deploy Steps
1. **Ensure Database Migration**:
   ```bash
   # Run this in Railway PostgreSQL console or via backend
   node backend/execute-schema.js sql/add_invoice_file_list.sql
   ```

2. **Rebuild on Railway**:
   - Push changes to GitHub
   - Railway auto-detects and rebuilds
   - Monitor deployment logs

3. **Verify in Browser**:
   - Open dashboard
   - Check console for errors
   - Welcome card should appear
   - Invoice list should load below

### Expected Behavior
✅ Dashboard loads without errors
✅ Welcome card displays
✅ Invoice list loads (shows stats)
✅ Filters work
✅ PDF upload available
✅ Pagination works

### If Still Errors

**If "API is not defined" still appears**:
- Clear browser cache: Ctrl+Shift+Del
- Verify script loading order in DevTools Network tab
- Check that supabase.js loads before auth.js

**If Invoice list doesn't load**:
- Check /api/invoice/stats response (DevTools Network)
- Verify backend invoice endpoints registered
- Check database tables exist

**If "Cannot find module 'uuid'" on Railway**:
- Trigger rebuild: Push a new commit or use Railway dashboard
- Check npm install ran (check node_modules)

---

## Git Log
```
d577690 fix: Fix missing api.js references, duplicate currentPage declaration, and undefined getToken() calls
56c2f4f fix: Disable old archive event listeners from dashboard, fix invoice SQL trigger conflict
9304c0e refactor: Minimize dashboard - clean welcome card only, move all menus to sidebar, embed invoice-list.html as homepage content
```

---

**Status**: ✅ Fixed and Pushed to GitHub
**Ready for**: Railway Deployment & Testing
**Date**: September 1, 2026
