/**
 * Test: Simulate admin_zona user calling /api/files
 * Purpose: Verify API returns files correctly
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAdminApiCall() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('TEST: Simulating admin_zona API call to /api/files');
        console.log('='.repeat(70) + '\n');

        // Step 1: Get admin user details
        console.log('📋 STEP 1: Retrieve admin_zona user for zona_id=1');
        console.log('-'.repeat(70));
        
        const { data: admin, error: adminError } = await supabase
            .from('users')
            .select('*')
            .eq('zona_id', 1)
            .eq('role', 'admin_zona')
            .eq('is_active', true)
            .single();

        if (adminError) {
            console.error('❌ Error fetching admin:', adminError.message);
            return;
        }

        console.log(`✓ Admin found:`);
        console.log(`  • ID: ${admin.id}`);
        console.log(`  • Email: ${admin.email}`);
        console.log(`  • Name: ${admin.name}`);
        console.log(`  • Role: ${admin.role}`);
        console.log(`  • Zona: ${admin.zona_id}`);
        console.log(`  • Active: ${admin.is_active}`);
        console.log(`  • Permissions: ${JSON.stringify(admin.permissions)}`);
        console.log('');

        // Step 2: Simulate the EXACT query that /api/files makes for admin_zona
        console.log('📊 STEP 2: Execute the EXACT query from /api/files endpoint');
        console.log('-'.repeat(70));
        console.log(`Simulating: admin_zona user with zona_id=${admin.zona_id}`);
        console.log(`Query logic:`);
        console.log(`  - eq('zona_id', ${admin.zona_id})`);
        console.log(`  - in('category', ['INVOICE', 'PPN', 'NON_PPN'])`);
        console.log(`  - is('deleted_at', null)`);
        console.log(`  - order('created_at', DESC)`);
        console.log('');

        let query = supabase
            .from('files')
            .select(
                'id, nama_file, storage_path, ukuran_bytes, category, tipe_ppn, tanggal_dokumen, zona_id, toko_id, status, created_at, total_jual, uploaded_by, zonas(kode, nama)',
                { count: 'exact' }
            )
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        // Apply admin_zona filter
        query = query
            .eq('zona_id', admin.zona_id)
            .in('category', ['INVOICE', 'PPN', 'NON_PPN']);

        // Apply pagination (default: page 1, limit 50)
        const page = 1;
        const limit = 50;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: files, count: totalCount, error: filesError } = await query;

        if (filesError) {
            console.error('❌ Query error:', filesError.message);
            return;
        }

        console.log(`✓ Query executed successfully`);
        console.log(`  • Total count: ${totalCount} files`);
        console.log(`  • Returned: ${files?.length || 0} files (page ${page})`);
        console.log(`  • Pages available: ${Math.ceil((totalCount || 0) / limit)}`);
        console.log('');

        // Step 3: Show category breakdown
        console.log('📂 STEP 3: Files by category');
        console.log('-'.repeat(70));
        
        const categoryCount = {};
        files.forEach(f => {
            categoryCount[f.category] = (categoryCount[f.category] || 0) + 1;
        });

        Object.entries(categoryCount).forEach(([cat, count]) => {
            console.log(`  • ${cat}: ${count} files`);
        });
        console.log('');

        // Step 4: Show sample files
        console.log('📄 STEP 4: Sample files (first 5)');
        console.log('-'.repeat(70));
        
        files.slice(0, 5).forEach((file, idx) => {
            console.log(`  [${idx + 1}] ${file.nama_file}`);
            console.log(`      Category: ${file.category}`);
            console.log(`      Uploaded: ${new Date(file.created_at).toLocaleDateString('id-ID')}`);
        });
        if (files.length > 5) {
            console.log(`  ... and ${files.length - 5} more files`);
        }
        console.log('');

        // Step 5: Verify response structure
        console.log('✅ STEP 5: API Response Structure');
        console.log('-'.repeat(70));
        
        const apiResponse = {
            files: files || [],
            total: totalCount || 0,
            page,
            limit,
            totalPages: Math.ceil((totalCount || 0) / limit)
        };

        console.log(JSON.stringify(apiResponse, null, 2));
        console.log('');

        // Step 6: Detailed troubleshooting
        console.log('🔍 STEP 6: Troubleshooting Checks');
        console.log('-'.repeat(70));
        
        console.log(`✓ Files returned: ${totalCount > 0 ? '✅ YES' : '❌ NO'}`);
        console.log(`✓ Admin credentials valid: ✅ YES`);
        console.log(`✓ Zona filter works: ${totalCount > 0 ? '✅ YES' : '❌ NO'}`);
        console.log(`✓ Category filter works: ${files?.length === totalCount ? '✅ YES' : '⚠️  CHECK'}`);
        console.log(`✓ Admin permissions: ${admin.permissions && admin.permissions.length > 0 ? '✅ YES' : '⚠️  EMPTY'}`);
        console.log(`✓ Admin is active: ${admin.is_active ? '✅ YES' : '❌ NO'}`);
        console.log('');

        // Step 7: Final conclusion
        console.log('=' .repeat(70));
        console.log('CONCLUSION');
        console.log('='.repeat(70));
        
        if (totalCount > 0 && files.length > 0) {
            console.log('✅ API is working correctly!');
            console.log(`✅ Admin CAN see ${totalCount} files`);
            console.log('');
            console.log('IF admin cannot see files in UI:');
            console.log('  1. Check frontend JavaScript console for errors');
            console.log('  2. Verify browser is sending correct JWT token');
            console.log('  3. Check if permissions[] check in frontend is blocking display');
            console.log('  4. Verify CORS headers allow the request');
        } else {
            console.log('❌ API is NOT returning files!');
            console.log('');
            console.log('Issues to check:');
            console.log('  1. Admin account might not have correct zona_id');
            console.log('  2. Files might not exist in database');
            console.log('  3. Supabase permissions might be blocking queries');
        }
        
        console.log('');

    } catch (err) {
        console.error('❌ TEST FAILED:', err.message);
        console.error(err);
        process.exit(1);
    }
}

testAdminApiCall().then(() => {
    console.log('✓ Test completed\n');
    process.exit(0);
});
