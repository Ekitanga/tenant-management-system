const Database = require('better-sqlite3');
const db = new Database('./database.db');

console.log('📦 Adding M-PESA transactions table...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mpesa_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_request_id TEXT UNIQUE,
      checkout_request_id TEXT UNIQUE,
      lease_id INTEGER,
      tenant_id INTEGER,
      phone_number TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      account_reference TEXT,
      transaction_desc TEXT,
      mpesa_receipt_number TEXT,
      transaction_date DATETIME,
      status TEXT DEFAULT 'pending',
      result_code INTEGER,
      result_desc TEXT,
      callback_received INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lease_id) REFERENCES leases(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  console.log('✅ mpesa_transactions table created successfully!');
  
  // Verify table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mpesa_transactions'").all();
  
  if (tables.length > 0) {
    console.log('✅ Verified: mpesa_transactions table exists');
  } else {
    console.log('❌ Error: Table was not created');
  }

} catch (error) {
  console.error('❌ Error creating table:', error.message);
} finally {
  db.close();
}