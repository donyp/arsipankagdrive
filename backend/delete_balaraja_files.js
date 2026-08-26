require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteBalaraja() {
  try {
    console.log('🔍 Finding all Balaraja files...\n');
    
    // Find Balaraja files
    const { data: files, error: findError } = await supabase
      .from('files')
      .select('id, nama_file, storage_path');
    
    if (findError) throw findError;
    
    console.log(`Found ${files.length} total files\n`);
    
    if (files.length > 0) {
      console.log('Files in database:');
      files.forEach((f, i) => {
        console.log(`  ${i+1}. ID: ${f.id}`);
        console.log(`     Name: ${f.nama_file}`);
        console.log(`     Path: ${f.storage_path}\n`);
      });
      
      // Delete all
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all by impossible ID
      
      if (deleteError && deleteError.message !== 'The result of a delete statement returning no rows is a contract violation') {
        throw deleteError;
      }
      
      // Verify
      const { count } = await supabase
        .from('files')
        .select('*', { count: 'exact' });
      
      console.log(`✅ DELETED ALL FILES - ${count} remaining`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

deleteBalaraja();
