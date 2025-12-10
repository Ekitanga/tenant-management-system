const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'spiraldart.db'));

console.log('🚀 Initializing Spiraldart TMS Database...\n');

db.pragma('foreign_keys = ON');

// Create all tables
console.log('📋 Creating tables...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'landlord', 'tenant')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    landlord_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    rent_amount REAL NOT NULL,
    deposit_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant', 'occupied', 'maintenance')),
    bedrooms INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    id_number TEXT UNIQUE NOT NULL,
    emergency_contact TEXT,
    emergency_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount REAL NOT NULL,
    deposit_amount REAL NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'terminated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    lease_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (lease_id) REFERENCES leases(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date DATE NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in-progress', 'resolved', 'closed')),
    reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_date DATETIME,
    notes TEXT,
    FOREIGN KEY (unit_id) REFERENCES units(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

console.log('✅ Tables created successfully\n');

// Insert sample data
console.log('📝 Inserting sample data...\n');

const hashedPassword = bcrypt.hashSync('admin123', 10);

try {
  // Admin user
  const adminResult = db.prepare(`
    INSERT INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)
  `).run('admin', 'admin@spiraldart.com', hashedPassword, 'admin');
  console.log('✅ Admin user created');

  // Landlord user
  const landlordPassword = bcrypt.hashSync('landlord123', 10);
  const landlordResult = db.prepare(`
    INSERT INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)
  `).run('landlord', 'landlord@spiraldart.com', landlordPassword, 'landlord');
  console.log('✅ Landlord user created');

  // Property
  const propertyResult = db.prepare(`
    INSERT INTO properties (name, location, description, landlord_id)
    VALUES (?, ?, ?, ?)
  `).run('Velvet Haven', 'Tsavo Apartments, Nairobi', 'Modern apartment complex with excellent amenities', landlordResult.lastInsertRowid);
  console.log('✅ Sample property created');

  // Units
  const units = [
    ['1A', 15000, 15000],
    ['1B', 15000, 15000],
    ['2A', 18000, 18000],
    ['2B', 18000, 18000],
    ['3A', 20000, 20000],
    ['3B', 20000, 20000]
  ];

  const insertUnit = db.prepare(`
    INSERT INTO units (property_id, name, rent_amount, deposit_amount, status, bedrooms, bathrooms)
    VALUES (?, ?, ?, ?, 'vacant', ?, ?)
  `);

  units.forEach(([name, rent, deposit]) => {
    const bedrooms = name.startsWith('1') ? 1 : 2;
    insertUnit.run(propertyResult.lastInsertRowid, name, rent, deposit, bedrooms, 1);
  });
  console.log(`✅ ${units.length} units created`);

  // Tenant users
  const tenantPassword = bcrypt.hashSync('tenant123', 10);
  
  const tenant1User = db.prepare(`
    INSERT INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)
  `).run('john.mwangi', 'john@email.com', tenantPassword, 'tenant');

  db.prepare(`
    INSERT INTO tenants (user_id, full_name, phone, id_number, emergency_contact, emergency_phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenant1User.lastInsertRowid, 'John Mwangi', '+254712345678', '12345678', 'Jane Mwangi', '+254723456789');

  const tenant2User = db.prepare(`
    INSERT INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)
  `).run('mary.akinyi', 'mary@email.com', tenantPassword, 'tenant');

  db.prepare(`
    INSERT INTO tenants (user_id, full_name, phone, id_number, emergency_contact, emergency_phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenant2User.lastInsertRowid, 'Mary Akinyi', '+254734567890', '23456789', 'Peter Akinyi', '+254745678901');

  console.log('✅ 2 tenant users created');

} catch (error) {
  console.log('ℹ️  Sample data already exists or error:', error.message);
}

console.log('\n✅ Database initialization completed!\n');
console.log('═══════════════════════════════════════════════');
console.log('📝 DEFAULT LOGIN CREDENTIALS:');
console.log('═══════════════════════════════════════════════');
console.log('Admin:');
console.log('  Username: admin');
console.log('  Password: admin123');
console.log('');
console.log('Landlord:');
console.log('  Username: landlord');
console.log('  Password: landlord123');
console.log('');
console.log('Tenant:');
console.log('  Username: john.mwangi (or mary.akinyi)');
console.log('  Password: tenant123');
console.log('═══════════════════════════════════════════════\n');

db.close();
