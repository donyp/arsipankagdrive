const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  const { data, error } = await supabase.from('toko').select('nama').order('nama');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('=== All toko names in database ===');
    data.forEach((t, i) => {
      console.log(`${i+1}. "${t.nama}"`);
    });
    console.log(`\nTotal: ${data.length} tokos`);
    
    // Check if Kalimalang exists
    const hasKalimalang = data.some(t => t.nama.toLowerCase().includes('kalimalang'));
    console.log(`\nContains "kalimalang": ${hasKalimalang ? 'YES' : 'NO'}`);
  }
})();
