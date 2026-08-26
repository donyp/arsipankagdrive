const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ehdqcxzdmmcwbdwkinyr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw'
);

async function cleanupFiles() {
  try {
    console.log('[Cleanup] Fetching all files from database...');
    
    // Get all files (including soft-deleted)
    const { data: allFiles, error: fetchErr } = await supabase
      .from('files')
      .select('id, nama_file, deleted_at');
    
    if (fetchErr) {
      console.error('❌ Fetch error:', fetchErr.message);
      return false;
    }
    
    console.log(`[Cleanup] Found ${allFiles?.length || 0} files in database`);
    
    if (!allFiles || allFiles.length === 0) {
      console.log('✅ Database is already clean');
      return true;
    }
    
    console.log('\nFiles to delete:');
    allFiles.forEach(f => console.log(`  - ${f.nama_file} (deleted: ${f.deleted_at ? 'yes' : 'no'})`));
    
    // Delete all files permanently
    console.log('\n[Cleanup] Deleting all files...');
    const { error: deleteErr, count } = await supabase
      .from('files')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteErr) {
      console.error('❌ Delete error:', deleteErr.message);
      return false;
    }
    
    console.log(`✅ Successfully deleted ${allFiles.length} files from database`);
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

cleanupFiles().then(success => {
  process.exit(success ? 0 : 1);
});
