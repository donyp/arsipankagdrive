/**
 * Database Query Script - Check files for zona_id=1
 * Purpose: Verify data integrity and debug admin visibility issues
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFilesForZona1() {
    try {
        console.log('\n='.repeat(60));
        console.log('DATABASE CHECK: Files for zona_id=1');
        console.log('='.repeat(60) + '\n');

        // Query 1: Count all files for zona_id=1
        console.log('📊 QUERY 1: Total count of files in zona_id=1');
        console.log('-'.repeat(60));
        
        const { data: allFiles, count: totalCount, error: countError } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .is('deleted_at', null);

        if (countError) {
            console.error('❌ Error:', countError.message);
        } else {
            console.log(`✓ Total files found: ${totalCount}`);
            console.log(`✓ Current query returned: ${allFiles?.length || 0} records\n`);
        }

        // Query 2: Count by category
        console.log('📊 QUERY 2: Files grouped by CATEGORY');
        console.log('-'.repeat(60));
        
        const { data: byCategory, error: catError } = await supabase
            .from('files')
            .select('category', { count: 'exact' })
            .eq('zona_id', 1)
            .is('deleted_at', null);

        if (catError) {
            console.error('❌ Error:', catError.message);
        } else {
            const categories = {};
            byCategory.forEach(file => {
                categories[file.category] = (categories[file.category] || 0) + 1;
            });
            
            console.log('Category breakdown:');
            Object.entries(categories).forEach(([cat, count]) => {
                console.log(`  • ${cat}: ${count} files`);
            });
            console.log('');
        }

        // Query 3: Files filtered by INVOICE categories only
        console.log('📊 QUERY 3: Files with category IN ("INVOICE", "PPN", "NON_PPN")');
        console.log('-'.repeat(60));
        
        const { data: invoiceFiles, count: invoiceCount, error: invError } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .in('category', ['INVOICE', 'PPN', 'NON_PPN'])
            .is('deleted_at', null);

        if (invError) {
            console.error('❌ Error:', invError.message);
        } else {
            console.log(`✓ Found ${invoiceCount} files in INVOICE categories\n`);

            if (invoiceFiles && invoiceFiles.length > 0) {
                console.log('Sample files (first 5):');
                invoiceFiles.slice(0, 5).forEach((file, idx) => {
                    console.log(`\n  [${idx + 1}] ${file.nama_file}`);
                    console.log(`      ID: ${file.id}`);
                    console.log(`      Category: ${file.category}`);
                    console.log(`      Uploaded by: ${file.uploaded_by}`);
                    console.log(`      Status: ${file.status}`);
                    console.log(`      Created: ${file.created_at}`);
                });
            } else {
                console.log('⚠️  No files found in INVOICE categories');
            }
            console.log('');
        }

        // Query 4: Check uploaded_by info
        console.log('📊 QUERY 4: Files grouped by UPLOADED_BY');
        console.log('-'.repeat(60));
        
        const { data: byUploader, error: uploadError } = await supabase
            .from('files')
            .select('uploaded_by, id', { count: 'exact' })
            .eq('zona_id', 1)
            .is('deleted_at', null);

        if (uploadError) {
            console.error('❌ Error:', uploadError.message);
        } else {
            const uploaders = {};
            byUploader.forEach(file => {
                const uploader = file.uploaded_by || 'UNKNOWN';
                uploaders[uploader] = (uploaders[uploader] || 0) + 1;
            });
            
            console.log('Uploader breakdown:');
            Object.entries(uploaders).forEach(([uploader, count]) => {
                console.log(`  • ${uploader}: ${count} files`);
            });
            console.log('');
        }

        // Query 5: Check for specific admin_zona user
        console.log('📊 QUERY 5: Admin users for zona_id=1');
        console.log('-'.repeat(60));
        
        const { data: admins, error: adminError } = await supabase
            .from('users')
            .select('id, email, name, role, zona_id, is_active')
            .eq('zona_id', 1)
            .eq('role', 'admin_zona')
            .eq('is_active', true);

        if (adminError) {
            console.error('❌ Error:', adminError.message);
        } else {
            console.log(`✓ Found ${admins?.length || 0} active admin_zona users`);
            if (admins && admins.length > 0) {
                admins.forEach((admin, idx) => {
                    console.log(`\n  [${idx + 1}] ${admin.name}`);
                    console.log(`      Email: ${admin.email}`);
                    console.log(`      ID: ${admin.id}`);
                    console.log(`      Role: ${admin.role}`);
                    console.log(`      Is Active: ${admin.is_active}`);
                });
            }
            console.log('');
        }

        // Query 6: Check file status values
        console.log('📊 QUERY 6: Files status distribution (zona_id=1)');
        console.log('-'.repeat(60));
        
        const { data: byStatus, error: statusError } = await supabase
            .from('files')
            .select('status', { count: 'exact' })
            .eq('zona_id', 1)
            .is('deleted_at', null);

        if (statusError) {
            console.error('❌ Error:', statusError.message);
        } else {
            const statuses = {};
            byStatus.forEach(file => {
                const status = file.status || 'NULL';
                statuses[status] = (statuses[status] || 0) + 1;
            });
            
            console.log('Status breakdown:');
            Object.entries(statuses).forEach(([status, count]) => {
                console.log(`  • ${status}: ${count} files`);
            });
            console.log('');
        }

        // Query 7: Check if deleted_at filter is the issue
        console.log('📊 QUERY 7: Including deleted files (deleted_at IS NOT NULL)');
        console.log('-'.repeat(60));
        
        const { data: deletedFiles, count: deletedCount, error: delError } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .not('deleted_at', 'is', null);

        if (delError) {
            console.error('❌ Error:', delError.message);
        } else {
            console.log(`✓ Found ${deletedCount} deleted files for zona_id=1`);
            console.log('');
        }

        // Summary
        console.log('='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total files (zona_id=1, not deleted): ${totalCount}`);
        console.log(`Files in INVOICE categories: ${invoiceCount}`);
        console.log(`Deleted files: ${deletedCount}`);
        console.log(`Active admin_zona users: ${admins?.length || 0}`);
        console.log('\n✓ Database check completed\n');

    } catch (err) {
        console.error('\n❌ FATAL ERROR:', err);
        process.exit(1);
    }
}

// Run the check
checkFilesForZona1().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
