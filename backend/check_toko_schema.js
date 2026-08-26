require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTokoSchema() {
  try {
    console.log('📋 Checking toko table schema...\n');
    
    // Get one toko record to see columns
    const { data, error } = await supabase
      .from('toko')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('Columns in toko table:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}: ${data[0][key]}`);
      });
    } else {
      console.log('No toko records found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTokoSchema();
