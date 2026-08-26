const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ehdqcxzdmmcwbdwkinyr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw'
);

(async () => {
  try {
    const { data, error } = await supabase.from('toko').select('*').limit(1);
    if (error) {
      console.error('Error fetching toko:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Toko table columns:', Object.keys(data[0]));
      console.log('\nSample toko record:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No toko records found');
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
  process.exit(0);
})();
