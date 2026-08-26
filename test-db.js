#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🗄️  Testing Database Connection...\n');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        // Test 1: Get users
        console.log('1️⃣  Fetching users...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, role, is_active')
            .limit(5);
        
        if (usersError) {
            console.error('   Error:', usersError);
        } else {
            console.log(`   Found ${users?.length || 0} users:`);
            users?.forEach(u => {
                console.log(`      - ${u.email} (role: ${u.role}, active: ${u.is_active})`);
            });
        }
        
        // Test 2: Get files
        console.log('\n2️⃣  Fetching files...');
        const { data: files, error: filesError, count } = await supabase
            .from('files')
            .select('id, filename, zona_kode, toko_kode, category', { count: 'exact' })
            .limit(5);
        
        if (filesError) {
            console.error('   Error:', filesError);
        } else {
            console.log(`   Found ${count} files total`);
            if (files && files.length > 0) {
                console.log(`   Showing ${files.length}:`);
                files.forEach(f => {
                    console.log(`      - ${f.filename} (${f.zona_kode}/${f.toko_kode}/${f.category})`);
                });
            } else {
                console.log('   No files in database yet');
            }
        }
        
        // Test 3: Get zonas
        console.log('\n3️⃣  Fetching zonas...');
        const { data: zonas, error: zonasError } = await supabase
            .from('zonas')
            .select('id, kode, nama')
            .limit(10);
        
        if (zonasError) {
            console.error('   Error:', zonasError);
        } else {
            console.log(`   Found ${zonas?.length || 0} zonas:`);
            zonas?.forEach(z => {
                console.log(`      - ${z.kode}: ${z.nama}`);
            });
        }
        
        // Test 4: Try to find a valid credential
        console.log('\n4️⃣  Checking for super_admin users...');
        const { data: admins } = await supabase
            .from('users')
            .select('email')
            .eq('role', 'super_admin')
            .limit(1);
        
        if (admins && admins.length > 0) {
            console.log(`   Super admin: ${admins[0].email}`);
        } else {
            console.log('   No super admin found');
        }
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

main();
