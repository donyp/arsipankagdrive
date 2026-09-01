// Session Management & Device Tracking Endpoints
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to parse device info
function parseDeviceInfo(req) {
  const parser = new UAParser(req.headers['user-agent']);
  const result = parser.getResult();
  
  return {
    device_name: `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`,
    device_type: result.device.type || (result.os.name?.includes('Android') || result.os.name?.includes('iOS') ? 'mobile' : 'desktop'),
    browser: `${result.browser.name} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name} ${result.os.version || ''}`.trim(),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.headers['user-agent']
  };
}

// Create new session on login
router.post('/sessions/create', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const deviceInfo = parseDeviceInfo(req);
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        ...deviceInfo,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        last_activity: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      session: data,
      sessionToken
    });
    
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session activity
router.post('/sessions/:sessionToken/activity', async (req, res) => {
  try {
    const { sessionToken } = req.params;
    
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        last_activity: new Date().toISOString()
      })
      .eq('session_token', sessionToken)
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Get user's active sessions
router.get('/sessions/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false });
    
    if (error) throw error;
    
    res.json({ sessions: data || [] });
    
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Revoke session (logout from device)
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { revokedBy } = req.body;
    
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy
      })
      .eq('id', sessionId);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Revoke all sessions except current
router.post('/sessions/revoke-others', async (req, res) => {
  try {
    const { userId, currentSessionToken, revokedBy } = req.body;
    
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy
      })
      .eq('user_id', userId)
      .neq('session_token', currentSessionToken)
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Revoke others error:', err);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// Log suspicious activity
router.post('/sessions/suspicious', async (req, res) => {
  try {
    const { 
      userId, 
      activityType, 
      severity, 
      description,
      metadata 
    } = req.body;
    
    const deviceInfo = parseDeviceInfo(req);
    
    const { error } = await supabase
      .from('suspicious_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        severity: severity || 'medium',
        description,
        ip_address: deviceInfo.ip_address,
        metadata: metadata || {}
      });
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Log suspicious activity error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Get suspicious activities (admin only)
router.get('/sessions/suspicious', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suspicious_activities')
      .select(`
        *,
        users:user_id (
          name,
          email,
          role
        )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    res.json({ activities: data || [] });
    
  } catch (err) {
    console.error('Get suspicious activities error:', err);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Resolve suspicious activity
router.patch('/sessions/suspicious/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;
    
    const { error } = await supabase
      .from('suspicious_activities')
      .update({
        is_resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Resolve suspicious activity error:', err);
    res.status(500).json({ error: 'Failed to resolve activity' });
  }
});

// Cleanup expired sessions (run periodically)
router.post('/sessions/cleanup', async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Cleanup sessions error:', err);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

module.exports = router;
