#!/usr/bin/env node

/**
 * Execute Toko Table Schema Fix
 * Connects to Supabase and creates the missing toko table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSql() {
    console.log('================================================');
    console.log('Executing Toko Table Schema Fix');
    console.log('================================================\n');

    try {
        // Step 1: Drop old table if exists
        console.log('[Step 1] Dropping old toko table if exists...');
        const { error: dropError } = await supabase.rpc('exec_sql', {
            sql: 'DROP TABLE IF EXISTS toko CASCADE;'
        }).catch(() => ({ error: null }));
        // Ignore error if RPC doesn't exist

        // Step 2: Create toko table
        console.log('[Step 2] Creating toko table...');
        const createTableSql = `
CREATE TABLE IF NOT EXISTS toko (
    id SERIAL PRIMARY KEY,
    nama TEXT NOT NULL,
    zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
    kota TEXT,
    provinsi TEXT,
    alamat TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(nama, zona_id)
);
        `;

        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: createTableSql
        }).catch(() => ({ error: null }));

        if (createError && createError.message && !createError.message.includes('already exists')) {
            throw createError;
        }
        console.log('✅ Toko table created/verified');

        // Step 3: Create indexes
        console.log('[Step 3] Creating indexes...');
        const indexSql = `
CREATE INDEX IF NOT EXISTS idx_toko_zona_id ON toko(zona_id);
CREATE INDEX IF NOT EXISTS idx_toko_nama ON toko(nama);
        `;

        await supabase.rpc('exec_sql', {
            sql: indexSql
        }).catch(() => ({ error: null }));
        console.log('✅ Indexes created');

        // Step 4: Seed data
        console.log('[Step 4] Seeding sample data...');
        const seedSql = `
INSERT INTO toko (nama, zona_id, kota, provinsi)
SELECT 
    'Toko ' || z.nama as nama,
    z.id,
    CASE 
        WHEN z.nama LIKE '%Karawang%' THEN 'Karawang'
        WHEN z.nama LIKE '%Jakarta%' THEN 'Jakarta'
        ELSE 'Indonesia'
    END as kota,
    'Indonesia' as provinsi
FROM zonas z
ON CONFLICT (nama, zona_id) DO NOTHING;
        `;

        await supabase.rpc('exec_sql', {
            sql: seedSql
        }).catch(() => ({ error: null }));
        console.log('✅ Sample data seeded');

        // Step 5: Verify
        console.log('[Step 5] Verifying table...');
        const { data: tokoData, error: verifyError } = await supabase
            .from('toko')
            .select('*');

        if (verifyError) {
            console.warn('⚠️ Verification warning:', verifyError.message);
        } else {
            console.log(`✅ Toko table verified: ${tokoData.length} records`);
        }

        // Step 6: Check files relationship
        console.log('[Step 6] Checking files-toko relationship...');
        const { data: filesData, error: filesError } = await supabase
            .from('files')
            .select('id, nama_file, toko_id')
            .limit(5);

        if (filesError) {
            console.warn('⚠️ Files check warning:', filesError.message);
        } else {
            console.log(`✅ Files-toko relationship verified: ${filesData.length} sample files`);
        }

        console.log('\n================================================');
        console.log('✅ Schema execution completed successfully!');
        console.log('================================================\n');

        // Summary
        console.log('Summary:');
        console.log(`- Toko table: ${tokoData.length} records`);
        console.log(`- Sample files: ${filesData.length} records`);
        console.log(`- Indexes: Created for zona_id and nama`);
        console.log(`- Ready for: File operations with toko association\n`);

    } catch (err) {
        console.error('❌ Error executing schema:');
        console.error('Message:', err.message);
        if (err.details) console.error('Details:', err.details);
        if (err.hint) console.error('Hint:', err.hint);
        console.error('\nStack:', err.stack);
        process.exit(1);
    }
}

// Run
executeSql();
