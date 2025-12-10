const db = require('./database');

console.log('\n========================================');
console.log('   DATABASE CONTENTS');
console.log('========================================\n');

console.log('\n=== USERS ===');
const users = db.prepare('SELECT id, username, email, role, is_active FROM users').all();
console.table(users);

console.log('\n=== TENANTS ===');
const tenants = db.prepare('SELECT t.*, u.username FROM tenants t JOIN users u ON t.user_id = u.id').all();
console.table(tenants);

console.log('\n=== PROPERTIES ===');
const properties = db.prepare('SELECT * FROM properties').all();
console.table(properties);

console.log('\n=== UNITS ===');
const units = db.prepare('SELECT u.*, p.name as property FROM units u JOIN properties p ON u.property_id = p.id').all();
console.table(units);

console.log('\n=== LEASES ===');
const leases = db.prepare('SELECT l.*, t.full_name as tenant, u.name as unit FROM leases l JOIN tenants t ON l.tenant_id = t.id JOIN units u ON l.unit_id = u.id').all();
console.table(leases);

console.log('\n=== PAYMENTS ===');
const payments = db.prepare('SELECT p.*, t.full_name as tenant FROM payments p JOIN tenants t ON p.tenant_id = t.id ORDER BY payment_date DESC LIMIT 10').all();
console.table(payments);

console.log('\n=== MAINTENANCE REQUESTS ===');
const maintenance = db.prepare('SELECT mr.*, t.full_name as tenant, u.name as unit FROM maintenance_requests mr JOIN tenants t ON mr.tenant_id = t.id JOIN units u ON mr.unit_id = u.id ORDER BY reported_date DESC LIMIT 10').all();
console.table(maintenance);

console.log('\n========================================');
console.log('   END OF DATABASE DUMP');
console.log('========================================\n');

db.close();
