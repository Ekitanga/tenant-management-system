const Database = require('better-sqlite3');
const db = new Database('./database.db');

console.log('🔧 Fixing lease dates and statuses...');

// Update lease 15 to active with old start date
db.prepare(`
  UPDATE leases 
  SET status = 'active',
      start_date = '2025-10-01',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 15
`).run();

console.log('✅ Lease 15: Changed to active, start date = 2025-10-01');

// Update unit ZH1 to occupied
db.prepare(`
  UPDATE units 
  SET status = 'occupied'
  WHERE name = 'ZH1'
`).run();

console.log('✅ Unit ZH1: Changed to occupied');

// Delete duplicate pending lease (ID 16)
db.prepare(`DELETE FROM leases WHERE id = 16`).run();
console.log('✅ Lease 16: Deleted (duplicate)');

// ---- FIX FOREIGN KEY ERROR FOR LEASE 18 ----

// Delete payments referencing lease 18
db.prepare(`DELETE FROM payments WHERE lease_id = 18`).run();
console.log('🗑️ Payments linked to Lease 18 deleted');

// Delete invoices referencing lease 18 (if they exist)
try {
  db.prepare(`DELETE FROM invoices WHERE lease_id = 18`).run();
  console.log('🗑️ Invoices linked to Lease 18 deleted');
} catch (e) {
  console.log('ℹ️ No invoices table or no invoices referencing Lease 18');
}

// Now delete lease 18 safely
db.prepare(`DELETE FROM leases WHERE id = 18`).run();
console.log('✅ Lease 18: Deleted (terminated + child records removed)');

console.log('\n✅ All fixes complete!');
console.log('\nRESTART YOUR BACKEND and refresh the frontend.');

db.close();
