const db = require('./database');

console.log('🔧 Running complete database migration...\n');

try {
  db.prepare('BEGIN TRANSACTION').run();

  // ============ CREATE ALL TABLES ============
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'landlord', 'tenant')),
      permissions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      id_number TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      landlord_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      landlord_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rent_amount REAL NOT NULL,
      deposit_amount REAL DEFAULT 0,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      status TEXT DEFAULT 'vacant' CHECK(status IN ('vacant', 'occupied', 'maintenance')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS leases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      unit_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rent_amount REAL NOT NULL,
      deposit_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'active', 'terminated', 'expired')),
      lease_document TEXT,
      tenant_signature TEXT,
      tenant_signed_at TEXT,
      landlord_signature TEXT,
      landlord_signed_at TEXT,
      sent_at TEXT,
      viewed_at TEXT,
      responded_at TEXT,
      rejection_reason TEXT,
      termination_reason TEXT,
      termination_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      lease_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank_transfer', 'mpesa', 'cheque', 'card')),
      reference_number TEXT,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('maintenance', 'repairs', 'utilities', 'insurance', 'taxes', 'management', 'other')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      vendor TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in-progress', 'completed', 'closed', 'cancelled')),
      notes TEXT,
      reported_date TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_date TEXT,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'general' CHECK(type IN ('general', 'payment', 'lease', 'maintenance')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled')),
      invoice_type TEXT DEFAULT 'rent' CHECK(invoice_type IN ('rent', 'deposit', 'move_in', 'utilities', 'other')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      paid_at TEXT,
      FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `).run();

  console.log('✅ All tables created\n');

  // ============ ADD MISSING COLUMNS ============
  
  const addColumnSafe = (table, column, type, defaultVal = null) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.find(c => c.name === column)) {
        const defaultClause = defaultVal ? `DEFAULT ${defaultVal}` : '';
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} ${defaultClause}`).run();
        console.log(`  ✅ Added ${table}.${column}`);
      }
    } catch (err) {
      // Column might already exist
    }
  };

  console.log('📋 Adding missing columns...\n');

  addColumnSafe('tenants', 'email', 'TEXT');
  addColumnSafe('tenants', 'landlord_id', 'INTEGER');
  addColumnSafe('tenants', 'emergency_contact', 'TEXT');
  addColumnSafe('tenants', 'emergency_phone', 'TEXT');
  addColumnSafe('leases', 'status', 'TEXT', "'draft'");
  addColumnSafe('leases', 'lease_document', 'TEXT');
  addColumnSafe('leases', 'tenant_signature', 'TEXT');
  addColumnSafe('leases', 'tenant_signed_at', 'TEXT');
  addColumnSafe('leases', 'landlord_signature', 'TEXT');
  addColumnSafe('leases', 'landlord_signed_at', 'TEXT');
  addColumnSafe('leases', 'sent_at', 'TEXT');
  addColumnSafe('leases', 'viewed_at', 'TEXT');
  addColumnSafe('leases', 'responded_at', 'TEXT');
  addColumnSafe('leases', 'rejection_reason', 'TEXT');
  addColumnSafe('leases', 'created_at', 'TEXT', 'CURRENT_TIMESTAMP');
  addColumnSafe('leases', 'updated_at', 'TEXT', 'CURRENT_TIMESTAMP');
  addColumnSafe('payments', 'created_at', 'TEXT', 'CURRENT_TIMESTAMP');
  addColumnSafe('payments', 'status', 'TEXT', "'completed'");
  addColumnSafe('payments', 'notes', 'TEXT');
  addColumnSafe('expenses', 'vendor', 'TEXT');
  addColumnSafe('expenses', 'created_at', 'TEXT', 'CURRENT_TIMESTAMP');
  addColumnSafe('maintenance_requests', 'reported_date', 'TEXT', 'CURRENT_TIMESTAMP');
  addColumnSafe('maintenance_requests', 'notes', 'TEXT');
  addColumnSafe('notifications', 'created_at', 'TEXT', 'CURRENT_TIMESTAMP');

  db.prepare('COMMIT').run();

  console.log('\n✅ Database migration completed!\n');

} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}