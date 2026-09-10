// ============================================================
// WhatsApp Invoice Notifications Handler
// Generates per-invoice WhatsApp messages for zona groups
// Format: [PPN/Pajak] [Konsumen] - Nominal
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (lazy, will fail gracefully if credentials missing)
let supabase = null;

function getSupabaseClient() {
    if (supabase) return supabase;
    
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
        throw new Error('Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }
    
    supabase = createClient(url, key);
    return supabase;
}

/**
 * Format currency to Indonesian Rupiah
 * @param {number} nominal - Amount in numbers
 * @returns {string} Formatted string "Rp X.XXX.XXX"
 */
function formatRupiah(nominal) {
    if (!nominal) return 'Rp 0';
    const num = parseInt(nominal) || 0;
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Generate WhatsApp message for single invoice
 * @param {object} invoice - Invoice data {tipe, konsumen, nominal}
 * @returns {string} Formatted message
 */
function generateInvoiceMessage(invoice) {
    const tipe = invoice.tipe || 'PPH';
    const konsumen = invoice.konsumen || 'Unknown';
    const nominal = formatRupiah(invoice.nominal);
    
    return `- [${tipe}] ${konsumen} - ${nominal}`;
}

/**
 * Generate WhatsApp message batch for multiple invoices
 * Combines individual invoices into zone-grouped message
 * @param {array} invoices - Array of invoice objects
 * @param {string} zonaName - Zona name
 * @param {number} zonaId - Zona ID (for message header)
 * @returns {string} Complete WhatsApp message
 */
function generateZonaInvoiceMessage(invoices, zonaName, zonaId) {
    const invoiceLines = invoices.map(inv => generateInvoiceMessage(inv)).join('\n');
    
    // Format: *UPDATE INVOICE ZONA {zonaId}* (no parentheses, no "Zona" prefix in header)
    const message = `*UPDATE INVOICE ZONA ${zonaId}*

${invoiceLines}

_@adminanka_`;

    return message;
}

/**
 * Create WhatsApp notifications for uploaded invoices
 * @param {array} invoices - Array of uploaded invoices {zona_id, tipe, konsumen, nominal}
 * @param {string} moderatorId - UUID of moderator who uploaded
 * @param {string} batchId - Batch ID from upload session
 * @returns {object} Grouped notifications by zona
 */
async function createInvoiceNotifications(invoices, moderatorId, batchId) {
    try {
        console.log('[WA-Invoice] Creating notifications for', invoices.length, 'invoices');

        const supabase = getSupabaseClient();

        // Group invoices by zona
        const invoicesByZona = {};
        invoices.forEach(inv => {
            if (!invoicesByZona[inv.zona_id]) {
                invoicesByZona[inv.zona_id] = [];
            }
            invoicesByZona[inv.zona_id].push(inv);
        });

        console.log('[WA-Invoice] Grouped into', Object.keys(invoicesByZona).length, 'zonas');

        // Get zona names
        const zonaIds = Object.keys(invoicesByZona).map(Number);
        const { data: zonas, error: zonaError } = await supabase
            .from('zonas')
            .select('id, nama')
            .in('id', zonaIds);

        if (zonaError) {
            throw new Error(`Failed to fetch zonas: ${zonaError.message}`);
        }

        const zonaMap = {};
        zonas.forEach(z => {
            zonaMap[z.id] = z.nama;
        });

        // Create notifications per zona
        const notifications = {};
        const notificationsToInsert = [];

        for (const [zonaId, invoicesForZona] of Object.entries(invoicesByZona)) {
            const zId = Number(zonaId);
            const zonaName = zonaMap[zId] || `Zona ${zId}`;
            
            // Generate message for this zona's invoices - format: *UPDATE INVOICE ZONA {zonaId}*
            const message = generateZonaInvoiceMessage(invoicesForZona, zonaName, zId);

            notificationsToInsert.push({
                zona_id: zId,
                moderator_id: moderatorId,
                invoice_count: invoicesForZona.length,
                invoice_details: invoicesForZona, // Store details for reference
                message: message,
                batch_id: batchId,
                notification_type: 'invoice_upload', // Distinguish from excel uploads
                created_at: new Date().toISOString()
            });

            notifications[zonaName] = {
                zona_id: zId,
                zona_name: zonaName,
                message: message,
                invoice_count: invoicesForZona.length,
                invoices: invoicesForZona
            };

            console.log(`[WA-Invoice] Created message for zona ${zonaName}: ${invoicesForZona.length} invoices`);
        }

        // Insert into database
        if (notificationsToInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabase
                .from('whatsapp_invoice_notifications')
                .insert(notificationsToInsert)
                .select();

            if (insertError) {
                console.error('[WA-Invoice] Insert error:', insertError);
                throw new Error(`Failed to save notifications: ${insertError.message}`);
            }

            console.log('[WA-Invoice] ✅ Saved', inserted.length, 'notifications to database');
        }

        return notifications;
    } catch (error) {
        console.error('[WA-Invoice] Error creating notifications:', error);
        throw error;
    }
}

/**
 * Get pending invoice notifications (not sent yet)
 * @param {string} moderatorId - Optional filter by moderator
 * @returns {object} Pending notifications grouped by zona
 */
async function getPendingInvoiceNotifications(moderatorId = null) {
    try {
        const supabase = getSupabaseClient();

        let query = supabase
            .from('whatsapp_invoice_notifications')
            .select(`
                id,
                zona_id,
                zonas(nama),
                invoice_count,
                invoice_details,
                message,
                created_at,
                moderator_id
            `)
            .is('sent_at', null) // Only pending
            .eq('notification_type', 'invoice_upload')
            .order('created_at', { ascending: false });

        if (moderatorId) {
            query = query.eq('moderator_id', moderatorId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch pending notifications: ${error.message}`);
        }

        // Transform response
        const grouped = {};
        data.forEach(notif => {
            const zonaName = notif.zonas.nama;
            if (!grouped[zonaName]) {
                grouped[zonaName] = [];
            }
            grouped[zonaName].push(notif);
        });

        console.log('[WA-Invoice] Found', data.length, 'pending invoice messages');

        return { count: data.length, notifications: grouped, raw: data };
    } catch (error) {
        console.error('[WA-Invoice] Error fetching pending:', error);
        throw error;
    }
}

/**
 * Mark invoice notification as sent
 * @param {string} notificationId - UUID of notification
 * @returns {object} Updated notification
 */
async function markInvoiceAsSent(notificationId) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('whatsapp_invoice_notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', notificationId)
            .select();

        if (error) {
            throw new Error(`Failed to mark as sent: ${error.message}`);
        }

        console.log('[WA-Invoice] ✅ Marked notification', notificationId, 'as sent');

        return data[0];
    } catch (error) {
        console.error('[WA-Invoice] Error marking as sent:', error);
        throw error;
    }
}

/**
 * Mark all invoice notifications from a batch as sent
 * @param {string} batchId - Batch ID
 * @returns {number} Count of updated records
 */
async function markInvoiceBatchAsSent(batchId) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('whatsapp_invoice_notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('batch_id', batchId)
            .eq('notification_type', 'invoice_upload')
            .is('sent_at', null)
            .select();

        if (error) {
            throw new Error(`Failed to mark batch as sent: ${error.message}`);
        }

        console.log('[WA-Invoice] ✅ Marked batch', batchId, 'as sent');

        return data ? data.length : 0;
    } catch (error) {
        console.error('[WA-Invoice] Error marking batch as sent:', error);
        throw error;
    }
}

module.exports = {
    generateInvoiceMessage,
    generateZonaInvoiceMessage,
    createInvoiceNotifications,
    getPendingInvoiceNotifications,
    markInvoiceAsSent,
    markInvoiceBatchAsSent,
    formatRupiah
};
