require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFiles() {
  try {
    // Count all files
    const { data, error, count } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: false });
    
    if (error) throw error;
    
    console.log(`Total files in database: ${count}`);
    if (data && data.length > 0) {
      console.log(`\nFirst 5 files:`);
      data.slice(0, 5).forEach((f, i) => {
        console.log(`\n${i+1}. ${f.nama_file}`);
        console.log(`   - storage_path: ${f.storage_path}`);
        console.log(`   - file_size: ${f.file_size}`);
        console.log(`   - ukuran_bytes: ${f.ukuran_bytes}`);
        console.log(`   - total_jual: ${f.total_jual}`);
        console.log(`   - zona_id: ${f.zona_id}`);
        console.log(`   - category: ${f.category}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkFiles();
