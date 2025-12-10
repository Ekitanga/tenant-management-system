const db = require('./database');

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lease_id INTEGER,
    tenant_id INTEGER,
    amount REAL,
    due_date TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    invoice_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lease_id) REFERENCES leases(id),
    FOREIGN KEY(tenant_id) REFERENCES tenants(id)
  )
`);

console.log('✅ Invoices table created successfully!');