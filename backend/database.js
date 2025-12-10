const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database
const db = new Database(path.join(__dirname, 'database.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
  console.log('🔧 Initializing database...');

  // ============ USERS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'landlord', 'tenant')),
      permissions TEXT,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============ PROPERTIES TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landlord_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT DEFAULT 'residential',
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (landlord_id) REFERENCES users(id)
    )
  `);

  // ============ UNITS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      rent_amount REAL NOT NULL,
      deposit_amount REAL,
      status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant', 'occupied', 'maintenance')),
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `);

  // ============ TENANTS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      id_number TEXT,
      emergency_contact TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ============ LEASES TABLE WITH SIGNING ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS leases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rent_amount REAL NOT NULL,
      deposit_amount REAL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_tenant', 'pending_landlord', 'active', 'expired', 'terminated')),
      termination_reason TEXT,
      termination_date TEXT,
      notes TEXT,
      tenant_signature TEXT,
      tenant_signed_at TEXT,
      landlord_signature TEXT,
      landlord_signed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    )
  `);

  // ============ PAYMENTS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'mpesa',
      reference_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lease_id) REFERENCES leases(id)
    )
  `);

  // ============ EXPENSES TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date TEXT NOT NULL,
      vendor TEXT,
      receipt_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `);

  // ============ MAINTENANCE REQUESTS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      tenant_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in-progress', 'completed', 'cancelled')),
      assigned_to TEXT,
      cost REAL,
      completed_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    )
  `);

  // ============ NOTIFICATIONS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ============ SETTINGS TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, key)
    )
  `);

  // ============ AUDIT LOG TABLE ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ============ CREATE INDEXES ============
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id)',
    'CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id)',
    'CREATE INDEX IF NOT EXISTS idx_units_status ON units(status)',
    'CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_lease ON payments(lease_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id)',
    'CREATE INDEX IF NOT EXISTS idx_maintenance_unit ON maintenance_requests(unit_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id)'
  ];

  indexes.forEach(idx => {
    try {
      db.exec(idx);
    } catch (e) {
      // Index might already exist
    }
  });

  // ============ CREATE DEFAULT ADMIN USER ============
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get('admin', 'admin@spiraldart.com');
  
  if (!adminExists) {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const adminPermissions = JSON.stringify({
      viewDashboard: true,
      manageTenants: true,
      manageUnits: true,
      manageProperties: true,
      managePayments: true,
      manageExpenses: true,
      manageMaintenance: true,
      manageLeases: true,
      terminateLease: true,
      generateReports: true,
      manageUsers: true,
      allocateUnits: true,
      viewAllData: true
    });

    db.prepare(`
      INSERT INTO users (username, email, password, role, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', 'admin@spiraldart.com', adminPassword, 'admin', adminPermissions, 1);

    console.log('✅ Admin user created: admin / admin123');
  } else {
    console.log('ℹ️  Admin user already exists');
  }

  // ============ CREATE SAMPLE LANDLORD ============
  const landlordExists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get('landlord1', 'landlord@spiraldart.com');
  
  if (!landlordExists) {
    const landlordPassword = bcrypt.hashSync('landlord123', 10);
    const landlordPermissions = JSON.stringify({
      viewDashboard: true,
      manageTenants: true,
      manageUnits: true,
      manageProperties: true,
      managePayments: true,
      manageExpenses: true,
      manageMaintenance: true,
      manageLeases: true,
      terminateLease: true,
      generateReports: true,
      manageUsers: false,
      allocateUnits: true,
      viewAllData: false
    });

    const landlordResult = db.prepare(`
      INSERT INTO users (username, email, password, role, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('landlord1', 'landlord@spiraldart.com', landlordPassword, 'landlord', landlordPermissions, 1);

    console.log('✅ Landlord user created: landlord1 / landlord123');

    // Create sample property for landlord
    const propertyResult = db.prepare(`
      INSERT INTO properties (landlord_id, name, location, type, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(landlordResult.lastInsertRowid, 'Sunset Apartments', 'Westlands, Nairobi', 'residential', 'Modern apartment complex with beautiful views');

    // Create sample units
    const units = [
      { name: 'Unit A1', bedrooms: 1, bathrooms: 1, rent: 25000, deposit: 25000, desc: 'Cozy 1-bedroom unit' },
      { name: 'Unit A2', bedrooms: 2, bathrooms: 1, rent: 35000, deposit: 35000, desc: 'Spacious 2-bedroom unit' },
      { name: 'Unit B1', bedrooms: 2, bathrooms: 2, rent: 45000, deposit: 45000, desc: '2-bedroom with ensuite' },
      { name: 'Unit B2', bedrooms: 3, bathrooms: 2, rent: 55000, deposit: 55000, desc: 'Family 3-bedroom unit' },
      { name: 'Unit C1', bedrooms: 1, bathrooms: 1, rent: 28000, deposit: 28000, desc: 'Studio with balcony' }
    ];

    units.forEach(unit => {
      db.prepare(`
        INSERT INTO units (property_id, name, bedrooms, bathrooms, rent_amount, deposit_amount, status, description)
        VALUES (?, ?, ?, ?, ?, ?, 'vacant', ?)
      `).run(propertyResult.lastInsertRowid, unit.name, unit.bedrooms, unit.bathrooms, unit.rent, unit.deposit, unit.desc);
    });

    console.log('✅ Sample property and 5 units created');
  } else {
    console.log('ℹ️  Landlord user already exists');
  }

  // ============ CREATE SAMPLE TENANT ============
  const tenantExists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get('tenant1', 'tenant@spiraldart.com');
  
  if (!tenantExists) {
    const tenantPassword = bcrypt.hashSync('tenant123', 10);
    const tenantPermissions = JSON.stringify({
      viewDashboard: true,
      manageTenants: false,
      manageUnits: false,
      manageProperties: false,
      managePayments: false,
      manageExpenses: false,
      manageMaintenance: true,
      manageLeases: false,
      terminateLease: false,
      generateReports: false,
      manageUsers: false,
      allocateUnits: false,
      viewAllData: false
    });

    const tenantResult = db.prepare(`
      INSERT INTO users (username, email, password, role, permissions, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tenant1', 'tenant@spiraldart.com', tenantPassword, 'tenant', tenantPermissions, 1);

    // Create tenant profile
    db.prepare(`
      INSERT INTO tenants (user_id, full_name, email, phone, id_number, emergency_contact)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenantResult.lastInsertRowid, 'John Doe', 'tenant@spiraldart.com', '0712345678', '12345678', '0722222222');

    console.log('✅ Tenant user created: tenant1 / tenant123');
  } else {
    console.log('ℹ️  Tenant user already exists');
  }

  console.log('✅ Database initialization complete!');
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('📋 Default Login Credentials:');
  console.log('   👤 Admin:    admin / admin123');
  console.log('   🏢 Landlord: landlord1 / landlord123');
  console.log('   🏠 Tenant:   tenant1 / tenant123');
  console.log('═══════════════════════════════════════════════');
  console.log('');
}

// Run initialization
initializeDatabase();

module.exports = db;
