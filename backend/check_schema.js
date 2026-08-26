require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    console.log('📋 Checking database schema for files table...\n');
    
    // Get one file to see what columns exist
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('Columns found in files table:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log('No files in database (table is empty)');
      console.log('But we can still check schema by trying common fields...\n');
      
      // Try different field names
      const fieldsToCheck = [
        'file_size',
        'ukuran_bytes',
        'size',
        'file_bytes',
        'bytes',
        'storage_size'
      ];
      
      for (const field of fieldsToCheck) {
        try {
          const { error: testError } = await supabase
            .from('files')
            .select(field)
            .limit(1);
          
          if (!testError) {
            console.log(`  ✅ Field '${field}' EXISTS`);
          }
        } catch (e) {
          // Field doesn't exist
        }
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
