// ============================================================
// SMART NOTIFICATIONS - ADDITIONAL ENDPOINTS
// Add these endpoints to server.js after existing notification endpoints
// ============================================================

/*
// GET /api/notifications/preferences - Get user notification preferences
app.get('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
        let { data: prefs, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', req.user.userId)
            .single();

        // If no preferences exist, create default
        if (!prefs) {
            const { data: newPrefs, error: insertError } = await supabase
                .from('notification_preferences')
                .insert({
                    user_id: req.user.userId,
                    email_enabled: false,
                    email_frequency: 'instant',
                    types_enabled: {
                        update: true,
                        file_upload: true,
                        comment: true,
                        quota: true,
                        maintenance: true,
                        approval: true,
                        share: true,
                        system: true
                    }
                })
                .select()
                .single();

            if (insertError) throw insertError;
            prefs = newPrefs;
        }

        res.json({ preferences: prefs });
    } catch (err) {
        console.error('Get Preferences Error:', err);
        res.status(500).json({ error: 'Gagal memuat preferensi notifikasi.' });
    }
});

// PUT /api/notifications/preferences - Update user notification preferences
app.put('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
        const { email_enabled, email_frequency, types_enabled } = req.body;

        const updateData = {};
        if (typeof email_enabled === 'boolean') updateData.email_enabled = email_enabled;
        if (email_frequency) updateData.email_frequency = email_frequency;
        if (types_enabled) updateData.types_enabled = types_enabled;

        const { data, error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: req.user.userId,
                ...updateData
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await supabase.from('audit_logs').insert({
            user_id: req.user.userId,
            action: 'UPDATE',
            context: 'Memperbarui preferensi notifikasi'
        });

        res.json({ preferences: data, message: 'Preferensi berhasil diperbarui.' });
    } catch (err) {
        console.error('Update Preferences Error:', err);
        res.status(500).json({ error: 'Gagal memperbarui preferensi.' });
    }
});

// GET /api/notifications/unread-count - Get count of unread notifications
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        let orFilter = `user_id.eq.${req.user.userId},and(user_id.is.null,target_role.is.null)`;
        if (req.user.role === 'admin_zona') {
            orFilter += `,and(target_role.eq.admin_zona,target_zona_id.eq.${req.user.zona_id})`;
        } else {
            orFilter += `,target_role.eq.${req.user.role}`;
        }

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false)
            .or(orFilter);

        if (error) throw error;

        res.json({ count: count || 0 });
    } catch (err) {
        console.error('Unread Count Error:', err);
        res.status(500).json({ error: 'Gagal memuat jumlah notifikasi.' });
    }
});

// GET /api/notifications/by-type/:type - Get notifications filtered by type
app.get('/api/notifications/by-type/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['update', 'file_upload', 'comment', 'quota', 'maintenance', 'approval', 'share', 'system'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid notification type.' });
        }

        let orFilter = `user_id.eq.${req.user.userId},and(user_id.is.null,target_role.is.null)`;
        if (req.user.role === 'admin_zona') {
            orFilter += `,and(target_role.eq.admin_zona,target_zona_id.eq.${req.user.zona_id})`;
        } else {
            orFilter += `,target_role.eq.${req.user.role}`;
        }

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('type', type)
            .or(orFilter)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ notifications: data || [] });
    } catch (err) {
        console.error('Get By Type Error:', err);
        res.status(500).json({ error: 'Gagal memuat notifikasi.' });
    }
});

// DELETE /api/notifications/:id - Delete a notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Only allow users to delete their own notifications
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.userId);

        if (error) throw error;

        res.json({ success: true, message: 'Notifikasi berhasil dihapus.' });
    } catch (err) {
        console.error('Delete Notification Error:', err);
        res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
    }
});

// DELETE /api/notifications/clear-all - Clear all read notifications
app.delete('/api/notifications/clear-all', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', req.user.userId)
            .eq('is_read', true);

        if (error) throw error;

        res.json({ success: true, message: 'Semua notifikasi yang sudah dibaca berhasil dihapus.' });
    } catch (err) {
        console.error('Clear All Error:', err);
        res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
    }
});

// POST /api/notifications/create - Create notification (admin only)
app.post('/api/notifications/create', authenticateToken, authorizeRole('super_admin', 'moderator'), async (req, res) => {
    try {
        const { user_id, type, title, message, link, icon } = req.body;

        if (!type || !title) {
            return res.status(400).json({ error: 'Type dan title wajib diisi.' });
        }

        const validTypes = ['update', 'file_upload', 'comment', 'quota', 'maintenance', 'approval', 'share', 'system'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid notification type.' });
        }

        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id,
                type,
                title,
                message,
                link,
                icon: icon || '🔔'
            })
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await supabase.from('audit_logs').insert({
            user_id: req.user.userId,
            action: 'CREATE',
            context: `Membuat notifikasi: ${title}`
        });

        res.json({ notification: data, message: 'Notifikasi berhasil dibuat.' });
    } catch (err) {
        console.error('Create Notification Error:', err);
        res.status(500).json({ error: 'Gagal membuat notifikasi.' });
    }
});

// Helper function to create notification programmatically
async function createNotificationForUser({ user_id, type, title, message, link, icon = '🔔' }) {
    try {
        await supabase.from('notifications').insert({
            user_id,
            type,
            title,
            message,
            link,
            icon
        });
    } catch (err) {
        console.error('Create Notification Helper Error:', err);
    }
}

// Helper function to create notification for all users in a zona
async function createNotificationForZona({ zona_id, type, title, message, link, icon = '🔔' }) {
    try {
        // Get all users in the zona
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('zona_id', zona_id);

        if (usersError) throw usersError;

        // Create notification for each user
        const notifications = users.map(user => ({
            user_id: user.id,
            type,
            title,
            message,
            link,
            icon
        }));

        const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (notifError) throw notifError;
    } catch (err) {
        console.error('Create Zona Notification Helper Error:', err);
    }
}

// Export helper functions for use in other parts of the application
module.exports = {
    createNotificationForUser,
    createNotificationForZona
};
*/
