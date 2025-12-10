-- ============================================================================
-- DATABASE UPDATES FOR LEASE WORKFLOW
-- Run this in your database: sqlite3 database.db < DATABASE-UPDATES.sql
-- ============================================================================

-- Add lease workflow columns
ALTER TABLE leases ADD COLUMN offered_at DATETIME;
ALTER TABLE leases ADD COLUMN tenant_signature BOOLEAN DEFAULT 0;
ALTER TABLE leases ADD COLUMN tenant_signature_name TEXT;
ALTER TABLE leases ADD COLUMN tenant_signed_at DATETIME;
ALTER TABLE leases ADD COLUMN tenant_signature_ip TEXT;
ALTER TABLE leases ADD COLUMN landlord_approved_at DATETIME;
ALTER TABLE leases ADD COLUMN landlord_approved_by INTEGER;
ALTER TABLE leases ADD COLUMN rejection_reason TEXT;
ALTER TABLE leases ADD COLUMN rejected_at DATETIME;
ALTER TABLE leases ADD COLUMN rejected_by INTEGER;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Update existing draft leases to ensure they can be offered
UPDATE leases SET status = 'draft' WHERE status = 'draft';

SELECT 'Database updates completed successfully!' as message;
