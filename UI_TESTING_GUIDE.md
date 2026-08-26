# UI Improvements - Testing Guide

**Date**: August 23, 2026  
**Test Environment**: Local Development / Browser  
**Target**: Dashboard File List Display

---

## 🧪 Testing Checklist

### ✅ Visual Display Tests

#### [ ] Card Layout
- [ ] Files display as cards (not table rows)
- [ ] Each card has proper spacing between them
- [ ] Cards have rounded corners (2xl)
- [ ] Cards have subtle shadow that increases on hover
- [ ] Border appears on left side for certain statuses

#### [ ] File Information Display
- [ ] File name displays prominently at the top (16px)
- [ ] File name truncates if too long (shows full name on hover)
- [ ] Status badges appear below file name
- [ ] 2x2 information grid displays properly
- [ ] All four boxes (Kategori, Lokasi, Tgl, Diupload) show correctly
- [ ] Sync status badge appears at bottom

#### [ ] Color Coding
- [ ] Normal files: Gray icon, no colored border
- [ ] Unread files: Blue left border + blue icon
- [ ] Anomali files: Red left border + red pulsing badge
- [ ] Read files: Emerald/green icon + green badge
- [ ] Revision files: Amber/yellow badge

#### [ ] Status Badges
- [ ] Badges show with indicator dots (●)
- [ ] "Belum Dibaca" (blue) shows for unread files
- [ ] "Dibaca" (green) shows for read files (admin view)
- [ ] "ANOMALI" (red, pulsing) shows for anomalies
- [ ] "Revisi" (amber) shows for revision-needed files
- [ ] Multiple badges can appear on same file

---

### ✅ Functional Tests

#### [ ] Checkbox Selection
- [ ] Individual file checkboxes work
- [ ] Select-all checkbox selects all visible files
- [ ] Deselect-all unchecks everything
- [ ] Selected cards can be toggled
- [ ] Bulk operations work with selected cards

#### [ ] Action Menu
- [ ] Menu appears on hover of three-dot button
- [ ] Menu items are visible and readable
- [ ] "Preview" button works for files
- [ ] "Download" button downloads file
- [ ] "Ajukan Revisi" appears only for admin_zona with INVOICE
- [ ] "Salin Link" appears only for super_admin
- [ ] "Hapus" button works for file deletion
- [ ] "Pulihkan" button appears in trash view
- [ ] "Hapus Permanen" works in trash view

#### [ ] Filtering & Search
- [ ] Category filter works
- [ ] Type PPN filter works
- [ ] Zona filter works
- [ ] Toko/Merchant filter works
- [ ] Date range filters work
- [ ] Search box filters by filename/invoice/toko
- [ ] Reset filters clears all selections

#### [ ] Sorting & Loading
- [ ] Files load correctly
- [ ] Infinite scroll loads more files
- [ ] Files display with animation (fade-in)
- [ ] Each file has staggered animation

---

### ✅ Responsive Tests

#### [ ] Mobile (< 768px)
- [ ] Cards stack vertically (100% width)
- [ ] Proper padding on edges (px-1)
- [ ] File name readable on small screen
- [ ] Information grid adapts to mobile
- [ ] Action menu opens and closes properly
- [ ] Touch targets are large enough (44px+ recommended)
- [ ] No horizontal scrolling

#### [ ] Tablet (768px - 1023px)
- [ ] Cards fit properly with padding
- [ ] Information grid displays well
- [ ] Action menu accessible
- [ ] All text readable

#### [ ] Desktop (1024px+)
- [ ] Cards display at full width with padding
- [ ] Information grid shows all 4 boxes clearly
- [ ] Sync badge visible
- [ ] Action menu appears on hover

---

### ✅ Accessibility Tests

#### [ ] Keyboard Navigation
- [ ] Tab key navigates through checkboxes
- [ ] Tab key navigates through action buttons
- [ ] Enter/Space activates checkboxes
- [ ] Enter activates action menu buttons
- [ ] Escape closes open menus

#### [ ] Screen Reader
- [ ] File name is readable
- [ ] Status badges are announced
- [ ] Card structure is logical
- [ ] Buttons have proper labels
- [ ] Form fields have associated labels
- [ ] Color is not the only indicator of status

#### [ ] Color Contrast
- [ ] All text has sufficient contrast (WCAG AA)
- [ ] Badge text is readable
- [ ] Icons are distinguishable
- [ ] Border colors have sufficient contrast

---

### ✅ Browser Compatibility

#### [ ] Chrome/Edge (Latest)
- [ ] Layout displays correctly
- [ ] Animations smooth
- [ ] Colors render properly
- [ ] Responsive breakpoints work

#### [ ] Firefox (Latest)
- [ ] Layout displays correctly
- [ ] No layout shifts
- [ ] Hover effects work

#### [ ] Safari (Latest)
- [ ] Layout displays correctly
- [ ] Rounded corners render
- [ ] Shadows display properly

#### [ ] Mobile Browsers
- [ ] iOS Safari: Cards display properly
- [ ] Android Chrome: Responsive layout works

---

### ✅ Performance Tests

#### [ ] Loading
- [ ] Page loads quickly
- [ ] No layout shift when cards load
- [ ] Smooth animation (no stuttering)
- [ ] Animations don't impact scrolling performance

#### [ ] Interaction
- [ ] Checkbox selection is instant
- [ ] Menu appears instantly on hover
- [ ] Filtering is responsive
- [ ] No lag when scrolling

#### [ ] Memory
- [ ] Large lists don't consume excessive memory
- [ ] No memory leaks on page navigation
- [ ] Smooth performance with 1000+ items

---

## 🧩 Specific Test Cases

