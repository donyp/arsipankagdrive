// ============================================================
// WhatsApp Notification Handler
// Generates and manages WhatsApp messages for zona groups
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
 * Generate WhatsApp message template
 * @param {string} zonaName - Zona name (e.g., "Bekasi")
 * @param {number} invoiceCount - Total invoices uploaded
 * @param {array} tokoList - Array of toko names
 * @param {date} uploadDate - Date of upload
 * @returns {string} Formatted WhatsApp message
 */
function generateWAMessage(zonaName, invoiceCount, tokoList, uploadDate) {
    const date = new Date(uploadDate);
    const dateStr = date.toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Remove duplicates and sort
    const uniqueTokos = [...new Set(tokoList)].sort();
    const tokoStr = uniqueTokos.join('\n• ');

    const message = `📦 *NOTIFIKASI UPLOAD INVOICE* 📦

*Zona: ${zonaName}*
📅 Tanggal: ${dateStr}

📊 *RINGKASAN UPLOAD:*
• Total Invoice: *${invoiceCount}*
• Toko yang diupload:
• ${tokoStr}

✅ Invoice sudah tersimpan di sistem Arsip Anka
📥 Silakan login untuk melihat status file

---
*Pusat Arsip Anka - Document Management System*`;

    return message;
}

/**
 * Create WhatsApp notifications for uploaded invoices
 * @param {array} invoices - Array of uploaded invoices with zona_id, toko
 * @param {string} moderatorId - UUID of moderator who uploaded
 * @param {string} batchId - Batch ID from excel upload
 * @returns {array} Created notification records
 */
async function createWANotifications(invoices, moderatorId, batchId) {
    try {
        console.log('[WA-Notifications] Creating messages for', invoices.length, 'invoices');

        const supabase = getSupabaseClient();

        // Group invoices by zona
        const invoicesByZona = {};
        invoices.forEach(inv => {
            if (!invoicesByZona[inv.zona_id]) {
                invoicesByZona[inv.zona_id] = [];
            }
            invoicesByZona[inv.zona_id].push(inv);
        });

        console.log('[WA-Notifications] Grouped into', Object.keys(invoicesByZona).length, 'zonas');

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
        const notifications = [];
        const notificationsToInsert = [];

        for (const [zonaId, invoicesForZona] of Object.entries(invoicesByZona)) {
            const zId = Number(zonaId);
            const zonaName = zonaMap[zId] || `Zona ${zId}`;
            const tokoList = invoicesForZona.map(inv => inv.toko).filter(Boolean);
            const invoiceCount = invoicesForZona.length;

            // Generate message
            const message = generateWAMessage(zonaName, invoiceCount, tokoList, new Date());

            notificationsToInsert.push({
                zona_id: zId,
                moderator_id: moderatorId,
                invoice_count: invoiceCount,
                toko_list: tokoList,
                message: message,
                batch_id: batchId,
                created_at: new Date().toISOString()
            });

            notifications.push({
                zona_id: zId,
                zona_name: zonaName,
                message: message,
                invoice_count: invoiceCount
            });

            console.log(`[WA-Notifications] Created message for zona ${zonaName}: ${invoiceCount} invoices`);
        }

        // Insert into database
        if (notificationsToInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabase
                .from('whatsapp_notifications')
                .insert(notificationsToInsert)
                .select();

            if (insertError) {
                console.error('[WA-Notifications] Insert error:', insertError);
                throw new Error(`Failed to save notifications: ${insertError.message}`);
            }

            console.log('[WA-Notifications] ✅ Saved', inserted.length, 'notifications to database');
        }

        return notifications;
    } catch (error) {
        console.error('[WA-Notifications] Error creating notifications:', error);
        throw error;
    }
}

/**
 * Get pending WhatsApp notifications (not sent yet)
 * @param {string} moderatorId - Optional filter by moderator
 * @returns {array} Pending notifications grouped by zona
 */
async function getPendingNotifications(moderatorId = null) {
    try {
        const supabase = getSupabaseClient();

        let query = supabase
            .from('whatsapp_notifications')
            .select(`
                id,
                zona_id,
                zonas(nama),
                invoice_count,
                toko_list,
                message,
                created_at,
                moderator_id
            `)
            .is('sent_at', null) // Only pending
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

        console.log('[WA-Notifications] Found', data.length, 'pending messages');

        return { count: data.length, notifications: grouped, raw: data };
    } catch (error) {
        console.error('[WA-Notifications] Error fetching pending:', error);
        throw error;
    }
}

/**
 * Mark notification as sent
 * @param {string} notificationId - UUID of notification
 * @returns {object} Updated notification
 */
async function markAsSent(notificationId) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('whatsapp_notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', notificationId)
            .select();

        if (error) {
            throw new Error(`Failed to mark as sent: ${error.message}`);
        }

        console.log('[WA-Notifications] ✅ Marked notification', notificationId, 'as sent');

        return data[0];
    } catch (error) {
        console.error('[WA-Notifications] Error marking as sent:', error);
        throw error;
    }
}

/**
 * Mark all notifications from a batch as sent
 * @param {string} batchId - Batch ID
 * @returns {number} Count of updated records
 */
async function markBatchAsSent(batchId) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('whatsapp_notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('batch_id', batchId)
            .is('sent_at', null)
            .select();

        if (error) {
            throw new Error(`Failed to mark batch as sent: ${error.message}`);
        }

        console.log('[WA-Notifications] ✅ Marked batch', batchId, 'as sent');

        return data ? data.length : 0;
    } catch (error) {
        console.error('[WA-Notifications] Error marking batch as sent:', error);
        throw error;
    }
}

module.exports = {
    generateWAMessage,
    createWANotifications,
    getPendingNotifications,
    markAsSent,
    markBatchAsSent
};
