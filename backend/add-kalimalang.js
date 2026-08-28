// Script to add Kalimalang toko via the API
// Usage: node add-kalimalang.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addKalimalang() {
  try {
    console.log('Adding Kalimalang toko...');
    
    // Insert Kalimalang with zona_id 1 (default)
    const { data, error } = await supabase
      .from('toko')
      .insert({
        nama: 'Kalimalang',
        zona_id: 1
      })
      .select();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('✓ Kalimalang toko added successfully!');
    console.log('Data:', data);
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

addKalimalang();
