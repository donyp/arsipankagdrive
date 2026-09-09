/**
 * Background Job: File Count Sync
 * 
 * Periodically verifies files_uploaded_count accuracy across all invoices
 * Fixes stale counts from failed uploads, deleted files, or sync issues
 * 
 * Runs every 30 minutes
 * Non-blocking - errors don't interrupt main service
 */

const fs = require('fs');
const path = require('path');

// Counter for statistics
let syncStats = {
    totalChecked: 0,
    totalCorrected: 0,
    lastRun: null,
    lastError: null,
    errors: []
};

/**
 * Verify and correct file count for a single invoice
 */
async function verifySingleInvoice(supabase, rcloneStorage, invoice) {
    try {
        const dbCount = invoice.files_uploaded_count || 0;

        // ALWAYS check actual file existence, even if DB count matches path count
        // (files might have been deleted from Google Drive directly)
        console.log(`[FileCountSync] Checking actual file existence for ${invoice.faktur} (DB count: ${dbCount})...`);

        let actualFilesExist = 0;
        
        // Check each file with timeout to avoid hanging
        const checkPromises = [];
        
        if (invoice.invoice_pdf_path) {
            checkPromises.push(
                Promise.race([
                    rcloneStorage.checkFileExists(invoice.invoice_pdf_path),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]).then(exists => ({ type: 'invoice', exists }))
                  .catch(() => ({ type: 'invoice', exists: false }))
            );
        }
        
        if (invoice.bukti_bayar_path) {
            checkPromises.push(
                Promise.race([
                    rcloneStorage.checkFileExists(invoice.bukti_bayar_path),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]).then(exists => ({ type: 'bukti_bayar', exists }))
                  .catch(() => ({ type: 'bukti_bayar', exists: false }))
            );
        }
        
        if (invoice.faktur_pajak_path) {
            checkPromises.push(
                Promise.race([
                    rcloneStorage.checkFileExists(invoice.faktur_pajak_path),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]).then(exists => ({ type: 'faktur_pajak', exists }))
                  .catch(() => ({ type: 'faktur_pajak', exists: false }))
            );
        }

        // Wait for all checks
        const results = await Promise.all(checkPromises);
        results.forEach(r => {
            if (r.exists) actualFilesExist++;
        });

        // If actual file count differs from DB count, correct DB
        if (actualFilesExist !== dbCount) {
            console.warn(`[FileCountSync] Correcting ${invoice.faktur}: ${dbCount} → ${actualFilesExist}`);
            
            const { error: updateErr } = await supabase
                .from('invoice_file_list')
                .update({
                    files_uploaded_count: actualFilesExist,
                    files_required_count: invoice.keterangan === 'PPN' ? 3 : 2,
                    updated_at: new Date().toISOString()
                })
                .eq('faktur', invoice.faktur);

            if (updateErr) {
                console.error(`[FileCountSync] Update error for ${invoice.faktur}:`, updateErr);
                syncStats.errors.push(`${invoice.faktur}: ${updateErr.message}`);
                return { faktur: invoice.faktur, matched: false, error: updateErr.message };
            }

            console.log(`[FileCountSync] ✅ Corrected ${invoice.faktur}: ${dbCount} → ${actualFilesExist}`);
            return { faktur: invoice.faktur, matched: false, corrected: true, dbCount, actualFilesExist };
        }

        return { faktur: invoice.faktur, matched: true };

    } catch (err) {
        console.error(`[FileCountSync] Error verifying ${invoice.faktur}:`, err.message);
        syncStats.errors.push(`${invoice.faktur}: ${err.message}`);
        return { faktur: invoice.faktur, error: err.message };
    }
}

/**
 * Main sync job - verify all invoices
 */
async function runFileCountSync(supabase, rcloneStorage) {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('[FileCountSync] Starting background file count verification...');
        const startTime = Date.now();

        syncStats.totalChecked = 0;
        syncStats.totalCorrected = 0;
        syncStats.errors = [];

        // Get all invoices
        const { data: invoices, error: queryErr } = await supabase
            .from('invoice_file_list')
            .select('faktur, invoice_pdf_path, bukti_bayar_path, faktur_pajak_path, files_uploaded_count, keterangan')
            .order('faktur', { ascending: true });

        if (queryErr) {
            console.error('[FileCountSync] Query error:', queryErr);
            syncStats.lastError = queryErr.message;
            return { success: false, error: queryErr.message };
        }

        console.log(`[FileCountSync] Checking ${invoices.length} invoices...`);

        // Process invoices in batches (to avoid overwhelming DB/storage)
        const BATCH_SIZE = 50;
        let correctedCount = 0;

        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
            const batch = invoices.slice(i, i + BATCH_SIZE);
            console.log(`[FileCountSync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(invoices.length / BATCH_SIZE)}`);

            // Process batch in parallel (but not too many)
            const results = await Promise.all(
                batch.map(inv => verifySingleInvoice(supabase, rcloneStorage, inv))
            );

            results.forEach(result => {
                syncStats.totalChecked++;
                if (result.corrected) {
                    syncStats.totalCorrected++;
                    correctedCount++;
                }
            });

            // Small delay between batches to avoid overwhelming storage
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const duration = Date.now() - startTime;
        syncStats.lastRun = new Date().toISOString();

        console.log('[FileCountSync] ✅ Sync complete');
        console.log(`[FileCountSync] Checked: ${syncStats.totalChecked} | Corrected: ${syncStats.totalCorrected} | Duration: ${duration}ms`);
        
        if (syncStats.errors.length > 0) {
            console.log(`[FileCountSync] Errors: ${syncStats.errors.length}`);
            syncStats.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
            if (syncStats.errors.length > 5) {
                console.log(`  ... and ${syncStats.errors.length - 5} more`);
            }
        }

        console.log('='.repeat(80) + '\n');

        return {
            success: true,
            totalChecked: syncStats.totalChecked,
            totalCorrected: syncStats.totalCorrected,
            duration: duration,
            errorCount: syncStats.errors.length
        };

    } catch (err) {
        console.error('[FileCountSync] Fatal error:', err);
        syncStats.lastError = err.message;
        return { success: false, error: err.message };
    }
}

/**
 * Start the background sync job
 * Runs every 5 minutes (detects deleted files quickly)
 */
function startFileCountSyncJob(supabase, rcloneStorage) {
    console.log('[FileCountSync] Initializing background sync job (every 5 minutes)...');

    // Run immediately on startup
    console.log('[FileCountSync] Running initial sync...');
    runFileCountSync(supabase, rcloneStorage).catch(err => console.error('[FileCountSync] Initial run error:', err));

    // Then run every 5 minutes (was 30 minutes, decreased for faster sync detection)
    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const timer = setInterval(() => {
        console.log('[FileCountSync] Running periodic sync...');
        runFileCountSync(supabase, rcloneStorage).catch(err => console.error('[FileCountSync] Periodic run error:', err));
    }, SYNC_INTERVAL);

    return { timer, stats: syncStats };
}

/**
 * Get sync job statistics
 */
function getSyncStats() {
    return syncStats;
}

module.exports = {
    runFileCountSync,
    startFileCountSyncJob,
    getSyncStats,
    verifySingleInvoice
};