### Test Case 1: Normal File Display
**Given**: User viewing dashboard with 5-10 normal files  
**When**: Dashboard loads  
**Then**:
- [ ] All files display as cards
- [ ] Cards have consistent spacing (16px between)
- [ ] File names visible and readable
- [ ] No status badges visible (normal files)
- [ ] Gray icons with white documents
- [ ] Info grid shows correct metadata
- [ ] All information is readable

### Test Case 2: Mixed Status Files
**Given**: Dashboard with unread, read, anomali, and revision files  
**When**: User scrolls through list  
**Then**:
- [ ] Unread files have blue border + blue badge
- [ ] Read files have green badge (admin view)
- [ ] Anomali files have red border + pulsing red badge
- [ ] Revision files have amber badge
- [ ] Colors are clearly distinguishable
- [ ] Pulsing animation draws attention to anomalies

### Test Case 3: Info Grid Content
**Given**: Card with complete metadata  
**When**: User views card  
**Then**:
- [ ] Kategori box shows category + type
- [ ] Lokasi box shows zona + toko name
- [ ] Tgl. Dokumen shows document date (correct format)
- [ ] Diupload shows upload date (correct format)
- [ ] All boxes have light gray background
- [ ] Labels are uppercase and bold
- [ ] Values are clearly readable

### Test Case 4: Action Menu
**Given**: User hovering over card  
**When**: User clicks three-dot menu  
**Then**:
- [ ] Menu appears with smooth transition
- [ ] Menu items are visible and accessible
- [ ] Menu positions correctly (not cut off)
- [ ] Menu closes when clicking elsewhere
- [ ] Correct items appear for user role

### Test Case 5: Mobile Responsiveness
**Given**: User on mobile device (375px width)  
**When**: Dashboard loads  
**Then**:
- [ ] Cards display vertically
- [ ] Full width with padding on edges
- [ ] File name readable on small screen
- [ ] Info grid adapts to mobile layout
- [ ] Action menu accessible on touch
- [ ] No horizontal scrolling

### Test Case 6: Filtering
**Given**: Dashboard with category/type/zona/toko filters  
**When**: User applies filters  
**Then**:
- [ ] Only matching files display
- [ ] Cards update immediately
- [ ] Cards animate in (fade-in)
- [ ] Count updates correctly
- [ ] Reset button clears all filters

---

## 🔍 Visual Regression Tests

### Before/After Comparison

**Test**: Screenshot comparison of file list

1. **Setup**:
   - Take screenshot of old layout (if available)
   - Take screenshot of new layout
   - Compare side-by-side

2. **Verify**:
   - [ ] Cards are more spacious than rows
   - [ ] Text is larger and more readable
   - [ ] Status colors are more prominent
   - [ ] Info grid is clearly organized
   - [ ] Overall appearance is modern

---

## ⚠️ Edge Cases

### [ ] Empty State
- [ ] Message displays properly when no files
- [ ] No broken layout
- [ ] Action buttons hidden/disabled

### [ ] Single File
- [ ] Card displays properly
- [ ] No layout issues

### [ ] Very Long File Names
- [ ] File name truncates (shows "..." at end)
- [ ] Tooltip shows full name on hover
- [ ] Card layout remains intact

### [ ] Special Characters in File Names
- [ ] Accented characters display correctly
- [ ] Unicode characters render properly
- [ ] Special symbols don't break layout

### [ ] Very Long Shop Names
- [ ] Toko name truncates if needed
- [ ] Zona name displays properly
- [ ] Grid layout doesn't break

### [ ] Many Status Badges
- [ ] Multiple badges display side-by-side
- [ ] Badges don't overlap
- [ ] All badges readable

### [ ] Very Old/New Dates
- [ ] Dates format correctly
- [ ] No layout issues with date display

---

## 📊 Test Results Template

```
TEST ENVIRONMENT:
- Browser: [Chrome/Firefox/Safari/Mobile]
- Version: [Version number]
- Device: [Desktop/Tablet/Mobile]
- Resolution: [Width x Height]
- Date: [Test date]

OVERALL RESULT: ✅ PASS / ❌ FAIL

PASSED TESTS:
- [Test 1]
- [Test 2]
- [Test 3]

FAILED TESTS:
- [Test name]: [Issue description]
- [Test name]: [Issue description]

ISSUES FOUND:
1. [Issue title]
   Severity: [Critical/High/Medium/Low]
   Description: [Details]
   Steps to reproduce: [Steps]
   Expected: [What should happen]
   Actual: [What happened]

2. [Issue title]
   ...

NOTES:
[Additional observations or comments]

TESTED BY: [Tester name]
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All visual tests pass
- [ ] All functional tests pass
- [ ] All responsive tests pass
- [ ] All accessibility tests pass
- [ ] All browser compatibility tests pass
- [ ] No performance issues detected
- [ ] No visual regressions found
- [ ] All edge cases handled
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Rollback plan prepared (if needed)

---

## 📞 Issues & Support

### If You Find Issues:

1. **Document the issue**:
   - Take screenshot/video
   - Note browser and device
   - Describe steps to reproduce
   - Note expected vs actual behavior

2. **Report the issue**:
   - Create issue with template above
   - Attach screenshots/videos
   - Include browser info
   - Mark severity level

3. **Priority Levels**:
   - **Critical**: Feature doesn't work / blocks usage
   - **High**: Visual/functional issue in main flow
   - **Medium**: Non-critical issue / workaround exists
   - **Low**: Minor visual issue / no user impact

---

## ✅ Sign-Off

Testing completed and verified by: _________________

Date: ________________

Status: ✅ Ready for Deployment

---

**Document Version**: 1.0  
**Last Updated**: August 23, 2026  
**Status**: Ready for Testing  

