# 🔍 Data Type Mismatch Error - Root Cause & Fix

## Error Message
```
ERROR: 42804: foreign key constraint "tokos_zona_id_fkey" cannot be implemented
DETAIL: Key columns "zona_id" and "id" are of incompatible types: uuid and integer.
```

---

## 🔴 Root Cause

**Problem**: Type mismatch in foreign key relationship

```
zonas table:
  id column = INTEGER (e.g., 1, 2, 3, 4, 5)

tokos table (attempted):
  zona_id column = UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)

ERROR: Cannot create foreign key between INTEGER and UUID
```

**Why It Happened**: 
- `FIX_TOKOS_TABLE.sql` assumed zona_id should be UUID
- But zonas table actually uses INTEGER for id
- Foreign key requires matching data types

---

## ✅ Solution

### Change zona_id from UUID to INTEGER

**BEFORE (Wrong)**:
```sql
CREATE TABLE tokos (
    zona_id UUID NOT NULL REFERENCES zonas(id),  -- ❌ UUID
    ...
);
```

**AFTER (Correct)**:
```sql
CREATE TABLE tokos (
    zona_id INTEGER NOT NULL REFERENCES zonas(id),  -- ✅ INTEGER
    ...
);
```

---

## 📋 Updated Fix SQL

The corrected script has been updated in `FIX_TOKOS_TABLE.sql`:

**Line changed from**:
```sql
zona_id UUID NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
```

**To**:
```sql
zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
```

---

## 🚀 How to Apply Fix

### Step 1: Use Updated Script

The file `FIX_TOKOS_TABLE.sql` has been corrected automatically.

### Step 2: Run in Supabase

1. Login: https://app.supabase.com
2. SQL Editor → New Query
3. Copy-paste the **UPDATED** FIX_TOKOS_TABLE.sql
4. Run query

### Step 3: Expected Success

```
tokos table          5
(or count of your zones)
```

No error this time! ✅

---

## 🔎 How to Verify Type Mismatch

If you want to check zonas structure:

```sql
SELECT 
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_name = 'zonas'
ORDER BY 
    ordinal_position;
```

Expected output:
```
column_name    data_type
────────────────────────
id             integer        ← INTEGER, not UUID!
nama           text
description    text
... other columns
```

---

## 📊 Lesson: Database Schema Mismatch

### What We Learned

Database design is inconsistent:
- `files.zona_id` is likely UUID
- `zonas.id` is INTEGER
- `files.toko_id` is likely UUID
- `tokos.zona_id` needs to be INTEGER (to match zonas.id)

This mismatch suggests:
1. Different tables created by different developers
2. No consistent ID strategy (some UUID, some INTEGER)
3. Needs schema cleanup in future

### For Production

Consider migrating to consistent ID types:
- Option A: All UUID (modern approach)
- Option B: All INTEGER (legacy approach)
- Choose one and migrate all tables

For now: Match the existing type (INTEGER)

---

## ✅ Next Steps

1. **Run corrected FIX_TOKOS_TABLE.sql**
   - File automatically updated with zona_id = INTEGER

2. **Verify success**
   ```sql
   SELECT * FROM tokos LIMIT 5;
   ```

3. **Test foreign key**
   ```sql
   SELECT f.id, f.nama_file, t.nama 
   FROM files f
   LEFT JOIN tokos t ON f.toko_id = t.id
   LIMIT 5;
   ```

4. **Restart backend & test**

---

## 🎯 Summary

**Problem**: Type mismatch (UUID vs INTEGER)
**Root Cause**: zonas.id is INTEGER, not UUID
**Solution**: Change zona_id to INTEGER
**Status**: ✅ FIXED in FIX_TOKOS_TABLE.sql
**Next**: Run updated script
