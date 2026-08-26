require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanAndResync() {
  try {
    console.log('🧹 CLEANING OLD FILES FROM DATABASE...\n');
    
    // Delete ALL files
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .lt('created_at', '2999-12-31');
    
    if (deleteError) throw deleteError;
    
    // Verify deletion
    const { count } = await supabase
      .from('files')
      .select('*', { count: 'exact' });
    
    console.log(`✅ DATABASE CLEANED - ${count} files remaining\n`);
    
    // Now trigger manual sync via the endpoint
    console.log('🔄 STARTING MANUAL AUTO-SYNC...\n');
    console.log('Next step: Wait for backend to auto-scan (every 5 min)');
    console.log('Or trigger manual sync via: POST /api/sync/gdrive\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanAndResync();
