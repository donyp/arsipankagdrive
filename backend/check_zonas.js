require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkZonas() {
  try {
    console.log('📋 Checking zonas in database...\n');
    
    const { data, error } = await supabase
      .from('zonas')
      .select('id, kode, nama');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('Zonas found:');
      data.forEach(z => {
        console.log(`  ${z.kode} (id: ${z.id}) - ${z.nama}`);
      });
    } else {
      console.log('No zonas found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkZonas();
