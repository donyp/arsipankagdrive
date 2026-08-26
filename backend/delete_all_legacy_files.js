require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAllLegacyFiles() {
  try {
    console.log('⚠️  DELETING ALL LEGACY FILES FROM DATABASE...');
    
    // Delete ALL files - use gt('created_at') to match all records
    const { error } = await supabase
      .from('files')
      .delete()
      .lt('created_at', '2999-12-31'); // Match all by using a date far in the future
    
    if (error) throw error;
    
    // Verify deletion
    const { data, count, error: countError } = await supabase
      .from('files')
      .select('*', { count: 'exact' });
    
    if (countError) throw countError;
    
    console.log(`✅ DELETION COMPLETE`);
    console.log(`Total files remaining in database: ${count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

deleteAllLegacyFiles();
