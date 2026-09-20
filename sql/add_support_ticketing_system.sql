-- ============================================
-- Support Ticketing System Schema (PostgreSQL)
-- ============================================

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    zona_id INTEGER NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    assigned_to UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_zona_id FOREIGN KEY (zona_id) REFERENCES zonas(id) ON DELETE CASCADE,
    CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for support_tickets
CREATE INDEX idx_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_user_id ON support_tickets(user_id);
CREATE INDEX idx_zona_id ON support_tickets(zona_id);
CREATE INDEX idx_status ON support_tickets(status);
CREATE INDEX idx_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_created_at ON support_tickets(created_at);
CREATE INDEX idx_user_zona ON support_tickets(user_id, zona_id);
CREATE INDEX idx_status_zona ON support_tickets(status, zona_id);
CREATE INDEX idx_assigned_status ON support_tickets(assigned_to, status);

-- Support Messages/Replies Table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_ticket_id FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_id_msg FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for support_messages
CREATE INDEX idx_msg_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_msg_user_id ON support_messages(user_id);
CREATE INDEX idx_msg_created_at ON support_messages(created_at);
CREATE INDEX idx_msg_ticket_created ON support_messages(ticket_id, created_at);

-- Support Attachments Table
CREATE TABLE IF NOT EXISTS support_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID,
    message_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_att_ticket_id FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_message_id FOREIGN KEY (message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for support_attachments
CREATE INDEX idx_att_ticket_id ON support_attachments(ticket_id);
CREATE INDEX idx_att_message_id ON support_attachments(message_id);
CREATE INDEX idx_att_uploaded_by ON support_attachments(uploaded_by);

-- Support Ticket Activity Log (optional, for audit trail)
CREATE TABLE IF NOT EXISTS support_ticket_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_activity_ticket_id FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for support_ticket_activity
CREATE INDEX idx_activity_ticket_id ON support_ticket_activity(ticket_id);
CREATE INDEX idx_activity_user_id ON support_ticket_activity(user_id);
CREATE INDEX idx_activity_action ON support_ticket_activity(action);

-- Create trigger to update updated_at timestamp for support_tickets
CREATE OR REPLACE FUNCTION update_support_tickets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER trg_update_support_tickets_timestamp
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_support_tickets_timestamp();

-- Create trigger to update updated_at timestamp for support_messages
CREATE OR REPLACE FUNCTION update_support_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_support_messages_timestamp ON support_messages;
CREATE TRIGGER trg_update_support_messages_timestamp
BEFORE UPDATE ON support_messages
FOR EACH ROW
EXECUTE FUNCTION update_support_messages_timestamp();

