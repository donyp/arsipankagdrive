/**
 * Detailed check - Verify if INVOICE category exists for zona_id=1
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInvoiceCategory() {
    try {
        console.log('\n='.repeat(60));
        console.log('DETAILED CATEGORY CHECK');
        console.log('='.repeat(60) + '\n');

        // Query 1: Check if INVOICE category exists in zona_id=1
        console.log('1️⃣ Searching for category="INVOICE" in zona_id=1...');
        const { data: invoices, count: invCount } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .eq('category', 'INVOICE')
            .is('deleted_at', null);

        console.log(`   Result: ${invCount} files found\n`);

        // Query 2: All unique categories in zona_id=1
        console.log('2️⃣ All unique categories in zona_id=1:');
        const { data: allFiles } = await supabase
            .from('files')
            .select('category')
            .eq('zona_id', 1)
            .is('deleted_at', null);

        const categories = new Set(allFiles.map(f => f.category));
        console.log(`   ${Array.from(categories).join(', ')}\n`);

        // Query 3: Test the exact in() filter used in API
        console.log('3️⃣ Testing IN filter with ["INVOICE", "PPN", "NON_PPN"]:');
        const { data: filtered, count: filtCount } = await supabase
            .from('files')
            .select('category', { count: 'exact' })
            .eq('zona_id', 1)
            .in('category', ['INVOICE', 'PPN', 'NON_PPN'])
            .is('deleted_at', null);

        const catBreakdown = {};
        filtered.forEach(f => {
            catBreakdown[f.category] = (catBreakdown[f.category] || 0) + 1;
        });

        console.log(`   Total files: ${filtCount}`);
        console.log('   Breakdown:');
        Object.entries(catBreakdown).forEach(([cat, count]) => {
            console.log(`     • ${cat}: ${count}`);
        });
        console.log('');

        // Query 4: Direct comparison - no filter vs with filter
        console.log('4️⃣ Comparison: All vs Filtered');
        const { count: allCount } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .is('deleted_at', null);

        console.log(`   All files in zona_id=1: ${allCount}`);
        console.log(`   Files matching IN filter: ${filtCount}`);
        console.log(`   Missing: ${allCount - filtCount}\n`);

        // Query 5: What categories are NOT in the filter?
        console.log('5️⃣ Categories NOT in the filter ["INVOICE", "PPN", "NON_PPN"]:');
        const { data: missedFiles } = await supabase
            .from('files')
            .select('category, nama_file')
            .eq('zona_id', 1)
            .not('category', 'in', '("INVOICE","PPN","NON_PPN")')
            .is('deleted_at', null);

        if (missedFiles.length > 0) {
            const missedCats = new Set(missedFiles.map(f => f.category));
            console.log(`   Found categories: ${Array.from(missedCats).join(', ')}`);
            console.log(`   Sample files:`);
            missedFiles.slice(0, 3).forEach(f => {
                console.log(`     • ${f.category}: ${f.nama_file}`);
            });
        } else {
            console.log(`   ✓ No missing categories - all files match the filter!`);
        }
        console.log('');

        // Query 6: Check admin user setup
        console.log('6️⃣ Admin user (ADMIN ZONA 1) - can they see files?');
        const { data: admin } = await supabase
            .from('users')
            .select('id, email, zona_id, role, is_active, permissions')
            .eq('zona_id', 1)
            .eq('role', 'admin_zona')
            .single();

        if (admin) {
            console.log(`   ID: ${admin.id}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Zona: ${admin.zona_id}`);
            console.log(`   Active: ${admin.is_active}`);
            console.log(`   Permissions: ${JSON.stringify(admin.permissions)}\n`);
        }

        // Query 7: Check if admin can access files they uploaded
        console.log('7️⃣ Files uploaded by this admin:');
        const { data: adminFiles, count: adminFileCount } = await supabase
            .from('files')
            .select('*', { count: 'exact' })
            .eq('zona_id', 1)
            .eq('uploaded_by', admin?.id)
            .is('deleted_at', null);

        console.log(`   Found: ${adminFileCount} files`);
        if (adminFileCount > 0) {
            console.log(`   Sample: ${adminFiles.slice(0, 2).map(f => f.nama_file).join(', ')}`);
        }
        console.log('');

        console.log('='.repeat(60));
        console.log('CONCLUSION');
        console.log('='.repeat(60));
        if (filtCount === allCount) {
            console.log('✓ ALL files in zona_id=1 match the filter');
            console.log('✓ Admin SHOULD be able to see all files');
            console.log('❓ Issue must be elsewhere (frontend, permissions, etc)');
        } else {
            console.log(`❌ FILTER MISMATCH: Only ${filtCount}/${allCount} files visible`);
            console.log(`❌ Admin is seeing ${allCount - filtCount} fewer files than expected`);
            console.log(`❌ Missing categories detected!`);
        }
        console.log('');

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    }
}

checkInvoiceCategory().then(() => process.exit(0));
