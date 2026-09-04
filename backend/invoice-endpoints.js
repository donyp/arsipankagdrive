// ============================================================
// Invoice System API Endpoints
// Handles Excel upload, invoice list, PDF upload, and matching
// ============================================================

// Check if required modules are available
let multer, uuid, parseExcel, validateData, upload;
const path = require('path');
const fs = require('fs');

try {
    multer = require('multer');
    uuid = require('uuid');
    const excelParser = require('./excel-parser');
    parseExcel = excelParser.parseExcel;
    validateData = excelParser.validateData;
    
    // Configure multer for file uploads - ONLY if multer loaded successfully
    const storage = multer.memoryStorage();
    upload = multer({
        storage: storage,
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB max
        },
        fileFilter: (req, file, cb) => {
            if (req.path.includes('upload-excel')) {
                // Excel files only
                const allowedExts = ['.xls', '.xlsx'];
                const ext = path.extname(file.originalname).toLowerCase();
                if (allowedExts.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
                }
            } else if (req.path.includes('upload-pdf')) {
                // PDF files only
                if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only PDF files are allowed'));
                }
            } else {
                cb(null, true);
            }
        }
    });
} catch (err) {
    console.error('[Invoice Endpoints] âŒ Missing dependencies:', err.message);
    console.error('[Invoice Endpoints] Required: multer, uuid, xlsx');
    console.error('[Invoice Endpoints] Run: npm install multer uuid xlsx');
    multer = null;
    uuid = null;
    parseExcel = null;
    validateData = null;
    upload = null;
}

/**
 * Register all invoice endpoints
 */
