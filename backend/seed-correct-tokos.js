/**
 * Seed the database with CORRECT toko names
 * This fixes the issue where toko table has "Toko Zona X" instead of real names
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://ehdqcxzdmmcwbdwkinyr.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw'
);

const CORRECT_TOKOS = [
    // ZONA 1
    { zona_kode: 'zona-01', nama: 'Balaraja' },
    { zona_kode: 'zona-01', nama: 'Bitung' },
    { zona_kode: 'zona-01', nama: 'Cilegon' },
    { zona_kode: 'zona-01', nama: 'Cipondoh' },
    { zona_kode: 'zona-01', nama: 'Ciruas' },
    { zona_kode: 'zona-01', nama: 'Kutabumi' },
    { zona_kode: 'zona-01', nama: 'Serang Timur' },
    { zona_kode: 'zona-01', nama: 'Pasar Kemis' },
    
    // ZONA 2
    { zona_kode: 'zona-02', nama: 'Bintaro' },
    { zona_kode: 'zona-02', nama: 'Cengkareng' },
    { zona_kode: 'zona-02', nama: 'Ciledug' },
    { zona_kode: 'zona-02', nama: 'Gading Serpong' },
    { zona_kode: 'zona-02', nama: 'Joglo' },
    { zona_kode: 'zona-02', nama: 'Karang Tengah' },
    { zona_kode: 'zona-02', nama: 'Pinang' },
    { zona_kode: 'zona-02', nama: 'Sawangan' },
    { zona_kode: 'zona-02', nama: 'Sawangan 2' },
    
    // ZONA 3A
    { zona_kode: 'zona-03a', nama: 'Fitrah Jaya' },
    { zona_kode: 'zona-03a', nama: 'Condet' },
    { zona_kode: 'zona-03a', nama: 'Duren Sawit' },
    { zona_kode: 'zona-03a', nama: 'Harapan Indah' },
    { zona_kode: 'zona-03a', nama: 'Jatiwaringin' },
    { zona_kode: 'zona-03a', nama: 'Rorotan' },
    { zona_kode: 'zona-03a', nama: 'Alumunium' },
    { zona_kode: 'zona-03a', nama: 'Alumunium Karawang' },
    { zona_kode: 'zona-03a', nama: 'Alumunium Leuwiliang' },
    
    // ZONA 3B
    { zona_kode: 'zona-03b', nama: 'Mega Granit' },
    { zona_kode: 'zona-03b', nama: 'Mega Warna' },
    
    // ZONA 4
    { zona_kode: 'zona-04', nama: 'Komsen' },
    { zona_kode: 'zona-04', nama: 'Bantargebang' },
    
    // ZONA 5
    { zona_kode: 'zona-05', nama: 'Dramaga' },
    { zona_kode: 'zona-05', nama: 'Jasinga' },
    
    // ZONA 6A
    { zona_kode: 'zona-06a', nama: 'Cianjur' },
    { zona_kode: 'zona-06a', nama: 'Ciawi' },
    
    // ZONA 6B
    { zona_kode: 'zona-06b', nama: 'Cikalong' },
    { zona_kode: 'zona-06b', nama: 'Cimahi' },
    
    // ZONA 7
    { zona_kode: 'zona-07', nama: 'Cikampek' },
    { zona_kode: 'zona-07', nama: 'Cirebon' },
    
    // ZONA 8
    { zona_kode: 'zona-08', nama: 'Brebes' },
    { zona_kode: 'zona-08', nama: 'Kendal' },
    
    // ZONA 9
    { zona_kode: 'zona-09', nama: 'Magelang' },
    { zona_kode: 'zona-09', nama: 'Solo' },
    
    // ZONA 10
    { zona_kode: 'zona-10', nama: 'Jember' },
    { zona_kode: 'zona-10', nama: 'Madiun' },
    
    // ZONA 11
    { zona_kode: 'zona-11', nama: 'Bandar Jaya' },
    { zona_kode: 'zona-11', nama: 'Kotabumi' },
    
    // ZONA 12
    { zona_kode: 'zona-12', nama: 'Banjarnegara' },
    { zona_kode: 'zona-12', nama: 'Purwokerto' },
    
    // ZONA 13
    { zona_kode: 'zona-13', nama: 'Makassar' },
    
    // ZONA 14
    { zona_kode: 'zona-14', nama: 'Sepinggan' },
    { zona_kode: 'zona-14', nama: 'Kariangau' },
    
    // ZONA 15
    { zona_kode: 'zona-15', nama: 'Jonggol' },
    { zona_kode: 'zona-15', nama: 'Kaliabang' },
    
    // ZONA 16
    { zona_kode: 'zona-16', nama: 'Cibitung' },
    { zona_kode: 'zona-16', nama: 'Deltamas' },
    
    // ZONA 17
    { zona_kode: 'zona-17', nama: 'Cikarang 1' },
    { zona_kode: 'zona-17', nama: 'Sukadami' },
];

async function seedCorrectTokos() {
    try {
        console.log('[Seed] Starting to seed correct tokos...');
        
        // Get all zones with their IDs
        const { data: zonas, error: zonasError } = await supabase.from('zonas').select('id, kode');
        if (zonasError) throw zonasError;
        
        console.log(`[Seed] Found ${zonas.length} zones`);
        
        // Create a map of zona_kode to zona_id
        const zonaMap = new Map(zonas.map(z => [z.kode.toLowerCase(), z.id]));
        
        console.log('[Seed] Zone map:', Array.from(zonaMap.entries()));
        
        // Delete all existing tokos first
        const { data: deleted, error: deleteError } = await supabase.from('toko').delete().neq('id', 0);
        if (deleteError) console.warn('[Seed] Error deleting old tokos:', deleteError.message);
        
        console.log('[Seed] Deleted old tokos');
        
        // Insert correct tokos
        const tokosToInsert = CORRECT_TOKOS.map(t => ({
            nama: t.nama,
            zona_id: zonaMap.get(t.zona_kode.toLowerCase())
        })).filter(t => t.zona_id);
        
        console.log(`[Seed] Inserting ${tokosToInsert.length} correct tokos...`);
        
        const { data: inserted, error: insertError } = await supabase
            .from('toko')
            .insert(tokosToInsert)
            .select();
        
        if (insertError) throw insertError;
        
        console.log(`[Seed] ✅ Successfully inserted ${inserted.length} tokos`);
        
        // Verify
        const { data: allTokos, error: verifyError } = await supabase.from('toko').select('id, nama, zona_id');
        if (verifyError) throw verifyError;
        
        console.log(`[Seed] ✅ Verification: Database now has ${allTokos.length} tokos`);
        console.log('[Seed] Sample tokos:', allTokos.slice(0, 10));
        
    } catch (err) {
        console.error('[Seed] Error:', err.message);
        process.exit(1);
    }
    
    process.exit(0);
}

seedCorrectTokos();
