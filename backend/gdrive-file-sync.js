// ============================================================
// Google Drive File Auto-Sync
// Periodically scan ARSIP ANKA for new/updated files
// Auto-insert to database when changes detected
// ============================================================

const { execSync } = require('child_process');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RCLONE_CONFIG = path.join(__dirname, 'rclone.conf');
const ALIST_BASE = process.env.RCLONE_BASE_PATH || '/ARSIP ANKA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Scan interval: every 5 minutes
const SYNC_INTERVAL = 5 * 60 * 1000;

/**
 * Normalize zona code from folder name to database format
 * zona-1 → zona-01, zona-2 → zona-02, etc.
 */
function normalizeZonaCode(folderName) {
    // Match pattern: zona-X or zona-Xa/b
    const match = folderName.match(/^zona-(\d+)([a-b]?)$/i);
    if (!match) return null;
    
    let num = match[1];
    const suffix = match[2] ? match[2].toLowerCase() : '';
    
    // Convert single digit to two digits: 1→01, 2→02, etc.
    if (num.length === 1) {
        num = '0' + num;
    }
    
    return `zona-${num}${suffix}`;
}

/**
 * Parse storage path to extract metadata
 * Path format: TOKO-NAME/CATEGORY/[subcategory/]filename.pdf
 * OR (legacy): zona-X/TOKO-NAME/CATEGORY/[subcategory/]filename.pdf
 * Handles: INVOICE/PPN/file or INVOICE/NON/file or INVOICE/file
 */
function parseStoragePath(relPath) {
    const parts = relPath.split('/').filter(p => p);
    
    if (parts.length < 2) return null;
    
    let tokoKode, category, subCategory, filename, zonaKode;
    
    // Check if first part is zona folder (zona-1, zona-01, zona-3a, etc.)
    const isZonaPath = /^zona-\d+[a-b]?$/i.test(parts[0]);
    
    if (isZonaPath && parts.length >= 3) {
        // Legacy format: zona-X/TOKO-NAME/CATEGORY/[sub]/filename
        zonaKode = normalizeZonaCode(parts[0]);
        if (!zonaKode) return null;
        
        tokoKode = parts[1];
        category = parts[2].toUpperCase();
        
        let subCategory = null;
        let filename = parts.slice(3).join('/');
        
        // If there's a 4th part and it's PPN or NON, treat as subcategory
        if (parts.length >= 5 && (parts[3].toUpperCase() === 'PPN' || parts[3].toUpperCase() === 'NON')) {
            subCategory = parts[3].toUpperCase();
            filename = parts.slice(4).join('/');
        }
        
        // Clean up filename - remove category prefix if present
        let cleanFilename = filename;
        if (subCategory) {
            const prefixPattern = new RegExp(`^${subCategory}\\s+`, 'i');
            cleanFilename = filename.replace(prefixPattern, '');
        }
        
        return {
            zonaFolder: parts[0],
            zonaKode: zonaKode,
            tokoKode: tokoKode,
            category: category,
            subCategory: subCategory,
            filename: cleanFilename,
            relativePath: relPath
        };
    } else {
        // New format: TOKO-NAME/CATEGORY/[sub]/filename (no zona prefix)
        // We need to guess zona from toko code or use default
        tokoKode = parts[0];
        category = parts[1].toUpperCase();
        
        let subCategory = null;
        let filename = parts.slice(2).join('/');
        
        // If there's a 3rd part and it's PPN or NON, treat as subcategory
        if (parts.length >= 4 && (parts[2].toUpperCase() === 'PPN' || parts[2].toUpperCase() === 'NON')) {
            subCategory = parts[2].toUpperCase();
            filename = parts.slice(3).join('/');
        }
        
        // Clean up filename - remove category prefix if present
        let cleanFilename = filename;
        if (subCategory) {
            const prefixPattern = new RegExp(`^${subCategory}\\s+`, 'i');
            cleanFilename = filename.replace(prefixPattern, '');
        }
        
        return {
            zonaFolder: 'zona-1',  // Default to zona-1 if not specified
            zonaKode: 'zona-01',    // Normalized
            tokoKode: tokoKode,
            category: category,
            subCategory: subCategory,
            filename: cleanFilename,
            relativePath: relPath
        };
    }
}

/**
 * List all files in ARSIP ANKA using rclone
 */
