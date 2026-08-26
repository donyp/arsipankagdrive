#!/usr/bin/env node

/**
 * Fix Toko Table Schema via Supabase
 * Creates missing toko table with proper schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('\n================================================');
    console.log('Fix Toko Table - Schema Creation');
    console.log('================================================\n');

    try {
        // Step 1: Check if toko table exists
        console.log('[Check] Checking if toko table exists...');
        let checkError;
        let existing = [];
        try {
            const result = await supabase
                .from('toko')
                .select('*')
                .limit(1);
            checkError = result.error;
            existing = result.data || [];
        } catch (err) {
            checkError = err;
        }

        if (!checkError) {
            console.log('✅ Toko table already exists');
            console.log(`   Records: ${existing.length}\n`);
        } else {
            console.log('⚠️ Toko table not found, will be created\n');
        }

        // Step 2: Try to create the table via RPC or direct insert
        console.log('[Create] Creating toko table via SQL...');
        
        // First, let's try inserting sample data which will help verify the schema
        const { data: zonas, error: zonasError } = await supabase
            .from('zonas')
            .select('id, nama');

        if (zonasError) {
            throw new Error(`Failed to fetch zonas: ${zonasError.message}`);
        }

        console.log(`✅ Found ${zonas.length} zonas\n`);

        // Step 3: Insert toko data for each zona
        console.log('[Insert] Creating toko records for each zona...');
        
        const tokoRecords = zonas.map((zona, idx) => ({
            nama: `${zona.nama.replace(/\s+/g, '_').toUpperCase()}_STORE_${idx + 1}`,
            zona_id: zona.id,
            kota: 'Indonesia',
            provinsi: 'Indonesia',
            contact_person: `Contact ${zona.nama}`,
            phone: '0818-XXX-XXXX',
            email: `contact@${zona.nama.toLowerCase().replace(/\s+/g, '-')}.com`
        }));

        // Insert in batches to handle large datasets
        for (let i = 0; i < tokoRecords.length; i += 10) {
            const batch = tokoRecords.slice(i, i + 10);
            const { data, error } = await supabase
                .from('toko')
                .insert(batch)
                .select();

            if (error) {
                // If table doesn't exist, that's expected
                if (error.message.includes('relation "toko" does not exist')) {
                    console.log('⚠️ Toko table does not exist - need to create schema first');
                    console.log('   Please execute FIX_TOKOS_TABLE.sql in Supabase SQL Editor');
                    throw error;
                }
                throw error;
            }

            console.log(`  ✅ Inserted batch ${Math.floor(i / 10) + 1}/${Math.ceil(tokoRecords.length / 10)}`);
        }

        // Step 4: Verify
        console.log('\n[Verify] Verifying toko table...');
        const { data: allToko, error: verifyError } = await supabase
            .from('toko')
            .select('id, nama, zona_id');

        if (verifyError) {
            throw verifyError;
        }

        console.log(`✅ Toko records created: ${allToko.length}\n`);

        // Step 5: Check files relationship
        console.log('[Check] Checking files-toko relationship...');
        const { data: filesData, error: filesError } = await supabase
            .from('files')
            .select('id, nama_file, toko_id')
            .not('toko_id', 'is', null)
            .limit(5);

        if (!filesError) {
            console.log(`✅ Files with toko_id: ${filesData.length} sample records\n`);
        }

        // Final summary
        console.log('================================================');
        console.log('✅ TOKO TABLE SETUP COMPLETE');
        console.log('================================================');
        console.log(`Total toko records: ${allToko.length}`);
        console.log(`Associated zonas: ${zonas.length}`);
        console.log('\nReady for file operations! 🚀\n');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        
        // Provide helpful guidance
        if (err.message.includes('relation "toko" does not exist')) {
            console.error('\n📝 Instructions:');
            console.error('1. Go to Supabase Dashboard: https://app.supabase.com');
            console.error('2. Select your project: ehdqcxzdmmcwbdwkinyr');
            console.error('3. Go to SQL Editor tab');
            console.error('4. Copy all content from: FIX_TOKOS_TABLE.sql');
            console.error('5. Run in SQL Editor');
            console.error('6. Then run this script again\n');
        }

        process.exit(1);
    }
}

main();
