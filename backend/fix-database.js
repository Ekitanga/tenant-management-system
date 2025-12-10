const db = require('./database');

console.log('🔧 Fixing database structure...\n');

try {
  // Check and add missing columns to tenants table
  console.log('📋 Checking tenants table...');
  const tenantsColumns = db.prepare("PRAGMA table_info(tenants)").all();
  const tenantsColumnNames = tenantsColumns.map(col => col.name);
  
  if (!tenantsColumnNames.includes('email')) {
    console.log('  ➕ Adding email column to tenants...');
    db.prepare('ALTER TABLE tenants ADD COLUMN email TEXT').run();
  }
  
  if (!tenantsColumnNames.includes('landlord_id')) {
    console.log('  ➕ Adding landlord_id column to tenants...');
    db.prepare('ALTER TABLE tenants ADD COLUMN landlord_id INTEGER').run();
  }
  
  console.log('  ✅ Tenants table OK\n');

  // Check and add missing columns to expenses table
  console.log('📋 Checking expenses table...');
  const expensesColumns = db.prepare("PRAGMA table_info(expenses)").all();
  const expensesColumnNames = expensesColumns.map(col => col.name);
  
  if (!expensesColumnNames.includes('vendor')) {
    console.log('  ➕ Adding vendor column to expenses...');
    db.prepare('ALTER TABLE expenses ADD COLUMN vendor TEXT').run();
  }
  
  console.log('  ✅ Expenses table OK\n');

  // Check and add missing columns to leases table
  console.log('📋 Checking leases table...');
  const leasesColumns = db.prepare("PRAGMA table_info(leases)").all();
  const leasesColumnNames = leasesColumns.map(col => col.name);
  
  if (!leasesColumnNames.includes('created_at')) {
    console.log('  ➕ Adding created_at column to leases...');
    db.prepare('ALTER TABLE leases ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
  
  if (!leasesColumnNames.includes('updated_at')) {
    console.log('  ➕ Adding updated_at column to leases...');
    db.prepare('ALTER TABLE leases ADD COLUMN updated_at TEXT').run();
  }
  
  console.log('  ✅ Leases table OK\n');

  // Check and add missing columns to payments table
  console.log('📋 Checking payments table...');
  const paymentsColumns = db.prepare("PRAGMA table_info(payments)").all();
  const paymentsColumnNames = paymentsColumns.map(col => col.name);
  
  if (!paymentsColumnNames.includes('created_at')) {
    console.log('  ➕ Adding created_at column to payments...');
    db.prepare('ALTER TABLE payments ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
  
  console.log('  ✅ Payments table OK\n');

  // Check and add missing columns to maintenance_requests table
  console.log('📋 Checking maintenance_requests table...');
  const maintenanceColumns = db.prepare("PRAGMA table_info(maintenance_requests)").all();
  const maintenanceColumnNames = maintenanceColumns.map(col => col.name);
  
  if (!maintenanceColumnNames.includes('reported_date')) {
    console.log('  ➕ Adding reported_date column to maintenance_requests...');
    db.prepare('ALTER TABLE maintenance_requests ADD COLUMN reported_date TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
  
  console.log('  ✅ Maintenance table OK\n');

  // Check and add missing columns to notifications table
  console.log('📋 Checking notifications table...');
  const notificationsColumns = db.prepare("PRAGMA table_info(notifications)").all();
  const notificationsColumnNames = notificationsColumns.map(col => col.name);
  
  if (!notificationsColumnNames.includes('created_at')) {
    console.log('  ➕ Adding created_at column to notifications...');
    db.prepare('ALTER TABLE notifications ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
  
  console.log('  ✅ Notifications table OK\n');

  console.log('✅ Database structure fixed successfully!');
  console.log('🎉 You can now restart the server.\n');

} catch (error) {
  console.error('❌ Error fixing database:', error.message);
  process.exit(1);
}