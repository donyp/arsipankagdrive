// Quick script to clear test invoice data from Supabase
const { createClient } = require('@supabase/supabase-js');

async function clearTestData() {
    const supabaseUrl = 'https://ehdqcxzdmmcwbdwkinyr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('🗑️  Starting to clear test invoice data...');
        
        // Delete all invoices with excel_batch_id (test uploads)
        const { data: deleted, error: deleteError } = await supabase
            .from('invoice_file_list')
            .delete()
            .not('excel_batch_id', 'is', null)
            .select('id');
        
        if (deleteError) {
            console.error('❌ Error deleting invoices:', deleteError);
            return;
        }
        
        const deletedCount = deleted?.length || 0;
        console.log(`✅ Deleted ${deletedCount} test invoices from invoice_file_list`);
        
        // Clear batch records
        const { data: batchDeleted, error: batchError } = await supabase
            .from('excel_upload_batches')
            .delete()
            .neq('id', '')
            .select('id');
        
        if (batchError) {
            console.error('⚠️  Error deleting batches:', batchError);
        } else {
            const batchCount = batchDeleted?.length || 0;
            console.log(`✅ Deleted ${batchCount} batch records from excel_upload_batches`);
        }
        
        console.log('\n✅ DONE! Test data cleared successfully.\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

clearTestData();
