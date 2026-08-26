require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('id, nama_file, storage_path, ukuran_bytes, tipe_ppn')
      .limit(5);
    
    if (error) throw error;
    
    console.log(`Found ${data.length} files:\n`);
    data.forEach((f, i) => {
      console.log(`${i+1}. ${f.nama_file}`);
      console.log(`   Storage Path: ${f.storage_path}`);
      console.log(`   Size: ${f.ukuran_bytes} bytes`);
      console.log(`   PPN Type: ${f.tipe_ppn || 'null'}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
