// Notification Endpoints for Arsip ANKA
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Helper to extract user from token (simplified - assumes JWT middleware sets req.user)
function getUserFromRequest(req) {
  // This assumes you have JWT middleware that decodes token
  // For now, we'll use a simple approach
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  // In production, decode JWT properly
  // For now, return mock user - you should integrate with your JWT auth
  return { id: 1 }; // Replace with actual JWT decode
}

// GET /api/notifications/preferences - Get user notification preferences
router.get('/notifications/preferences', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // If no preferences exist, create default
    if (!prefs || error) {
      const defaultPrefs = {
        user_id: user.id,
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
      };
      
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();
      
      if (!insertError && newPrefs) {
        return res.json({ preferences: newPrefs });
      }
      
      return res.json({ preferences: defaultPrefs });
    }
    
    res.json({ preferences: prefs });
  } catch (err) {
    console.error('Get Preferences Error:', err);
    res.status(500).json({ error: 'Gagal memuat preferensi notifikasi.' });
  }
});

// PUT /api/notifications/preferences - Update user notification preferences
router.put('/notifications/preferences', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { email_enabled, email_frequency, types_enabled } = req.body;
    
    const updateData = {};
    if (typeof email_enabled === 'boolean') updateData.email_enabled = email_enabled;
    if (email_frequency) updateData.email_frequency = email_frequency;
    if (types_enabled) updateData.types_enabled = types_enabled;
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...updateData,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ 
      preferences: data,
      message: 'Preferensi berhasil disimpan.' 
    });
  } catch (err) {
    console.error('Update Preferences Error:', err);
    res.status(500).json({ error: 'Gagal memperbarui preferensi.' });
  }
});

// DELETE /api/notifications/clear-all - Clear all read notifications
router.delete('/notifications/clear-all', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true);
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Notifikasi berhasil dihapus.' });
  } catch (err) {
    console.error('Clear All Error:', err);
    res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    if (error) throw error;
    
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    console.error('Mark All Read Error:', err);
    res.status(500).json({ error: 'Gagal menandai notifikasi.' });
  }
});

// GET /api/notifications - Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    res.json({ notifications: data || [] });
  } catch (err) {
    console.error('Get Notifications Error:', err);
    res.status(500).json({ error: 'Gagal memuat notifikasi.' });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { id } = req.params;
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark Read Error:', err);
    res.status(500).json({ error: 'Gagal menandai notifikasi.' });
  }
});

// POST /api/notifications/create - Create notification (for system use)
router.post('/notifications/create', async (req, res) => {
  try {
    const { user_id, type, title, message, link, icon } = req.body;
    
    if (!user_id || !type || !title) {
      return res.status(400).json({ error: 'User ID, type, dan title wajib diisi.' });
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
    
    res.json({ notification: data, success: true });
  } catch (err) {
    console.error('Create Notification Error:', err);
    res.status(500).json({ error: 'Gagal membuat notifikasi.' });
  }
});

module.exports = router;

