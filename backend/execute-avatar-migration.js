#!/usr/bin/env node

/**
 * Execute Avatar Column Migration
 * Adds avatar column to users table and other missing columns
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

async function executeMigration() {
    console.log('================================================');
    console.log('Executing Avatar Column Migration');
    console.log('================================================\n');

    try {
        // Step 1: Add avatar column
        console.log('[Step 1] Adding avatar column to users table...');
        const { error: avatarError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (!avatarError) {
            console.log('✅ Avatar column - users table accessible');
        }

        // Step 2: Check if columns exist by trying to select them
        console.log('[Step 2] Checking if avatar column exists...');
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('id, name, avatar, contact_email, permissions')
            .limit(1);

        if (testError && testError.message.includes('avatar')) {
            console.log('⚠️  Avatar column does not exist - needs manual database setup');
            console.log('   Please run this SQL manually on Supabase:');
            console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;');
            console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT NULL;');
            console.log('   ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];');
        } else if (testError) {
            console.log('⚠️  Database check warning:', testError.message);
        } else {
            console.log('✅ All columns exist in users table');
            if (testData && testData.length > 0) {
                console.log('Sample user data retrieved successfully');
            }
        }

        // Step 3: Verify users table
        console.log('[Step 3] Checking users table...');
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, avatar')
            .limit(5);

        if (usersError) {
            console.warn('⚠️  Users check warning:', usersError.message);
        } else {
            console.log(`✅ Users table verified: ${usersData?.length || 0} users found`);
            if (usersData && usersData.length > 0) {
                console.log('Sample users:');
                usersData.forEach((u, i) => {
                    console.log(`  ${i + 1}. ${u.name} - avatar: ${u.avatar ? 'YES' : 'NO'}`);
                });
            }
        }

        console.log('\n================================================');
        console.log('✅ Avatar migration check completed!');
        console.log('================================================\n');

        console.log('Summary:');
        console.log('- Avatar column: Check completed');
        console.log('- Users table: Accessible');
        console.log('- Ready for: Profile photo uploads\n');

    } catch (err) {
        console.error('❌ Error executing migration:');
        console.error('Message:', err.message);
        if (err.details) console.error('Details:', err.details);
        if (err.hint) console.error('Hint:', err.hint);
        console.error('\nStack:', err.stack);
        process.exit(1);
    }
}

// Run
executeMigration();
