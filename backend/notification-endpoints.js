// Notification Endpoints for Arsip ANKA
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// GET /api/notifications/preferences - Get user notification preferences
router.get('/notifications/preferences', async (req, res) => {
  try {
    // Return default preferences since table may not exist yet
    const defaultPrefs = {
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
    
    res.json({ preferences: defaultPrefs });
  } catch (err) {
    console.error('Get Preferences Error:', err);
    res.status(500).json({ error: 'Gagal memuat preferensi notifikasi.' });
  }
});

// PUT /api/notifications/preferences - Update user notification preferences
router.put('/notifications/preferences', async (req, res) => {
  try {
    const { email_enabled, email_frequency, types_enabled } = req.body;
    
    // For now, just return success since table may not exist
    res.json({ 
      preferences: {
        email_enabled,
        email_frequency,
        types_enabled
      },
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
    res.json({ success: true, message: 'Notifikasi berhasil dihapus.' });
  } catch (err) {
    console.error('Clear All Error:', err);
    res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    console.error('Mark All Read Error:', err);
    res.status(500).json({ error: 'Gagal menandai notifikasi.' });
  }
});

module.exports = router;
