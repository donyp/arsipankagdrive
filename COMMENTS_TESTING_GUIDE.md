# Comments Feature - Testing & Verification Guide

**Status**: ✅ Fixed & Ready for Testing  
**Date**: 2026-08-28  

---

## 🔧 Fixes Applied

### 1. **API Response Format Handling** ✅
- **Issue**: `file-detail.html` was not properly handling the `/api/files` endpoint response format
- **Fix**: Updated `loadFileDetails()` to correctly parse `response.files` (the actual response format from backend)
- **Location**: `file-detail.html` line 387-407

### 2. **Global currentUser Variable** ✅
- **Issue**: `currentUser` was not defined, causing issues when checking comment edit/delete permissions
- **Fix**: Added `let currentUser = null;` declaration and properly assigned it from `initAuth()`
- **Location**: `file-detail.html` lines 356, 378

### 3. **API PATCH Method** ✅
- **Issue**: `API.patch()` method didn't exist in the API helper
- **Fix**: Added PATCH method to `API` object in `js/supabase.js`
- **Location**: `js/supabase.js` lines 123-130

### 4. **Toast Helper** ✅
- **Issue**: Toast notifications might fail if `utils.js` doesn't load
- **Fix**: Added built-in Toast helper with Swal.fire fallback
- **Location**: `file-detail.html` lines 318-340

### 5. **Swal2 Library** ✅
- **Issue**: SweetAlert2 library not included
- **Fix**: Added CDN link for SweetAlert2
- **Location**: `file-detail.html` line 9

---

## 📋 Testing Checklist

### **Pre-Testing Setup**
- [ ] Server is running on port 5000: `node backend/server.js`
- [ ] Database is accessible and has test files
- [ ] User is logged in with valid JWT token
- [ ] Browser DevTools console is open (F12)

### **Test 1: File Detail Page Loading**

**Steps:**
1. Login to dashboard at `http://localhost:5000/dashboard.html`
2. Scroll to any file with a 💬 comment icon
3. Click the 💬 icon
4. Verify page loads with file information

**Expected Results:**
- File detail page loads (no redirect to login)
- File header displays with title and category
- File info grid shows: Invoice No, Nominal, Category, Upload date, etc.
- Comments panel displays with counter
- No errors in browser console

**Console Checks:**
```javascript
// Should see in console:
[loadFileDetails] API Response: {...}
[loadFileDetails] Found XXX files, looking for: [fileId]
[loadFileDetails] Found file: [filename]
```

---

### **Test 2: Add Comment**

**Steps:**
1. From file detail page, find the comment textarea
2. Type: "Contoh komentar dari testing"
3. Click "Kirim" button
4. Wait for success toast

**Expected Results:**
- Comment appears immediately in the list
- Comment counter increments by 1
- Toast shows "Komentar ditambahkan"
- No errors in console

**Check Comment Data:**
```javascript
// Comment should display:
- User name (from users table)
- Relative time (e.g., "Baru saja", "5m lalu")
- Comment text
- Edit/Delete buttons (for own comments)
```

---

### **Test 3: Edit Comment**

**Steps:**
1. Click "Edit" button on your own comment
2. Modify the text in the prompt dialog
3. Click OK

**Expected Results:**
- Comment text updates immediately
- `updated_at` timestamp changes
- Toast shows "Komentar diperbarui"
- No console errors

**API Check:**
```
PATCH /api/files/{fileId}/comments/{commentId}
```

---

### **Test 4: Delete Comment**

**Steps:**
1. Click "Hapus" (Delete) button on your own comment
2. Confirm deletion in the popup
3. Verify comment is removed

**Expected Results:**
- Comment disappears from list
- Comment counter decreases by 1
- Toast shows "Komentar dihapus"
- No console errors

---

### **Test 5: Mark as Resolved**

**Steps:**
1. Add a new comment with text "Resolved Test"
2. Click "Tandai Selesai" button
3. Verify visual change