function listGdriveFiles() {
    try {
        const cmd = `rclone lsjson "gdrive:/ARSIP ANKA" --config "${RCLONE_CONFIG}" --recursive`;
        const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const files = JSON.parse(output);
        
        return files
            .filter(f => !f.IsDir && f.Name.toLowerCase().endsWith('.pdf'))
            .map(f => ({
                name: f.Name,
                size: f.Size,
                modTime: f.ModTime,
                path: f.Path || ''
            }));
    } catch (err) {
        console.error('[GDriveSync] Error listing files:', err.message);
        return [];
    }
}

/**
 * Check if file already in database
 */
async function fileExistsInDb(storagePath) {
    try {
        const { data, error } = await supabase
            .from('files')
            .select('id')
            .eq('storage_path', storagePath)
            .limit(1);
        
        if (error) throw error;
        return data && data.length > 0;
    } catch (err) {
        console.error('[GDriveSync] DB check error:', err.message);
        return false;
    }
}

/**
 * Get system user ID for uploaded_by (use first super_admin if available)
 */
async function getSystemUserId() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'super_admin')
            .limit(1);
        
        if (!error && data && data.length > 0) {
            return data[0].id;
        }
        // Fallback: use any user
        const { data: anyUser, error: anyError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        return anyUser && anyUser.length > 0 ? anyUser[0].id : 'd0548d41-c30f-4d73-9127-12f974349091';
    } catch (err) {
        return 'd0548d41-c30f-4d73-9127-12f974349091'; // hardcoded fallback
    }
}

/**
 * Extract date from filename (e.g., "30 MEI", "30/05", "30-05-2026")
 * Returns YYYY-MM-DD format or null
 */
