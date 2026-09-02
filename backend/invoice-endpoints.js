// ============================================================
// Invoice System API Endpoints
// Handles Excel upload, invoice list, PDF upload, and matching
// ============================================================

// Check if required modules are available
let multer, uuid, parseExcel, validateData;
try {
    multer = require('multer');
    uuid = require('uuid');
    const excelParser = require('./excel-parser');
    parseExcel = excelParser.parseExcel;
    validateData = excelParser.validateData;
} catch (err) {
    console.error('[Invoice Endpoints] Missing dependencies:', err.message);
    console.error('[Invoice Endpoints] Please run: npm install uuid xlsx multer');
}

const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
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

/**
 * Register all invoice endpoints
 */
function registerInvoiceEndpoints(app, supabase, authMiddleware, RcloneStorage) {
    
    // Check if dependencies are loaded
    if (!multer || !uuid || !parseExcel) {
        console.error('[Invoice Endpoints] ⚠️  Dependencies not loaded. Invoice endpoints will NOT be registered.');
        console.error('[Invoice Endpoints] Required modules: uuid, xlsx, multer');
        console.error('[Invoice Endpoints] Please run: npm install');
        return;
    }
    
    const { v4: uuidv4 } = uuid;
    
    // ============================================
    // POST /api/invoice/upload-excel
    // Upload and parse Excel file (REKAP_LABA.xls)
    // ============================================
    app.post('/api/invoice/upload-excel', 
        authMiddleware(['super_admin', 'moderator']),
        upload.single('excel'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                
                console.log(`[Invoice API] Excel upload by ${req.user.name}: ${req.file.originalname}`);
                
                // Parse Excel
                const parseResult = parseExcel(req.file.buffer);
                
                if (!parseResult.success) {
                    return res.status(400).json({ 
                        error: 'Failed to parse Excel file',
                        details: parseResult.error
                    });
                }
                
                // Validate data
                const validation = validateData(parseResult.data);
                if (!validation.isValid) {
                    return res.status(400).json({
                        error: 'Data validation failed',
                        errors: validation.errors.slice(0, 10) // First 10 errors
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
                                tanggal: item.tanggal,
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
                console.error('[Invoice API] Upload Excel error:', error);
                res.status(500).json({ 
                    error: 'Server error',
                    details: error.message
                });
            }
        }
    );
    
    // ============================================
    // GET /api/invoice/list
    // Get invoice file list with filters
    // ============================================
    app.get('/api/invoice/list', authMiddleware(), async (req, res) => {
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
                return res.status(500).json({ error: 'Failed to fetch invoice list' });
            }
            
            res.json({
                success: true,
                data,
                count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
        } catch (error) {
            console.error('[Invoice API] List error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
    
    // ============================================
    // GET /api/invoice/stats
    // Get invoice statistics
    // ============================================
    app.get('/api/invoice/stats', authMiddleware(), async (req, res) => {
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
        authMiddleware(['super_admin', 'moderator']),
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
    // POST /api/invoice/upload-pdf
    // Upload PDF and match with faktur
    // ============================================
    app.post('/api/invoice/upload-pdf',
        authMiddleware(),
        upload.single('pdf'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }
                
                const { faktur } = req.body;
                
                if (!faktur) {
                    return res.status(400).json({ error: 'Faktur number is required' });
                }
                
                console.log(`[Invoice API] PDF upload for faktur: ${faktur}`);
                
                // Find invoice in database
                const { data: invoice, error: findError } = await supabase
                    .from('invoice_file_list')
                    .select('*')
                    .eq('faktur', faktur)
                    .single();
                
                if (findError || !invoice) {
                    return res.status(404).json({ 
                        error: 'Faktur not found in invoice list',
                        details: 'Please upload Excel file first or check faktur number'
                    });
                }
                
                // Check if already uploaded
                if (invoice.status === 'UPLOADED') {
                    return res.status(400).json({
                        error: 'Invoice already uploaded',
                        uploaded_at: invoice.uploaded_at,
                        uploaded_file_path: invoice.uploaded_file_path
                    });
                }
                
                // Build Google Drive path
                // Format: /ARSIPINVOICE/YEAR/MONTH/DAY/PPN|NON/faktur.pdf
                const date = new Date(invoice.tanggal);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const category = invoice.keterangan.toUpperCase().includes('PPN') ? 'PPN' : 'NON';
                const filename = `${faktur}.pdf`;
                const storagePath = `/ARSIPINVOICE/${year}/${month}/${day}/${category}/${filename}`;
                
                console.log(`[Invoice API] Uploading to: ${storagePath}`);
                
                // Upload to Google Drive via RcloneStorage
                try {
                    const uploadResult = await RcloneStorage.uploadInvoicePDF(
                        req.file.buffer,
                        filename,
                        year,
                        month,
                        day,
                        category
                    );
                    
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }
                    
                    // Update database
                    const { error: updateError } = await supabase
                        .from('invoice_file_list')
                        .update({
                            status: 'UPLOADED',
                            uploaded_file_path: storagePath,
                            uploaded_at: new Date().toISOString(),
                            uploaded_by: req.user.id
                        })
                        .eq('faktur', faktur);
                    
                    if (updateError) {
                        console.error('[Invoice API] Error updating status:', updateError);
                        return res.status(500).json({ error: 'Failed to update invoice status' });
                    }
                    
                    // Log to audit
                    await supabase.from('audit_logs').insert({
                        user_id: req.user.id,
                        action: 'upload_invoice_pdf',
                        context: `Uploaded PDF for faktur ${faktur} to ${storagePath}`
                    });
                    
                    res.json({
                        success: true,
                        faktur,
                        storagePath,
                        message: 'Invoice PDF uploaded successfully'
                    });
                    
                } catch (uploadError) {
                    console.error('[Invoice API] Upload to GDrive failed:', uploadError);
                    return res.status(500).json({
                        error: 'Failed to upload to Google Drive',
                        details: uploadError.message
                    });
                }
                
            } catch (error) {
                console.error('[Invoice API] Upload PDF error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        }
    );
    
    // ============================================
    // DELETE /api/invoice/:faktur
    // Delete invoice from list
    // ============================================
    app.delete('/api/invoice/:faktur', 
        authMiddleware(['super_admin']),
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
        authMiddleware(['super_admin', 'moderator']),
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
        authMiddleware(['super_admin', 'moderator']),
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
    
    console.log('[Invoice API] Endpoints registered successfully');
}

module.exports = { registerInvoiceEndpoints };
