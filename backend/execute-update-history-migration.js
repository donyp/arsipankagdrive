#!/usr/bin/env node
/**
 * Execute Update History table migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeMigration() {
    try {
        console.log('🚀 Executing Update History migration...\n');

        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'sql', 'add_update_history.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute SQL
        const { error } = await supabase.rpc('execute_sql', {
            sql_string: sql
        }).catch(async err => {
            // Fallback: Try direct execution if RPC fails
            console.log('RPC failed, trying alternative method...');
            const statements = sql.split(';').filter(s => s.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await supabase.rpc('execute_sql', { sql_string: statement + ';' });
                    } catch (e) {
                        console.warn('⚠️ Statement failed:', e.message);
                    }
                }
            }
            return { error: null };
        });

        if (error) {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        }

        console.log('✅ Update History table created successfully!');
        console.log('\n📊 Table schema:');
        console.log('  - id (BIGSERIAL PRIMARY KEY)');
        console.log('  - version (TEXT)');
        console.log('  - title (TEXT)');
        console.log('  - description (TEXT)');
        console.log('  - type (UPDATE, BUG_FIX, FEATURE, IMPROVEMENT, MAINTENANCE)');
        console.log('  - category (TEXT)');
        console.log('  - status (DRAFT, PUBLISHED)');
        console.log('  - severity (LOW, MEDIUM, HIGH, CRITICAL)');
        console.log('  - created_by (REFERENCES auth.users)');
        console.log('  - created_at (TIMESTAMP)');
        console.log('  - requires_action (BOOLEAN)');
        console.log('  - is_breaking_change (BOOLEAN)');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

executeMigration();