function registerInvoiceEndpoints(app, supabase, createAuth, RcloneStorage) {
    
    // Check if dependencies are loaded
    if (!multer || !uuid || !parseExcel) {
        console.error('[Invoice Endpoints] âš ï¸  Dependencies not loaded. Invoice endpoints will NOT be registered.');
        console.error('[Invoice Endpoints] Required modules: uuid, xlsx, multer');
        console.error('[Invoice Endpoints] Please run: npm install');
        return;
    }
    
    const { v4: uuidv4 } = uuid;
    
    // createAuth is already a factory from server.js that returns [authenticateToken, authorizeRole(...roles)]
    // Use it directly - no need to wrap again
    
    // ============================================
    // GET /api/invoice/health - Test endpoint
    // ============================================
    app.get('/api/invoice/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // ============================================
    // POST /api/invoice/populate-zona-ids
    // Populate zona_id for invoices that don't have it
    // Admin only - repair migration
    // ============================================
    app.post('/api/invoice/populate-zona-ids', createAuth(['super_admin', 'moderator']), async (req, res) => {
        try {
            console.log('[Invoice API] Populating zona_id for invoices...');
            
            // Get all invoices without zona_id
            const { data: invoicesWithoutZona, error: fetchError } = await supabase
                .from('invoice_file_list')
                .select('id, toko')
                .is('zona_id', null);
            
            if (fetchError) {
                console.error('[Invoice API] Error fetching invoices:', fetchError);
                return res.status(500).json({ error: 'Failed to fetch invoices', details: fetchError.message });
            }
            
            console.log(`[Invoice API] Found ${invoicesWithoutZona?.length || 0} invoices without zona_id`);
            
            if (!invoicesWithoutZona || invoicesWithoutZona.length === 0) {
                return res.json({
                    success: true,
                    message: 'All invoices already have zona_id populated',
                    updated: 0
                });
            }
            
            // Populate zona_id from toko table
            let updated = 0;
            let failed = 0;
            
            for (const inv of invoicesWithoutZona) {
                try {
                    // Look up zona_id from toko name
                    const { data: tokoData, error: tokoError } = await supabase
                        .from('toko')
                        .select('id, zona_id')
                        .eq('nama', inv.toko)
                        .maybeSingle();
                    
                    if (tokoError) {
                        console.error(`[Invoice API] Error looking up toko "${inv.toko}":`, tokoError);
                        failed++;
                        continue;
                    }
                    
                    if (tokoData && tokoData.zona_id) {
                        // Update invoice with zona_id
                        const { error: updateError } = await supabase
                            .from('invoice_file_list')
                            .update({ 
                                zona_id: tokoData.zona_id,
                                toko_id: tokoData.id
                            })
                            .eq('id', inv.id);
                        
                        if (updateError) {
                            console.error(`[Invoice API] Error updating invoice ${inv.id}:`, updateError);
                            failed++;
                        } else {
                            updated++;
                            if (updated % 10 === 0) {
                                console.log(`[Invoice API] Progress: ${updated} updated...`);
                            }
                        }
                    } else {
                        console.warn(`[Invoice API] Could not find zona_id for toko: "${inv.toko}"`);
                        failed++;
                    }
                } catch (err) {
                    console.error(`[Invoice API] Error processing invoice ${inv.id}:`, err);
                    failed++;
                }
            }
            
            console.log(`[Invoice API] ✅ Zona ID population complete: ${updated} updated, ${failed} failed`);
            
            res.json({
                success: true,
                message: `Updated ${updated} invoices with zona_id`,
                updated,
                failed,
                total: invoicesWithoutZona.length
            });
            
        } catch (error) {
            console.error('[Invoice API] Populate zona error:', error);
            res.status(500).json({ error: 'Server error', details: error.message });
        }
    });
    
    // ============================================
    // POST /api/invoice/upload-excel-data
    // Upload pre-parsed Excel data (from frontend validation)
    // RESTRICTED: super_admin & moderator only
    // ============================================
    app.post('/api/invoice/upload-excel-data',
        ...createAuth(['super_admin', 'moderator']),
        async (req, res) => {
            try {
                const { filename, data, summary } = req.body;
                
                console.log(`[Invoice API] Excel data upload by ${req.user?.name} (ID: ${req.user?.id})`);
                console.log(`[Invoice API] Received ${data?.length || 0} pre-parsed rows`);
                console.log(`[Invoice API] User authenticated:`, !!req.user);
                
                if (!data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({ 
                        error: 'No data provided',
                        details: 'Data array is empty or invalid'
                    });
                }
                
                // Create batch record
                const batchId = uuidv4();
                const { error: batchError } = await supabase
                    .from('excel_upload_batches')
                    .insert({
                        id: batchId,
                        filename: filename,
                        total_rows: data.length,
                        processed_rows: 0,
                        failed_rows: 0,
                        duplicate_rows: 0,
                        uploaded_by: req.user.id,
                        status: 'processing'
                    });
                
                if (batchError) {
                    console.error('[Invoice API] Error creating batch:', batchError);
                    // Continue anyway, batch is optional
                }
                
                // DEBUG: Log first few rows to check data structure
                console.log('[Invoice API] Raw data sample (first 3):');
                data.slice(0, 3).forEach((row, idx) => {
                    console.log(`  Row ${idx}:`, row);
                });
                
                // BULK CHECK: Get all existing fakturs in one query
                const fakturs = data.map(item => item.faktur).filter(Boolean);
                console.log(`[Invoice API] Checking ${fakturs.length} fakturs for duplicates...`);
                console.log(`[Invoice API] Sample fakturs:`, fakturs.slice(0, 5));
                
                if (fakturs.length === 0) {
                    console.warn('[Invoice API] ⚠️ WARNING: No fakturs found in data!');
                }
                
                const { data: existingInvoices } = await supabase
                    .from('invoice_file_list')
                    .select('faktur')
                    .in('faktur', fakturs);
                
                const existingFakturs = new Set((existingInvoices || []).map(inv => inv.faktur));
                console.log(`[Invoice API] Found ${existingFakturs.size} existing fakturs`);
                console.log(`[Invoice API] Sample existing:`, Array.from(existingFakturs).slice(0, 5));
                
                // BULK INSERT: Insert all invoices one-by-one to handle duplicates
                const invoicesToInsert = await Promise.all(data.map(async (item) => {
                    // Parse date string (DD-MM-YYYY format from Excel) to ISO date
                    let tanggalDate = null;
                    if (item.tanggal) {
                        try {
                            const [day, month, year] = item.tanggal.toString().split('-');
                            if (day && month && year) {
                                tanggalDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            }
                        } catch (e) {
                            console.warn(`[Invoice API] Could not parse date for faktur ${item.faktur}:`, item.tanggal);
                        }
                    }
                    
                    // Look up zona_id from konsumen name (actual store name in toko table)
                    // Use case-insensitive and trimmed matching to handle various formats
                    let zona_id = null;
                    if (item.konsumen) {
                        const konsumenLower = item.konsumen.trim().toLowerCase();
                        
                        // Get all toko records and do client-side case-insensitive matching
                        const { data: allToko } = await supabase
                            .from('toko')
                            .select('nama, zona_id');
                        
                        if (allToko) {
                            const match = allToko.find(t => 
                                t.nama.trim().toLowerCase() === konsumenLower
                            );
                            
                            if (match && match.zona_id) {
                                zona_id = match.zona_id;
                                console.log(`[Invoice API] Mapped konsumen "${item.konsumen}" (${konsumenLower}) to zona_id ${zona_id} via toko "${match.nama}"`);
                            } else {
                                console.warn(`[Invoice API] Could not find zona_id for konsumen: "${item.konsumen}" (${konsumenLower}). Available toko: ${allToko.map(t => t.nama).slice(0,5).join(', ')}...`);
                            }
                        }
                    }
                    
                    return {
                        tanggal: tanggalDate || new Date().toISOString().split('T')[0], // Fallback to today if parse fails
                        toko: item.toko,
                        zona_id: zona_id,  // ADD ZONA_ID!
                        faktur: item.faktur,
                        metode_bayar: item.metode_bayar,
                        jenis_transaksi: item.jenis_transaksi,
                        konsumen: item.konsumen,
                        keterangan: item.keterangan,
                        total_jumlah_jual: parseFloat(item.total_jumlah_jual) || 0,
                        item_count: parseInt(item.item_count) || 1,
                        status: 'PENDING',
                        excel_batch_id: batchId,
                        excel_uploaded_at: new Date().toISOString(),
                        excel_uploaded_by: req.user.id
                    };
                }));
                
                let processedCount = 0;
                let duplicateCount = 0;  // RESET THIS!
                let failedCount = 0;
                const errors = [];
                
                // BULK INSERT - one shot, let DB handle duplicates via constraint
                if (invoicesToInsert.length > 0) {
                    console.log('[Invoice API] Bulk inserting', invoicesToInsert.length, 'invoices...');
                    
                    const { data: inserted, error: insertError } = await supabase
                        .from('invoice_file_list')
                        .insert(invoicesToInsert);
                    
                    if (insertError) {
                        // There IS an error
                        console.error('[Invoice API] ❌ INSERT ERROR DETAILS:');
                        console.error('  Code:', insertError.code);
                        console.error('  Message:', insertError.message);
                        console.error('  Details:', insertError.details);
                        console.error('  Full:', JSON.stringify(insertError, null, 2));
                        
                        if (insertError.code === '23505') {
                            // Duplicate key constraint - expected on re-upload
                            processedCount = 0;
                            duplicateCount = invoicesToInsert.length;
                            console.log('[Invoice API] ℹ️ All rows were duplicates (expected on re-upload)');
                        } else {
                            // Real error - something went wrong
                            failedCount = invoicesToInsert.length;
                            errors.push(`Bulk insert failed: ${insertError.message}`);
                            console.error('[Invoice API] Real error - not duplicate key');
                        }
                    } else {
                        // NO ERROR = SUCCESS!
                        processedCount = invoicesToInsert.length;
                        duplicateCount = 0;
                        failedCount = 0;
                        console.log(`[Invoice API] ✅ Successfully inserted ${processedCount} invoices`);
                    }
                } else {
                    console.warn('[Invoice API] No invoices to insert');
                }
                
                // Update batch
                await supabase
                    .from('excel_upload_batches')
                    .update({
                        processed_rows: processedCount,
                        failed_rows: failedCount,
                        duplicate_rows: duplicateCount,
                        status: failedCount > 0 ? 'completed_with_errors' : 'completed'
                    })
                    .eq('id', batchId);
                
                res.json({
                    success: true,
                    batchId,
                    summary: {
                        totalReceived: data.length,
                        processed: processedCount,
                        duplicates: duplicateCount,
                        failed: failedCount
                    }
                });
                
            } catch (error) {
                console.error('[Invoice API] Upload data error:', error);
                res.status(500).json({ error: 'Server error', details: error.message });
            }
        }
    );

    // ============================================
    // POST /api/invoice/upload-excel
    // Upload and parse Excel file (REKAP_LABA.xls)
    // ============================================
    // TEST ENDPOINT - just capture file without parsing (NO AUTH for debugging)
    app.post('/api/invoice/test-upload', 
        upload.single('excel'),
        async (req, res) => {
            try {
                console.log('[TEST] File received:');
                console.log('[TEST] Name:', req.file?.originalname);
                console.log('[TEST] Size:', req.file?.size);
                console.log('[TEST] Mime:', req.file?.mimetype);
                console.log('[TEST] Buffer length:', req.file?.buffer?.length);
                console.log('[TEST] Buffer type:', typeof req.file?.buffer);
                console.log('[TEST] Is Buffer:', Buffer.isBuffer(req.file?.buffer));
                
                // Try to log first 100 bytes as hex
                if (req.file?.buffer && req.file.buffer.length > 0) {
                    const hex = req.file.buffer.slice(0, 100).toString('hex');
                    console.log('[TEST] First 100 bytes (hex):', hex);
                }
                
                res.json({
                    received: true,
                    file: {
                        name: req.file?.originalname,
                        size: req.file?.size,
                        bufferLength: req.file?.buffer?.length,
                        isBuffer: Buffer.isBuffer(req.file?.buffer)
                    }
                });
            } catch (err) {
                console.error('[TEST] Error:', err);
                res.status(500).json({ error: err.message });
            }
        }
    );

    app.post('/api/invoice/upload-excel', 
        ...createAuth(['super_admin', 'moderator']),
        upload.single('excel'),
        async (req, res) => {
            console.log('[Invoice API] Upload endpoint hit');
            
            try {
                if (!req.file) {
                    console.error('[Invoice API] No file');
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                
                console.log(`[Invoice API] Excel upload by ${req.user?.name}: ${req.file.originalname}`);
                console.log(`[Invoice API] File size: ${req.file.size} bytes`);
                
                // Parse Excel
                console.log('[Invoice API] Calling parseExcel()...');
                const parseResult = parseExcel(req.file.buffer);
                console.log('[Invoice API] parseExcel returned:', parseResult.success ? 'SUCCESS' : 'FAILED');
                
                if (!parseResult.success) {
                    console.error('[Invoice API] Parse failed:', parseResult.error);
                    return res.status(400).json({ 
                        error: 'Failed to parse Excel file',
                        details: parseResult.error
                    });
                }
                
                console.log('[Invoice API] Parsed data count:', parseResult.data.length);
                
                // Validate data
                const validation = validateData(parseResult.data);
                if (!validation.isValid) {
                    console.error('[Invoice API] Validation errors:', validation.errors);
                    return res.status(400).json({
                        error: 'Data validation failed',
                        details: 'Silakan cek format Excel Anda',
                        errors: validation.errors.slice(0, 15),
                        totalErrors: validation.errors.length
                    });
                }
                
                // Create batch record
                const batchId = uuidv4();
                const { data: batch, error: batchError } = await supabase
                    .from('excel_upload_batches')
                    .insert({
                        id: batchId,
                        filename: req.file.originalname,
                        total_rows: parseResult.summary.totalRows,
                        processed_rows: 0,
                        failed_rows: 0,
                        duplicate_rows: 0,
                        uploaded_by: req.user.id,
                        status: 'processing'
                    })
                    .select()
                    .single();
                
                if (batchError) {
                    console.error('[Invoice API] Error creating batch:', batchError);
                    return res.status(500).json({ error: 'Failed to create batch record' });
                }
                
                console.log('[Invoice API] Batch created:', batchId);
                
                // Insert invoices
                let processedCount = 0;
                let duplicateCount = 0;
                let failedCount = 0;
                const errors = [];
                
                for (const item of parseResult.data) {
                    try {
                        // Check if faktur already exists
                        const { data: existing } = await supabase
                            .from('invoice_file_list')
                            .select('id, faktur')
                            .eq('faktur', item.faktur)
                            .single();
                        
                        if (existing) {
                            duplicateCount++;
                            console.log(`[Invoice API] Duplicate faktur: ${item.faktur}`);
                            continue;
                        }
                        
                        // Insert new invoice
                        const { error: insertError } = await supabase
                            .from('invoice_file_list')
                            .insert({
                                tanggal: item.tanggal_formatted,
                                toko: item.toko,
                                toko_raw: item.toko_raw,
                                faktur: item.faktur,
                                metode_bayar: item.metode_bayar,
                                jenis_transaksi: item.jenis_transaksi,
                                konsumen: item.konsumen,
                                keterangan: item.keterangan,
                                total_jumlah_jual: item.total_jumlah_jual,
                                item_count: item.item_count,
                                status: 'PENDING',
                                excel_batch_id: batchId,
                                excel_uploaded_at: new Date().toISOString(),
                                excel_uploaded_by: req.user.id
                            });
                        
                        if (insertError) {
                            failedCount++;
                            errors.push(`${item.faktur}: ${insertError.message}`);
                            console.error(`[Invoice API] Error inserting ${item.faktur}:`, insertError);
                        } else {
                            processedCount++;
                        }
                        
                    } catch (err) {
                        failedCount++;
                        errors.push(`${item.faktur}: ${err.message}`);
                        console.error(`[Invoice API] Error processing ${item.faktur}:`, err);
                    }
                }
                
                // Update batch status
                await supabase
                    .from('excel_upload_batches')
                    .update({
                        processed_rows: processedCount,
                        failed_rows: failedCount,
                        duplicate_rows: duplicateCount,
                        status: failedCount > 0 ? 'completed_with_errors' : 'completed',
                        error_log: errors.length > 0 ? errors.join('\n') : null
                    })
                    .eq('id', batchId);
                
                // Log to audit
                await supabase.from('audit_logs').insert({
                    user_id: req.user.id,
                    action: 'upload_excel',
                    context: `Uploaded ${req.file.originalname}: ${processedCount} processed, ${duplicateCount} duplicates, ${failedCount} failed`
                });
                
                console.log('[Invoice API] Upload complete:', {
                    processed: processedCount,
                    duplicates: duplicateCount,
                    failed: failedCount
                });
                
                res.json({
                    success: true,
                    batchId,
                    summary: {
                        totalRows: parseResult.summary.totalRows,
                        uniqueFakturs: parseResult.summary.uniqueFakturs,
                        processed: processedCount,
                        duplicates: duplicateCount,
                        failed: failedCount,
                        errors: errors.slice(0, 10)
                    }
                });
                
            } catch (error) {
                console.error('[Invoice API] Upload error:', error);
                return res.status(500).json({ 
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    );
    
    // ============================================
    // GET /api/invoice/list
    // Get invoice file list with filters
    // ============================================
    app.get('/api/invoice/list', createAuth(), async (req, res) => {
        try {
            const { 
                status, 
                toko, 
                keterangan,
                date_from,
                date_to,
                search,
                limit = 100,
                offset = 0
            } = req.query;
            
            let query = supabase
                .from('invoice_file_list')
                .select('*', { count: 'exact' });
            
            // Auto-filter by zona for admin_zona users
            if (req.user && req.user.role === 'admin_zona' && req.user.zona_id) {
                console.log(`[Invoice List] Filtering for admin_zona with zona_id: ${req.user.zona_id}`);
                query = query.eq('zona_id', req.user.zona_id);
            } else if (req.user) {
                console.log(`[Invoice List] User role: ${req.user.role}, zona_id: ${req.user.zona_id}`);
            }
            
            // Apply filters
            if (status) {
                query = query.eq('status', status);
            }
            
            if (toko) {
                query = query.eq('toko', toko);
            }
            
            if (keterangan) {
                query = query.eq('keterangan', keterangan);
            }
            
            if (date_from) {
                query = query.gte('tanggal', date_from);
            }
            
            if (date_to) {
                query = query.lte('tanggal', date_to);
            }
            
            if (search) {
                query = query.or(`faktur.ilike.%${search}%,konsumen.ilike.%${search}%`);
            }
            
            // Order by date desc
            query = query
                .order('tanggal', { ascending: false })
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
            
            const { data, error, count } = await query;
            
            if (error) {
                console.error('[Invoice API] Error fetching list:', error);
                console.error('[Invoice API] Error details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                return res.status(500).json({ error: 'Failed to fetch invoice list', details: error.message });
            }
            
            console.log(`[Invoice List] Returned ${data?.length || 0} invoices (total: ${count})`);
            
            res.json({
                success: true,
                data,
                count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
        } catch (error) {
            console.error('[Invoice API] List error:', error);
            console.error('[Invoice API] Stack:', error.stack);
            res.status(500).json({ error: 'Server error', details: error.message });
        }
    });
    
    // ============================================
    // GET /api/invoice/zona/:zonaId/summary
    // Get toko summary for a specific zona
    // ============================================
    app.get('/api/invoice/zona/:zonaId/summary', createAuth(), async (req, res) => {
        try {
            const zonaId = req.params.zonaId;
            
            // Fetch invoices for this zona
            const { data: invoices, error } = await supabase
                .from('invoice_file_list')
                .select('*')
                .eq('zona_id', zonaId);
            
            if (error) {
                console.error('[Invoice API] Error fetching zona summary:', error);
                return res.status(500).json({ error: 'Failed to fetch zona summary' });
            }
            
            // Aggregate by toko
            const tokoStats = {};
            invoices.forEach(inv => {
                if (!tokoStats[inv.toko]) {
                    tokoStats[inv.toko] = {
                        toko: inv.toko,
                        total: 0,
                        pending: 0,
                        uploaded: 0,
                        missing: 0,
                        total_nominal: 0,
                        latest_date: null
                    };
                }
                tokoStats[inv.toko].total++;
                tokoStats[inv.toko][inv.status?.toLowerCase() || 'missing']++;
                tokoStats[inv.toko].total_nominal += inv.total_jumlah_jual || 0;
                
                if (!tokoStats[inv.toko].latest_date || inv.tanggal > tokoStats[inv.toko].latest_date) {
                    tokoStats[inv.toko].latest_date = inv.tanggal;
                }
            });
            
            const summary = Object.values(tokoStats).sort((a, b) => b.total - a.total);
            
            console.log(`[Invoice API] Zona ${zonaId} summary: ${summary.length} toko, ${invoices.length} total invoices`);
            
            res.json({
                success: true,
                zona_id: zonaId,
                total_invoices: invoices.length,
                total_toko: summary.length,
                toko_summary: summary
            });
            
        } catch (error) {
            console.error('[Invoice API] Zona summary error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
    
    // ============================================
    // Get invoice statistics
    // ============================================
    app.get('/api/invoice/stats', createAuth(), async (req, res) => {
        try {
            const { data, error } = await supabase
                .rpc('get_invoice_statistics');
            
            if (error) {
                console.error('[Invoice API] Error fetching stats:', error);
                return res.status(500).json({ error: 'Failed to fetch statistics' });
            }
            
            res.json({
                success: true,
                stats: data[0] || {}
            });
            
        } catch (error) {
            console.error('[Invoice API] Stats error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
    
    // ============================================
    // GET /api/invoice/batches
    // Get list of Excel upload batches
    // ============================================
    app.get('/api/invoice/batches', 
        ...createAuth(['super_admin', 'moderator']),
        async (req, res) => {
            try {
                const { limit = 50, offset = 0 } = req.query;
                
                const { data, error, count } = await supabase
                    .from('excel_upload_batches')
                    .select(`
                        *,
                        uploader:uploaded_by(name, email)
                    `, { count: 'exact' })
                    .neq('status', 'deleted')
                    .order('created_at', { ascending: false })
                    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
                
                if (error) {
                    console.error('[Invoice API] Batches error:', error);
                    return res.status(500).json({ error: 'Failed to fetch batches' });
                }
                
                res.json({
                    success: true,
                    data,
                    count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                });
                
            } catch (error) {
                console.error('[Invoice API] Batches error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
    

    // ============================================
    // DELETE /api/invoice/:faktur
    // Delete invoice from list
    // ============================================
    app.delete('/api/invoice/:faktur', 
        ...createAuth(['super_admin']),
        async (req, res) => {
            try {
                const { faktur } = req.params;
                
                const { error } = await supabase
                    .from('invoice_file_list')
                    .delete()
                    .eq('faktur', faktur);
                
                if (error) {
                    console.error('[Invoice API] Delete error:', error);
                    return res.status(500).json({ error: 'Failed to delete invoice' });
                }
                
                // Log to audit
                await supabase.from('audit_logs').insert({
                    user_id: req.user.id,
                    action: 'delete_invoice',
                    context: `Deleted invoice ${faktur}`
                });
                
                res.json({ success: true });
                
            } catch (error) {
                console.error('[Invoice API] Delete error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
    
    // ============================================
    // DELETE /api/invoice/batch/:batchId
    // Delete all invoices from a batch upload
    // ============================================
    app.delete('/api/invoice/batch/:batchId',
        ...createAuth(['super_admin', 'moderator']),
        async (req, res) => {
            try {
                const { batchId } = req.params;
                
                // Get batch info first
                const { data: batch, error: batchError } = await supabase
                    .from('excel_upload_batches')
                    .select('*')
                    .eq('id', batchId)
                    .single();
                
                if (batchError || !batch) {
                    return res.status(404).json({ error: 'Batch not found' });
                }
                
                // Count invoices in this batch
                const { count, error: countError } = await supabase
                    .from('invoice_file_list')
                    .select('*', { count: 'exact', head: true })
                    .eq('excel_batch_id', batchId);
                
                if (countError) {
                    console.error('[Invoice API] Count error:', countError);
                    return res.status(500).json({ error: 'Failed to count invoices' });
                }
                
                // Delete all invoices from this batch
                const { error: deleteError } = await supabase
                    .from('invoice_file_list')
                    .delete()
                    .eq('excel_batch_id', batchId);
                
                if (deleteError) {
                    console.error('[Invoice API] Batch delete error:', deleteError);
                    return res.status(500).json({ error: 'Failed to delete batch invoices' });
                }
                
                // Update batch status
                await supabase
                    .from('excel_upload_batches')
                    .update({ 
                        status: 'deleted',
                        error_log: `Deleted by ${req.user.name} at ${new Date().toISOString()}`
                    })
                    .eq('id', batchId);
                
                // Log to audit
                await supabase.from('audit_logs').insert({
                    user_id: req.user.id,
                    action: 'delete_invoice_batch',
                    context: `Deleted batch ${batch.filename} with ${count} invoices`
                });
                
                res.json({ 
                    success: true,
                    deletedCount: count,
                    batchFilename: batch.filename
                });
                
            } catch (error) {
                console.error('[Invoice API] Batch delete error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
    
    // ============================================
    // PATCH /api/invoice/:faktur/status
    // Manually update invoice status
    // ============================================
    app.patch('/api/invoice/:faktur/status',
        ...createAuth(['super_admin', 'moderator']),
        async (req, res) => {
            try {
                const { faktur } = req.params;
                const { status } = req.body;
                
                const validStatuses = ['PENDING', 'UPLOADED', 'MISSING'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ 
                        error: 'Invalid status',
                        validStatuses
                    });
                }
                
                const { error } = await supabase
                    .from('invoice_file_list')
                    .update({ status })
                    .eq('faktur', faktur);
                
                if (error) {
                    console.error('[Invoice API] Status update error:', error);
                    return res.status(500).json({ error: 'Failed to update status' });
                }
                
                // Log to audit
                await supabase.from('audit_logs').insert({
                    user_id: req.user.id,
                    action: 'update_invoice_status',
                    context: `Changed status of ${faktur} to ${status}`
                });
                
                res.json({ success: true });
                
            } catch (error) {
                console.error('[Invoice API] Status update error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );

    // ============================================
    // GET /api/invoice/check-faktur/:faktur
    // Check if faktur exists in daftar invoice
    // ============================================
    app.get('/api/invoice/check-faktur/:faktur',
        createAuth(),
        async (req, res) => {
            try {
                const { faktur } = req.params;
                
                if (!faktur) {
                    return res.status(400).json({ error: 'Faktur is required' });
                }
                
                const { data, error } = await supabase
                    .from('invoice_file_list')
                    .select('faktur, status, toko, tanggal, konsumen, total_jumlah_jual')
                    .eq('faktur', faktur)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.error('[Invoice API] Check faktur error:', error);
                    return res.status(500).json({ error: 'Server error' });
                }
                
                // Return result: exists = true if found, false if not
                res.json({
                    exists: !!data,
                    faktur: faktur,
                    data: data || null
                });
                
            } catch (error) {
                console.error('[Invoice API] Check faktur error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );

    // ============================================
    // DELETE /api/invoice/clear-test-data
    // Clear all test invoice data (for development/testing only)
    // ============================================
    app.delete('/api/invoice/clear-test-data',
        createAuth(['super_admin']),
        async (req, res) => {
            try {
                console.log(`[Invoice API] Clearing test data by ${req.user?.name}`);
                
                // Delete all invoices that were uploaded via Excel
                const { data: deleted, error: deleteError } = await supabase
                    .from('invoice_file_list')
                    .delete()
                    .not('excel_batch_id', 'is', null)
                    .select('id');
                
                if (deleteError) {
                    console.error('[Invoice API] Clear test data error:', deleteError);
                    return res.status(500).json({ error: 'Failed to clear data' });
                }
                
                const deletedCount = deleted?.length || 0;
                console.log(`[Invoice API] Deleted ${deletedCount} test invoices`);
                
                // Also clear batch records
                const { error: batchDeleteError } = await supabase
                    .from('excel_upload_batches')
                    .delete()
                    .neq('id', '');
                
                if (batchDeleteError) {
                    console.warn('[Invoice API] Failed to clear batch records:', batchDeleteError);
                }
                
                // Log activity
                await supabase.from('activity_logs').insert({
                    user_id: req.user.id,
                    action: 'clear_test_data',
                    context: `Cleared ${deletedCount} test invoice records`
                });
                
                res.json({ 
                    success: true, 
                    message: `Cleared ${deletedCount} test invoices`
                });
                
            } catch (error) {
                console.error('[Invoice API] Clear test data error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
    
    // ============================================
    // POST /api/invoice/upload-pdf
    // Upload PDF and mark invoice as UPLOADED by matching faktur in filename
    // Filename format: 835100310.pdf or similar
    // ============================================
    app.post('/api/invoice/upload-pdf',
        ...createAuth(['super_admin', 'moderator', 'user']),
        upload.single('pdf'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No PDF file provided' });
                }
                
                const filename = req.file.originalname;
                const fileBuffer = req.file.buffer;
                console.log(`[Invoice PDF] Upload started by ${req.user?.name}`);
                console.log(`[Invoice PDF] Filename: ${filename}`);
                
                // Extract faktur from filename (remove .pdf extension)
                const faktur = path.parse(filename).name; // 835100310.pdf -> 835100310
                console.log(`[Invoice PDF] Extracted faktur: ${faktur}`);
                
                if (!faktur) {
                    return res.status(400).json({ error: 'Cannot extract faktur from filename' });
                }
                
                // Check if invoice exists
                const { data: invoice, error: queryError } = await supabase
                    .from('invoice_file_list')
                    .select('*')
                    .eq('faktur', faktur)
                    .single();
                
                if (queryError || !invoice) {
                    console.warn(`[Invoice PDF] Invoice not found for faktur: ${faktur}`);
                    return res.status(404).json({ error: `Invoice not found for faktur: ${faktur}` });
                }
                
                console.log(`[Invoice PDF] Found invoice: ${invoice.konsumen} (${invoice.toko})`);
                
                // Determine path based on keterangan (PPN/NON PPN)
                const year = invoice.tanggal.split('-')[0];
                const monthNum = String(invoice.tanggal.split('-')[1]).padStart(2, '0');
                const day = String(invoice.tanggal.split('-')[2]).padStart(2, '0');
                
                // Convert month number to Indonesian month name
                const monthNames = [
                    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
                    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
                ];
                const monthName = monthNames[parseInt(monthNum) - 1] || monthNum;
                
                const category = invoice.keterangan === 'PPN' ? 'PPN' : 'NON';
                
                console.log(`[Invoice PDF] Path components - Year: ${year}, Month: ${monthName}, Day: ${day}, Category: ${category}`);
                
                // Upload to Google Drive via RcloneStorage
                let uploadResult = null;
                let remotePath = null;
                try {
                    console.log(`[Invoice PDF] Uploading file buffer (${fileBuffer.length} bytes)`);
                    
                    uploadResult = await RcloneStorage.uploadInvoicePDF(fileBuffer, filename, year, monthName, day, category);
                    
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }
                    
                    remotePath = uploadResult.path;
                    console.log(`[Invoice PDF] ✅ File uploaded to Google Drive: ${remotePath}`);
                } catch (uploadErr) {
                    console.error(`[Invoice PDF] Upload error:`, uploadErr.message);
                    console.error(`[Invoice PDF] Upload error full:`, uploadErr);
                    console.error(`[Invoice PDF] Upload error stack:`, uploadErr.stack);
                    // Continue anyway - update DB even if upload fails, user can retry
                    remotePath = null;
                }
                
                // Update invoice status in database
                const { error: updateError } = await supabase
                    .from('invoice_file_list')
                    .update({
                        status: 'UPLOADED',
                        uploaded_file_path: remotePath,
                        uploaded_at: new Date().toISOString(),
                        uploaded_by: req.user.id
                    })
                    .eq('faktur', faktur);
                
                if (updateError) {
                    console.error('[Invoice PDF] Update error:', updateError);
                    return res.status(500).json({ error: 'Failed to update invoice status' });
                }
                
                console.log(`[Invoice PDF] ✅ Invoice marked as UPLOADED: ${faktur}`);
                
                res.json({
                    success: true,
                    message: `PDF uploaded successfully for faktur: ${faktur}`,
                    faktur,
                    remotePath,
                    konsumen: invoice.konsumen,
                    total: invoice.total_jumlah_jual
                });
                
            } catch (error) {
                console.error('[Invoice PDF] Upload error:', error);
                res.status(500).json({ error: 'Server error', details: error.message });
            }
        }
    );
    
    console.log('[Invoice API] Endpoints registered successfully');
}

module.exports = { registerInvoiceEndpoints };
