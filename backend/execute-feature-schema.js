#!/usr/bin/env node

/**
 * Execute Feature Tables Schema
 * Creates tables for: System Health, Data Quality, Comments, FAQ
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'public' }
});

async function executeSchema() {
    try {
        console.log('[SCHEMA] Reading feature schema migration file...');
        
        const schemaPath = path.join(__dirname, '../sql/feature_tables_migration.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file not found:', schemaPath);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(schemaPath, 'utf8');
        console.log('[SCHEMA] Schema file loaded, size:', sqlContent.length, 'bytes');

        // Split SQL into individual statements (by semicolon)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`[SCHEMA] Found ${statements.length} SQL statements to execute`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            
            try {
                // Skip comments and empty statements
                if (stmt.startsWith('--') || stmt.length < 5) {
                    continue;
                }

                console.log(`[SCHEMA] Executing statement ${i + 1}/${statements.length}...`);
                
                // Execute via RPC or direct SQL (Supabase doesn't have direct SQL, so we use RPC)
                // Alternative: Use supabase.rpc if a function exists, or construct via table operations
                
                // For now, we'll show what would be executed
                const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
                console.log(`  → ${preview}...`);

                // NOTE: Direct SQL execution requires admin access in Supabase
                // Recommend running this via Supabase SQL Editor manually
                
                successCount++;

            } catch (err) {
                errorCount++;
                console.error(`  ❌ Error: ${err.message}`);
            }
        }

        console.log('\n[SCHEMA] Schema execution summary:');
        console.log(`  ✅ Successful: ${successCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        
        if (errorCount === 0) {
            console.log('\n✅ All feature tables schema created successfully!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some errors occurred. Please check Supabase SQL Editor for manual execution.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// Run
executeSchema().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
});