function extractDateFromFilename(filename) {
    if (!filename) return null;
    const text = filename.toUpperCase();
    
    const months = {
        'JAN': '01', 'FEB': '02', 'PEB': '02', 'MAR': '03', 'APR': '04',
        'MEI': '05', 'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGU': '08',
        'AUG': '08', 'SEP': '09', 'OKT': '10', 'OCT': '10', 'NOV': '11',
        'NOP': '11', 'DES': '12', 'DEC': '12'
    };

    // 1. DD MMM format (e.g. "30 MEI", "30MEI")
    const textMonthRegex = /(\d{1,2})\s*([A-Z]{3})/;
    const textMonthMatch = text.match(textMonthRegex);
    if (textMonthMatch) {
        const day = textMonthMatch[1].padStart(2, '0');
        const monthAbbr = textMonthMatch[2];
        const month = months[monthAbbr];
        if (month) {
            const year = new Date().getFullYear();
            return `${year}-${month}-${day}`;
        }
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY format
    const dmyRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})/;
    const dmyMatch = text.match(dmyRegex);
    if (dmyMatch) {
        let year = dmyMatch[3];
        if (year.length === 2) year = '20' + year;
        const month = dmyMatch[2].padStart(2, '0');
        const day = dmyMatch[1].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 3. DD/MM or DD-MM format (assume current year)
    const dmRegex = /(\d{1,2})[\/\-](\d{1,2})(?!\d)/;
    const dmMatch = text.match(dmRegex);
    if (dmMatch) {
        const year = new Date().getFullYear();
        const month = dmMatch[2].padStart(2, '0');
        const day = dmMatch[1].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 4. YYYY/MM/DD or YYYY-MM-DD format
    const ymdRegex = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
    const ymdMatch = text.match(ymdRegex);
    if (ymdMatch) {
        const year = ymdMatch[1];
        const month = ymdMatch[2].padStart(2, '0');
        const day = ymdMatch[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

/**
 * Insert new file to database
 */
async function insertFileToDb(fileInfo, zonaMap, tokoMap, systemUserId) {
    try {
        const metadata = parseStoragePath(fileInfo.path);
        if (!metadata) {
            console.warn(`[GDriveSync] Cannot parse path: ${fileInfo.path}`);
            return false;
        }

        // Look up zona_id using normalized zona code
        const zonaKey = metadata.zonaKode.toLowerCase();
        const zona = zonaMap.get(zonaKey);
        if (!zona) {
            console.warn(`[GDriveSync] ❌ Zona not found: "${metadata.zonaFolder}" → normalized to "${metadata.zonaKode}"`);
            console.log(`[GDriveSync] Available zonas: ${Array.from(zonaMap.keys()).join(', ')}`);
            return false;
        }

        // Look up toko_id (case-insensitive)
        const tokoKey = `${zona.id}:${metadata.tokoKode.toLowerCase()}`;
        const toko = tokoMap.get(tokoKey);
        // Note: toko can be null - file will still be saved with toko_id=null
        if (!toko) {
            console.log(`[GDriveSync] ⚠️  Toko not found: "${metadata.tokoKode}" (will insert with toko_id=null)`);
        }

        const storagePath = `${ALIST_BASE}/${fileInfo.path}`;
        
        // Extract date from filename
        const extractedDate = extractDateFromFilename(metadata.filename);
        const fileDate = extractedDate || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('files')
            .insert([{
                nama_file: metadata.filename,
                storage_path: storagePath,
                zona_id: zona.id,
                toko_id: toko ? toko.id : null,
                category: metadata.category.toUpperCase(),
                tipe_ppn: metadata.subCategory || null,  // PPN, NON, or null
                ukuran_bytes: fileInfo.size,
                status: 'Unread',
                uploaded_by: systemUserId,
                deleted_at: null,
                tanggal_dokumen: fileDate
            }]);

        if (error) {
            console.error(`[GDriveSync] ❌ Insert error: ${error.message}`);
            return false;
        }

        console.log(`[GDriveSync] ✅ Inserted: ${metadata.zonaFolder}/${metadata.tokoKode}/${metadata.category}${metadata.subCategory ? '/'+metadata.subCategory : ''} → ${metadata.filename} (size: ${fileInfo.size} bytes)`);
        return true;
    } catch (err) {
        console.error(`[GDriveSync] Error inserting file: ${err.message}`);
        return false;
    }
}

/**
 * Sync files from Google Drive to database
 */
async function syncGdriveFiles() {
    console.log(`[GDriveSync] Starting scan at ${new Date().toISOString()}`);
    
    try {
        // Fetch zona mappings
        const { data: zones, error: zoneError } = await supabase
            .from('zonas')
            .select('id, kode');
        if (zoneError) throw zoneError;

        // Try to fetch toko, but don't fail if table doesn't exist
        let tokos = [];
        const { data: tokoData, error: tokoError } = await supabase
            .from('toko')
            .select('id, zona_id, kode');
        if (!tokoError) {
            tokos = tokoData || [];
        }

        // Create lookup maps (case-insensitive)
        const zonaMap = new Map();
        (zones || []).forEach(z => {
            // Store both lowercase and original
            zonaMap.set(z.kode.toLowerCase(), z);
        });
        
        const tokoMap = new Map(
            (tokos || []).map(t => [`${t.zona_id}:${t.kode.toLowerCase()}`, t])
        );

        const systemUserId = await getSystemUserId();
        
        const files = listGdriveFiles();
        console.log(`[GDriveSync] Found ${files.length} PDF files in ARSIP ANKA`);
        
        let synced = 0;
        let skipped = 0;
        
        for (const file of files) {
            const storagePath = `${ALIST_BASE}/${file.path}`;
            const exists = await fileExistsInDb(storagePath);
            
            if (!exists) {
                const success = await insertFileToDb(file, zonaMap, tokoMap, systemUserId);
                if (success) synced++;
            } else {
                skipped++;
            }
        }
        
        console.log(`[GDriveSync] Complete: ${synced} new, ${skipped} existing`);
        return { synced, skipped, total: files.length };
    } catch (err) {
        console.error('[GDriveSync] Sync error:', err.message);
        return { synced: 0, skipped: 0, total: 0, error: err.message };
    }
}

/**
 * Start auto-sync worker
 */
function startAutoSync(interval = SYNC_INTERVAL) {
    console.log(`[GDriveSync] Starting auto-sync worker (interval: ${interval / 1000}s)`);
    
    // Run immediately
    syncGdriveFiles().catch(err => console.error('[GDriveSync] Error:', err));
    
    // Then repeat on interval
    setInterval(() => {
        syncGdriveFiles().catch(err => console.error('[GDriveSync] Error:', err));
    }, interval);
}

/**
 * Manual sync endpoint
 */
async function manualSync() {
    return await syncGdriveFiles();
}

module.exports = {
    startAutoSync,
    manualSync,
    syncGdriveFiles,
    listGdriveFiles,
    parseStoragePath
};

// Run if executed directly
if (require.main === module) {
    console.log('[GDriveSync] Running manual sync...');
    syncGdriveFiles().then(result => {
        console.log('[GDriveSync] Result:', result);
        process.exit(0);
    }).catch(err => {
        console.error('[GDriveSync] Fatal error:', err);
        process.exit(1);
    });
}