**Expected Results:**
- Comment background changes to light green (#d1fae5)
- Badge "✓ Selesai" appears
- Edit/Delete buttons remain functional
- `resolved_at` is populated in database

---

### **Test 6: Multiple Users (Permissions)**

**Steps (with 2 browser windows):**
1. Window A: Login as User1, open file detail
2. Window B: Login as different User2, open same file detail
3. Window A: Add comment as User1
4. Window B: Verify you can see User1's comment
5. Window B: Try to edit User1's comment (should not show Edit button)
6. Window A: Try to delete Window B's comment (should not work)

**Expected Results:**
- Users see all comments
- Users can only Edit/Delete their own comments
- Admin users can edit/delete any comment
- All comments show correct user attribution

---

### **Test 7: @Mention Functionality**

**Steps:**
1. Add comment with text: "Testing @username mention"
2. Verify mention extraction

**Expected Results:**
- Comment is created successfully
- Mentions are parsed and stored
- Comment displays without errors

**Check Backend:**
```sql
-- Verify mentions are stored
SELECT mentions FROM file_comments WHERE id = '{commentId}';
```

---

### **Test 8: Responsive Design**

**Steps:**
1. Open file detail on mobile (375px width)
2. Verify layout doesn't break
3. Comments panel is readable
4. Buttons are clickable

**Expected Results:**
- Layout adapts to screen size
- No horizontal scroll needed
- Comments readable on mobile
- Buttons have adequate touch target size

---

### **Test 9: Error Handling**

**Steps - Network Error Simulation:**
1. Open DevTools Network tab
2. Throttle to "Offline"
3. Try to add comment
4. Restore network

**Expected Results:**
- Error toast appears
- User can retry when network is restored
- Page doesn't crash

---

### **Test 10: API Response Validation**

**Browser Console Tests:**

```javascript
// Test 1: Check file loading
const fileId = new URLSearchParams(window.location.search).get('id');
console.log('Current File:', currentFile);
console.log('File ID:', fileId);

// Test 2: Check comments
console.log('Comments:', comments);
console.log('Comment Count:', comments.length);

// Test 3: Check current user
console.log('Current User:', currentUser);
console.log('User ID:', currentUser?.id);
console.log('User Role:', currentUser?.role);
```

---

## 🐛 Troubleshooting

### **Issue: "File tidak ditemukan"**

**Causes:**
1. File ID is invalid
2. API returned 0 files
3. File doesn't exist in database

**Debug:**
```javascript
// Check URL parameter
const params = new URLSearchParams(window.location.search);
console.log('File ID from URL:', params.get('id'));

// Check API response
await API.get('/api/files?limit=10&page=1')
  .then(r => console.log('Files found:', r.files?.length))
```

**Solution:**
- Verify file exists in dashboard first
- Check file ID is valid UUID format
- Check Supabase connection is active

---

### **Issue: Comments not loading**

**Causes:**
1. API endpoint not responding
2. currentFileId is null
3. Backend error

**Debug:**
```javascript
console.log('Current File ID:', currentFileId);
console.log('Comments Response:', await API.get(`/api/files/${currentFileId}/comments`));
```

**Solution:**
- Verify `/api/files/:fileId/comments` endpoint is registered in backend
- Check server logs for errors
- Verify JWT token is valid

---

### **Issue: "Cannot read property 'user_id' of undefined"**

**Cause**: currentUser is not properly initialized

**Solution:**
```javascript
// Verify in page load:
console.log('CurrentUser:', currentUser);
console.log('Auth initialized:', !!currentUser?.id);
```

---

## 📊 Database Verification

After running tests, verify database records:

```sql
-- Check comments exist
SELECT id, file_id, user_id, comment, created_at, resolved_at 
FROM file_comments 
ORDER BY created_at DESC 
LIMIT 10;

-- Check resolved comments
SELECT * FROM file_comments 
WHERE resolved_at IS NOT NULL 
LIMIT 5;

-- Check mentions
SELECT id, mentions 
FROM file_comments 
WHERE mentions IS NOT NULL AND array_length(mentions, 1) > 0;
```

---

## ✅ Sign-Off Checklist

- [ ] All 10 tests passed
- [ ] No console errors
- [ ] Database has test comments
- [ ] Permissions working correctly
- [ ] Mobile responsive
- [ ] Error handling works
- [ ] Toast notifications display
- [ ] File download button works (bonus)

---

## 🚀 Next Steps

1. **After Testing:**
   - Document any additional issues found
   - Make fixes if needed
   - Rerun affected tests

2. **Before Production:**
   - Run full test suite with actual data
   - Test with multiple users concurrently
   - Verify performance with large comment volumes
   - Set up monitoring for API endpoints

3. **Future Improvements:**
   - Real-time comment updates via WebSocket
   - Email notifications for mentions
   - Comment reactions (👍 ❤️)
   - Rich text editor
   - Nested comments/threads

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review browser console for error messages
3. Check server logs: `tail -f backend.log`
4. Verify API endpoint responses using Postman
5. Check database records directly in Supabase

---

**Testing Status**: 🟢 Ready to Test  
**Last Updated**: 2026-08-28 by Kiro Agent

