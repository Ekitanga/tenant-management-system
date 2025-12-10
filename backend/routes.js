const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const authMiddleware = require('./middleware');
const axios = require('axios');

// Helper: Role-based middleware
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login
router.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);

    if (!user) {
      console.log('❌ Login failed: User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      console.log('❌ Login failed: Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Login successful:', username, 'Role:', user.role);

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, is_active FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Register (Admin only)
router.post('/auth/register', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, role);

    res.status(201).json({ message: 'User created', userId: result.lastInsertRowid });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============================================
// DASHBOARD ROUTES
// ============================================

router.get('/dashboard/stats', authMiddleware, (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'tenant') {
      // Tenant stats
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (tenantData) {
        const leaseCount = db.prepare('SELECT COUNT(*) as count FROM leases WHERE tenant_id = ?').get(tenantData.id);
        const totalPaid = db.prepare(`
          SELECT COALESCE(SUM(p.amount), 0) as total 
          FROM payments p
          JOIN leases l ON p.lease_id = l.id
          WHERE l.tenant_id = ?
        `).get(tenantData.id);
        const maintenanceCount = db.prepare('SELECT COUNT(*) as count FROM maintenance_requests WHERE tenant_id = ?').get(tenantData.id);

        stats = {
          tenant_leases: leaseCount.count,
          tenant_total_paid: totalPaid.total,
          tenant_maintenance: maintenanceCount.count
        };
      }
} else {
      // Landlord/Admin stats
      const whereClause = req.user.role === 'landlord' ? 'WHERE landlord_id = ?' : '';
      const params = req.user.role === 'landlord' ? [req.user.id] : [];

      console.log('📊 Calculating stats for landlord:', req.user.id);

      // 1. Property count
      const propertyCount = db.prepare(`SELECT COUNT(*) as count FROM properties ${whereClause}`).get(...params);
      
      // 2. Unit stats (total units)
      const unitStats = db.prepare(`
        SELECT COUNT(*) as total
        FROM units u
        ${req.user.role === 'landlord' ? 'JOIN properties p ON u.property_id = p.id WHERE p.landlord_id = ?' : ''}
      `).get(...params);

      // 3. Occupied units count (from ACTIVE leases - most reliable)
      const activeLeases = db.prepare(`
        SELECT COUNT(DISTINCT u.id) as occupied_count
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.status = 'active'
        ${req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : ''}
      `).get(...params);

      const trueOccupied = activeLeases.occupied_count || 0;
      const totalUnits = unitStats.total || 0;
      const trueVacant = totalUnits - trueOccupied;

      // 4. Active tenant count (only tenants with active leases)
      const tenantCount = db.prepare(`
        SELECT COUNT(DISTINCT t.id) as count
        FROM tenants t
        JOIN leases l ON t.id = l.tenant_id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.status = 'active'
        ${req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : ''}
      `).get(...params);

      // 5. Monthly rent (expected from active leases)
      const monthlyRent = db.prepare(`
        SELECT COALESCE(SUM(l.rent_amount), 0) as total
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.status = 'active'
        ${req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : ''}
      `).get(...params);

      // 6. Total revenue (actual payments collected)
      const totalRevenue = db.prepare(`
        SELECT COALESCE(SUM(pay.amount), 0) as total
        FROM payments pay
        JOIN leases l ON pay.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        ${req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : ''}
      `).get(...params);

      stats = {
        total_properties: propertyCount.count,
        total_units: totalUnits,
        occupied_units: trueOccupied,
        vacant_units: trueVacant,
        active_tenants: tenantCount.count,
        total_monthly_rent: monthlyRent.total,  // Expected monthly
        total_revenue: totalRevenue.total       // Actually collected
      };

      console.log('📊 Stats calculated:', stats);
    }

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
// ============================================
// PROPERTY ROUTES
// ============================================

router.get('/properties', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const whereClause = req.user.role === 'landlord' ? 'WHERE landlord_id = ?' : '';
    const params = req.user.role === 'landlord' ? [req.user.id] : [];

    const properties = db.prepare(`
      SELECT * FROM properties ${whereClause} ORDER BY created_at DESC
    `).all(...params);

    res.json({ properties });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

router.post('/properties', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { name, location, description } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const landlord_id = req.user.role === 'landlord' ? req.user.id : req.body.landlord_id || req.user.id;

    const result = db.prepare(`
      INSERT INTO properties (name, location, description, landlord_id)
      VALUES (?, ?, ?, ?)
    `).run(name, location, description || '', landlord_id);

    console.log('✅ Property created:', result.lastInsertRowid);

    res.status(201).json({ message: 'Property created', propertyId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

router.put('/properties/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { name, location, description } = req.body;

    if (req.user.role === 'landlord') {
      const property = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?').get(req.params.id, req.user.id);
      if (!property) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare(`
      UPDATE properties 
      SET name = ?, location = ?, description = ?
      WHERE id = ?
    `).run(name, location, description || '', req.params.id);

    res.json({ message: 'Property updated' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});


// Sync unit statuses with lease statuses
router.post('/units/sync-status', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    console.log('🔄 Syncing unit statuses for landlord:', req.user.id);
    
    // Get all units for this landlord
    const whereClause = req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : '';
    const params = req.user.role === 'landlord' ? [req.user.id] : [];
    
    const units = db.prepare(`
      SELECT u.id, u.name, u.status, p.name as property_name
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
    `).all(...params);
    
    console.log(`Found ${units.length} units to check`);
    
    let updated = 0;
    
    for (const unit of units) {
      // Check if unit has an active lease
      const activeLease = db.prepare(`
        SELECT l.id
        FROM leases l
        WHERE l.unit_id = ? AND l.status = 'active'
        LIMIT 1
      `).get(unit.id);
      
      const shouldBeOccupied = !!activeLease;
      const correctStatus = shouldBeOccupied ? 'occupied' : 'vacant';
      
      if (unit.status !== correctStatus) {
        console.log(`  🔧 ${unit.name}: ${unit.status} → ${correctStatus}`);
        db.prepare('UPDATE units SET status = ? WHERE id = ?').run(correctStatus, unit.id);
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} units`);
    
    res.json({
      success: true,
      message: `Synced ${units.length} units, updated ${updated}`,
      updated
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ error: 'Failed to sync unit statuses' });
  }
});

// DELETE route comes after this
router.delete('/units/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const property = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?').get(req.params.id, req.user.id);
      if (!property) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);

    res.json({ message: 'Property deleted' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// ============================================
// UNIT ROUTES
// ============================================

router.get('/units', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const query = `
      SELECT u.*, p.name as property_name, p.location as property_location
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : ''}
      ORDER BY p.name, u.name
    `;

    const params = req.user.role === 'landlord' ? [req.user.id] : [];
    const units = db.prepare(query).all(...params);

    res.json({ units });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ error: 'Failed to get units' });
  }
});

router.get('/units/available', authMiddleware, (req, res) => {
  try {
    const query = `
      SELECT u.*, p.name as property_name, p.location as property_location
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.status = 'vacant'
      ${req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : ''}
      ORDER BY p.name, u.name
    `;

    const params = req.user.role === 'landlord' ? [req.user.id] : [];
    const units = db.prepare(query).all(...params);

    res.json({ units });
  } catch (error) {
    console.error('Get available units error:', error);
    res.status(500).json({ error: 'Failed to get available units' });
  }
});

router.post('/units', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, name, rent_amount, deposit_amount, bedrooms, bathrooms } = req.body;

    if (!property_id || !name || !rent_amount) {
      return res.status(400).json({ error: 'Property, name, and rent amount are required' });
    }

    if (req.user.role === 'landlord') {
      const property = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?').get(property_id, req.user.id);
      if (!property) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = db.prepare(`
      INSERT INTO units (property_id, name, rent_amount, deposit_amount, bedrooms, bathrooms, status)
      VALUES (?, ?, ?, ?, ?, ?, 'vacant')
    `).run(property_id, name, rent_amount, deposit_amount || 0, bedrooms || 1, bathrooms || 1);

    console.log('✅ Unit created:', result.lastInsertRowid);

    res.status(201).json({ message: 'Unit created', unitId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Create unit error:', error);
    res.status(500).json({ error: 'Failed to create unit', details: error.message });
  }
});

router.put('/units/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { name, rent_amount, deposit_amount, bedrooms, bathrooms, status } = req.body;

    if (req.user.role === 'landlord') {
      const unit = db.prepare(`
        SELECT u.* FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!unit) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare(`
      UPDATE units 
      SET name = ?, rent_amount = ?, deposit_amount = ?, bedrooms = ?, bathrooms = ?, status = ?
      WHERE id = ?
    `).run(name, rent_amount, deposit_amount || 0, bedrooms || 1, bathrooms || 1, status || 'vacant', req.params.id);

    res.json({ message: 'Unit updated' });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

router.delete('/units/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const unit = db.prepare(`
        SELECT u.* FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!unit) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);

    res.json({ message: 'Unit deleted' });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// ============================================
// TENANT ROUTES
// ============================================

router.get('/tenants', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'landlord') {
      query = `
        SELECT DISTINCT
          t.id as tenant_id,
          t.full_name,
          t.email,
          t.phone,
          t.id_number,
          t.emergency_contact,
          t.emergency_phone,
          t.created_at,
          l.id as lease_id,
          l.status as lease_status,
          u.name as unit_name,
          p.name as property_name,
          COALESCE(SUM(pay.amount), 0) as total_paid
        FROM tenants t
        LEFT JOIN leases l ON t.id = l.tenant_id
        LEFT JOIN units u ON l.unit_id = u.id  
        LEFT JOIN properties p ON u.property_id = p.id
        LEFT JOIN payments pay ON l.id = pay.lease_id
        WHERE (t.landlord_id = ? OR p.landlord_id = ?)
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `;
      params = [req.user.id, req.user.id];
    } else {
      query = `
        SELECT 
          t.id as tenant_id,
          t.full_name,
          t.email,
          t.phone,
          t.id_number,
          t.emergency_contact,
          t.emergency_phone,
          t.created_at,
          l.id as lease_id,
          l.status as lease_status,
          u.name as unit_name,
          p.name as property_name,
          COALESCE(SUM(pay.amount), 0) as total_paid
        FROM tenants t
        LEFT JOIN leases l ON t.id = l.tenant_id
        LEFT JOIN units u ON l.unit_id = u.id
        LEFT JOIN properties p ON u.property_id = p.id
        LEFT JOIN payments pay ON l.id = pay.lease_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `;
      params = [];
    }

    const tenants = db.prepare(query).all(...params);
    console.log(`✅ Fetched ${tenants.length} tenants for ${req.user.role}:`, req.user.id);
    res.json({ tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to get tenants' });
  }
});


router.post('/tenants', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { full_name, email, phone, id_number, emergency_contact, emergency_phone } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }

    // Check for duplicate email in tenants
    const existingTenant = db.prepare('SELECT id FROM tenants WHERE email = ?').get(email);
    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant with this email already exists' });
    }

    // Check for duplicate email in users
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const landlord_id = req.user.role === 'landlord' ? req.user.id : null;

    // Generate temporary password (first 4 letters of name + last 4 digits of phone or random)
    const namePart = full_name.replace(/\s+/g, '').substring(0, 4).toLowerCase();
    const phonePart = phone ? phone.slice(-4) : Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${namePart}${phonePart}`;

    // Hash the password
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);

    // Create user account first
    const userResult = db.prepare(`
      INSERT INTO users (username, email, password, role, is_active)
      VALUES (?, ?, ?, 'tenant', 1)
    `).run(email, email, hashedPassword);

    const userId = userResult.lastInsertRowid;

    // Create tenant record linked to user
    const tenantResult = db.prepare(`
      INSERT INTO tenants (full_name, email, phone, id_number, emergency_contact, emergency_phone, landlord_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, email, phone || '', id_number || '', emergency_contact || '', emergency_phone || '', landlord_id, userId);

    console.log('✅ Tenant created with user account:', tenantResult.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      io.emit('tenant:created', { id: tenantResult.lastInsertRowid });
    }

    res.status(201).json({ 
      message: 'Tenant and user account created successfully',
      tenantId: tenantResult.lastInsertRowid,
      userId: userId,
      tempPassword: tempPassword, // Send back to show to landlord
      username: email
    });
  } catch (error) {
    console.error('❌ Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant', details: error.message });
  }
});

router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const tenant = db.prepare('SELECT * FROM tenants WHERE id = ? AND landlord_id = ?').get(req.params.id, req.user.id);
      if (!tenant) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);

    res.json({ message: 'Tenant deleted' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

router.delete('/tenants/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const tenant = db.prepare('SELECT * FROM tenants WHERE id = ? AND landlord_id = ?').get(req.params.id, req.user.id);
      if (!tenant) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);

    res.json({ message: 'Tenant deleted' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// 👇 ADD THIS NEW ROUTE HERE 👇
router.put('/tenants/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { full_name, email, phone, id_number, emergency_contact, emergency_phone } = req.body;

    if (req.user.role === 'landlord') {
      // Check if landlord owns this tenant either directly OR via property
      const tenant = db.prepare(`
        SELECT DISTINCT t.* 
        FROM tenants t
        LEFT JOIN leases l ON t.id = l.tenant_id
        LEFT JOIN units u ON l.unit_id = u.id
        LEFT JOIN properties p ON u.property_id = p.id
        WHERE t.id = ? 
        AND (t.landlord_id = ? OR t.landlord_id IS NULL OR p.landlord_id = ?)
        LIMIT 1
      `).get(req.params.id, req.user.id, req.user.id);
      
      if (!tenant) {
        console.error('❌ Access denied - Tenant:', req.params.id, 'Landlord:', req.user.id);
        return res.status(403).json({ error: 'Access denied - You can only edit your own tenants' });
      }
    }

    db.prepare(`
      UPDATE tenants 
      SET full_name = ?, email = ?, phone = ?, id_number = ?, emergency_contact = ?, emergency_phone = ?
      WHERE id = ?
    `).run(full_name, email, phone || '', id_number || '', emergency_contact || '', emergency_phone || '', req.params.id);

    console.log('✅ Tenant updated:', req.params.id);
    res.json({ message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('❌ Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant', details: error.message });
  }
});

// ============================================
// LEASE ROUTES
// ============================================

// ============================================
// LEASE ROUTES
// ============================================

router.get('/leases', authMiddleware, (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (!tenantData) {
        return res.json({ leases: [] });
      }

      query = `
        SELECT 
          l.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          u.name as unit_name,
          p.name as property_name,
          p.location as property_location
        FROM leases l
        JOIN tenants t ON l.tenant_id = t.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.tenant_id = ?
        ORDER BY l.created_at DESC
      `;
      params = [tenantData.id];
    } else {
      query = `
        SELECT 
          l.*,
          t.full_name as tenant_name,
          t.email as tenant_email,
          u.name as unit_name,
          p.name as property_name,
          p.location as property_location
        FROM leases l
        JOIN tenants t ON l.tenant_id = t.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        ${req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : ''}
        ORDER BY l.created_at DESC
      `;
      params = req.user.role === 'landlord' ? [req.user.id] : [];
    }

    const leases = db.prepare(query).all(...params);

    res.json({ leases });
  } catch (error) {
    console.error('Get leases error:', error);
    res.status(500).json({ error: 'Failed to get leases' });
  }
});

router.post('/leases', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount } = req.body;

    if (!tenant_id || !unit_id || !start_date || !end_date || !rent_amount) {
      return res.status(400).json({ error: 'All fields except deposit are required' });
    }

    const unit = db.prepare(`
      SELECT u.*, p.landlord_id
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.id = ?
    `).get(unit_id);

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (unit.status !== 'vacant') {
      return res.status(400).json({ error: 'Unit is not vacant' });
    }

    if (req.user.role === 'landlord' && unit.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare(`
      INSERT INTO leases (tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `).run(tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount || 0);

    console.log('✅ Lease created:', result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      io.emit('lease:created', { id: result.lastInsertRowid });
      io.emit('dashboard:refresh');
    }

    res.status(201).json({ message: 'Lease created', leaseId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Create lease error:', error);
    res.status(500).json({ error: 'Failed to create lease', details: error.message });
  }
});

router.post('/leases/:id/send', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const lease = db.prepare(`
      SELECT l.*, p.landlord_id, t.email as tenant_email, t.full_name
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (lease.status !== 'draft') {
      return res.status(400).json({ error: 'Can only send draft leases' });
    }

db.prepare(`
      UPDATE leases 
      SET status = 'pending_tenant', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    const tenantUser = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(lease.tenant_id);
    if (tenantUser && tenantUser.user_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(tenantUser.user_id, 'New Lease Agreement', 'You have a new lease agreement to review', 'lease');
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('lease:sent', { leaseId: req.params.id });
      io.emit('dashboard:refresh');
    }

    console.log('✅ Lease sent to tenant:', req.params.id);

    res.json({ message: 'Lease sent to tenant successfully' });
  } catch (error) {
    console.error('❌ Send lease error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to send lease', details: error.message });
  }
});

router.post('/leases/:id/view', authMiddleware, (req, res) => {
  try {
    const lease = db.prepare(`
      SELECT l.*, t.user_id
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (lease.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (lease.status === 'sent' && !lease.viewed_at) {
      db.prepare(`
        UPDATE leases 
        SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.params.id);

      const io = req.app.get('io');
      if (io) {
        io.emit('lease:updated', { leaseId: req.params.id });
      }
    }

    res.json({ message: 'Lease viewed' });
  } catch (error) {
    console.error('❌ View lease error:', error);
    res.status(500).json({ error: 'Failed to view lease' });
  }
});

router.post('/leases/:id/accept', authMiddleware, (req, res) => {
  try {
    const { signature } = req.body;
    const leaseId = req.params.id;

    if (!signature || signature.trim().length < 2) {
      return res.status(400).json({ error: 'Valid signature is required' });
    }

    const lease = db.prepare(`
      SELECT l.*, t.user_id, u.id as unit_id
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (lease.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedStatuses = ['pending_tenant', 'sent', 'viewed'];
    
    if (!allowedStatuses.includes(lease.status)) {
      console.log('❌ Cannot accept lease - Current status:', lease.status);
      return res.status(400).json({ 
        error: `Lease cannot be accepted. Current status is "${lease.status}".` 
      });
    }

    // Update lease to active
    db.prepare(`
      UPDATE leases 
      SET status = 'active',               
          tenant_signature = ?,
          tenant_signed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(signature, leaseId);
    
    console.log('✅ Lease updated to active:', leaseId);

    // Update unit to occupied - CRITICAL STEP
    db.prepare('UPDATE units SET status = "occupied" WHERE id = ?').run(lease.unit_id);
    console.log('✅ Unit marked as occupied:', lease.unit_id);

    // Send notification (non-critical)
    try {
      const property = db.prepare(`
        SELECT p.landlord_id
        FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.id = ?
      `).get(lease.unit_id);

      if (property && property.landlord_id) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(property.landlord_id, 'Lease Accepted', 'A tenant has accepted and signed a lease agreement', 'lease');
      }
    } catch (notifError) {
      console.error('⚠️ Notification error (non-critical):', notifError.message);
    }

    // Emit socket events (non-critical)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('lease:accepted', { leaseId: req.params.id });
        io.emit('dashboard:refresh');
      }
    } catch (socketError) {
      console.error('⚠️ Socket error (non-critical):', socketError.message);
    }

    res.json({ 
      success: true,
      message: 'Lease accepted and signed successfully',
      leaseId: leaseId
    });

  } catch (error) {
    console.error('❌ Accept lease error:', error);
    res.status(500).json({ 
      error: 'Failed to accept lease', 
      details: error.message
    });
  }
});

router.post('/leases/:id/reject', authMiddleware, (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a detailed reason (minimum 10 characters)' });
    }

    const lease = db.prepare(`
      SELECT l.*, t.user_id, u.id as unit_id
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (lease.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

if (!['pending_tenant', 'sent', 'viewed'].includes(lease.status)) {
      return res.status(400).json({ error: 'Lease cannot be rejected in current status' });
    }

    db.prepare(`
      UPDATE leases 
      SET status = 'rejected', 
          rejection_reason = ?,
          responded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, req.params.id);

    db.prepare('UPDATE units SET status = "vacant" WHERE id = ?').run(lease.unit_id);

    const property = db.prepare(`
      SELECT p.landlord_id
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.id = ?
    `).get(lease.unit_id);

    if (property && property.landlord_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(property.landlord_id, 'Lease Rejected', `A tenant has rejected a lease agreement. Reason: ${reason}`, 'lease');
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('lease:rejected', { leaseId: req.params.id });
      io.emit('dashboard:refresh');
    }

    console.log('✅ Lease rejected:', req.params.id);

    res.json({ message: 'Lease rejected' });
  } catch (error) {
    console.error('❌ Reject lease error:', error);
    res.status(500).json({ error: 'Failed to reject lease' });
  }
});

router.post('/leases/:id/terminate', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    console.log('🔴 Terminate lease request for ID:', req.params.id);
    const { termination_reason } = req.body;

    if (!termination_reason || termination_reason.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a detailed termination reason (minimum 10 characters)' });
    }

    // Get lease details FIRST
    const lease = db.prepare(`
      SELECT l.*, p.landlord_id, u.id as unit_id, u.name as unit_name, t.user_id as tenant_user_id
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    console.log('📋 Lease status BEFORE termination:', lease.status);

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Allow terminating active OR already terminated leases (idempotent)
    if (lease.status !== 'active' && lease.status !== 'terminated') {
      return res.status(400).json({ 
        error: `Cannot terminate lease with status: ${lease.status}. Only active leases can be terminated.` 
      });
    }

    // If already terminated, just return success
    if (lease.status === 'terminated') {
      console.log('⚠️ Lease already terminated, returning success');
      return res.json({ 
        success: true,
        message: 'Lease was already terminated',
        alreadyTerminated: true
      });
    }

    // Terminate the lease
    db.prepare('UPDATE leases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('terminated', req.params.id);
    console.log('✅ Lease terminated');

    // Update unit to vacant
    db.prepare('UPDATE units SET status = ? WHERE id = ?').run('vacant', lease.unit_id);
    console.log('✅ Unit', lease.unit_name, 'marked as vacant');

    // Notify tenant
    if (lease.tenant_user_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(
          lease.tenant_user_id, 
          'Lease Terminated', 
          `Your lease has been terminated. Reason: ${termination_reason}`, 
          'lease'
        );
        console.log('✅ Notification sent to tenant');
      } catch (notifError) {
        console.error('⚠️ Notification error (non-critical):', notifError.message);
      }
    }

    // Emit socket events
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('lease:terminated', { leaseId: req.params.id });
        io.emit('dashboard:refresh');
      }
    } catch (socketError) {
      console.error('⚠️ Socket error (non-critical):', socketError.message);
    }

    console.log('✅ Lease termination complete');

    res.json({ 
      success: true,
      message: 'Lease terminated and unit marked as vacant'
    });

  } catch (error) {
    console.error('❌ Terminate lease error:', error);
    res.status(500).json({ 
      error: 'Failed to terminate lease', 
      details: error.message 
    });
  }
});

// Terminate lease route
router.post('/leases/:id/terminate', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    console.log('🔴 Terminate lease request:', req.params.id);
    const { termination_reason } = req.body;

    if (!termination_reason || termination_reason.trim().length < 10) {
      console.log('❌ Invalid reason:', termination_reason);
      return res.status(400).json({ error: 'Please provide a detailed termination reason (minimum 10 characters)' });
    }

    const lease = db.prepare(`
      SELECT l.*, p.landlord_id, u.id as unit_id, t.user_id as tenant_user_id, t.full_name as tenant_name
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.id = ?
    `).get(req.params.id);

    console.log('📋 Lease found:', lease);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow terminating active leases
    if (lease.status !== 'active') {
      return res.status(400).json({ error: `Cannot terminate lease with status: ${lease.status}. Only active leases can be terminated.` });
    }

    // Update lease status
    db.prepare(`
      UPDATE leases 
      SET status = 'terminated',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    console.log('✅ Lease terminated:', req.params.id);

    // Update unit to vacant
    db.prepare('UPDATE units SET status = "vacant" WHERE id = ?').run(lease.unit_id);
    console.log('✅ Unit marked as vacant:', lease.unit_id);

    // Notify tenant
    if (lease.tenant_user_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(
          lease.tenant_user_id, 
          'Lease Terminated', 
          `Your lease has been terminated. Reason: ${termination_reason}`, 
          'lease'
        );
        console.log('✅ Notification sent to tenant');
      } catch (notifError) {
        console.error('⚠️ Notification error:', notifError.message);
      }
    }

    // Emit socket events
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('lease:terminated', { leaseId: req.params.id });
        io.emit('dashboard:refresh');
      }
    } catch (socketError) {
      console.error('⚠️ Socket error:', socketError.message);
    }

    res.json({ 
      success: true,
      message: 'Lease terminated successfully' 
    });
  } catch (error) {
    console.error('❌ Terminate lease error:', error);
    res.status(500).json({ 
      error: 'Failed to terminate lease', 
      details: error.message 
    });
  }
});


router.delete('/leases/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const lease = db.prepare(`
      SELECT l.*, p.landlord_id 
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow deletion of draft, rejected, or terminated leases
    const deletableStatuses = ['draft', 'rejected', 'terminated', 'expired'];
    if (!deletableStatuses.includes(lease.status)) {
      return res.status(400).json({ 
        error: `Cannot delete ${lease.status} lease. Only draft, rejected, terminated, or expired leases can be deleted.` 
      });
    }

    db.prepare('DELETE FROM leases WHERE id = ?').run(req.params.id);

    res.json({ message: 'Lease deleted successfully' });
  } catch (error) {
    console.error('Delete lease error:', error);
    res.status(500).json({ error: 'Failed to delete lease', details: error.message });
  }
});

// Update lease (only draft leases can be edited)
router.put('/leases/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount } = req.body;

    // Get the current lease
    const lease = db.prepare(`
      SELECT l.*, p.landlord_id, u.status as unit_status
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    // Only allow editing draft leases
    if (lease.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft leases can be edited' });
    }

    // Check landlord ownership
    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If changing unit, validate the new unit
    if (unit_id && unit_id != lease.unit_id) {
      const newUnit = db.prepare(`
        SELECT u.*, p.landlord_id
        FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.id = ?
      `).get(unit_id);

      if (!newUnit) {
        return res.status(404).json({ error: 'New unit not found' });
      }

      if (newUnit.status !== 'vacant') {
        return res.status(400).json({ error: 'New unit is not vacant' });
      }

      if (req.user.role === 'landlord' && newUnit.landlord_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to new unit' });
      }
    }

    // Update the lease
    db.prepare(`
      UPDATE leases 
      SET tenant_id = ?, unit_id = ?, start_date = ?, end_date = ?, rent_amount = ?, deposit_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount || 0, req.params.id);

    console.log('✅ Lease updated:', req.params.id);
    res.json({ message: 'Lease updated successfully' });
  } catch (error) {
    console.error('❌ Update lease error:', error);
    res.status(500).json({ error: 'Failed to update lease', details: error.message });
  }
});

// ============================================
// PAYMENT ROUTES (FIXED - LESS RESTRICTIVE)
// ============================================

router.get('/payments', authMiddleware, (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (!tenantData) {
        return res.json({ payments: [] });
      }

      query = `
        SELECT 
          p.*,
          t.full_name as tenant_name,
          u.name as unit_name,
          prop.name as property_name
        FROM payments p
        JOIN leases l ON p.lease_id = l.id
        JOIN tenants t ON l.tenant_id = t.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties prop ON u.property_id = prop.id
        WHERE l.tenant_id = ?
        ORDER BY p.payment_date DESC
      `;
      params = [tenantData.id];
    } else {
      query = `
        SELECT 
          p.*,
          t.full_name as tenant_name,
          u.name as unit_name,
          prop.name as property_name
        FROM payments p
        JOIN leases l ON p.lease_id = l.id
        JOIN tenants t ON l.tenant_id = t.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties prop ON u.property_id = prop.id
        ${req.user.role === 'landlord' ? 'WHERE prop.landlord_id = ?' : ''}
        ORDER BY p.payment_date DESC
      `;
      params = req.user.role === 'landlord' ? [req.user.id] : [];
    }

    const payments = db.prepare(query).all(...params);

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

router.post('/payments', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { lease_id, amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!lease_id || !amount) {
      return res.status(400).json({ error: 'Lease ID and amount are required' });
    }

    const finalPaymentDate = payment_date || new Date().toISOString().split('T')[0];

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const lease = db.prepare(`
      SELECT l.*, t.id as tenant_id, p.landlord_id
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE l.id = ?
    `).get(lease_id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

const result = db.prepare(`
      INSERT INTO payments (lease_id, amount, payment_date, payment_method, reference_number, status, notes)
      VALUES (?, ?, ?, ?, ?, 'completed', ?)
    `).run(lease_id, amount, finalPaymentDate, payment_method || 'cash', reference_number || null, notes || null);

    console.log('✅ Payment created:', result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      io.emit('payment:created', { id: result.lastInsertRowid, lease_id, amount });
      io.emit('dashboard:refresh');
    }

    res.status(201).json({ message: 'Payment recorded successfully', paymentId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({ error: 'Failed to record payment', details: error.message });
  }
});

router.delete('/payments/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ============================================
// EXPENSE ROUTES (FIXED - LESS RESTRICTIVE)
// ============================================

router.get('/expenses', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
const query = `
      SELECT 
        e.*,
        p.name as property_name
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      ${req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : ''}
      ORDER BY e.expense_date DESC
    `;

    const params = req.user.role === 'landlord' ? [req.user.id] : [];
    const expenses = db.prepare(query).all(...params);

    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

router.post('/expenses', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, category, description, amount, expense_date, vendor } = req.body;

    if (!property_id || !amount || !expense_date) {
      return res.status(400).json({ error: 'Property, amount, and date are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const finalCategory = category || 'other';
    const finalDescription = description || 'Expense';

    if (req.user.role === 'landlord') {
      const property = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?').get(property_id, req.user.id);
      if (!property) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

const result = db.prepare(`
      INSERT INTO expenses (property_id, category, description, amount, expense_date, vendor)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(property_id, finalCategory, finalDescription, amount, expense_date, vendor || '');

    console.log('✅ Expense created:', result.lastInsertRowid);

    res.status(201).json({ message: 'Expense recorded', expenseId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Expense error:', error);
    res.status(500).json({ error: 'Failed to record expense', details: error.message });
  }
});

router.delete('/expenses/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const expense = db.prepare(`
        SELECT e.* FROM expenses e
        JOIN properties p ON e.property_id = p.id
        WHERE e.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!expense) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

router.delete('/expenses/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const expense = db.prepare(`
        SELECT e.* FROM expenses e
        JOIN properties p ON e.property_id = p.id
        WHERE e.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!expense) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// 👇 ADD THIS NEW ROUTE HERE 👇
router.put('/expenses/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, category, description, amount, expense_date, vendor } = req.body;

    // Get the current expense
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (req.user.role === 'landlord') {
      // Check if landlord owns the current property
      const currentProperty = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?')
        .get(expense.property_id, req.user.id);
      
      if (!currentProperty) {
        return res.status(403).json({ error: 'Access denied - You do not own this expense' });
      }

      // If changing property, check if landlord owns the new property
      if (property_id && property_id != expense.property_id) {
        const newProperty = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?')
          .get(property_id, req.user.id);
        
        if (!newProperty) {
          return res.status(403).json({ error: 'Access denied - You do not own the target property' });
        }
      }
    }

    db.prepare(`
      UPDATE expenses 
      SET property_id = ?, category = ?, description = ?, amount = ?, expense_date = ?, vendor = ?
      WHERE id = ?
    `).run(property_id, category, description, amount, expense_date, vendor || '', req.params.id);

    console.log('✅ Expense updated:', req.params.id);
    res.json({ message: 'Expense updated' });
  } catch (error) {
    console.error('❌ Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense', details: error.message });
  }
});

// ============================================
// MAINTENANCE ROUTES (FIXED - TENANT_ID OPTIONAL)
// ============================================

router.get('/maintenance', authMiddleware, (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (!tenantData) {
        return res.json({ requests: [] });
      }

      query = `
        SELECT 
          m.*,
          u.name as unit_name,
          p.name as property_name
        FROM maintenance_requests m
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE m.tenant_id = ?
        ORDER BY m.reported_date DESC
      `;
      params = [tenantData.id];
    } else {
      query = `
        SELECT 
          m.*,
          u.name as unit_name,
          p.name as property_name,
          t.full_name as tenant_name
        FROM maintenance_requests m
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        LEFT JOIN tenants t ON m.tenant_id = t.id
        ${req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : ''}
        ORDER BY m.reported_date DESC
      `;
      params = req.user.role === 'landlord' ? [req.user.id] : [];
    }

    const requests = db.prepare(query).all(...params);

    res.json({ requests });
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ error: 'Failed to get maintenance requests' });
  }
});

router.post('/maintenance', authMiddleware, (req, res) => {
  try {
    const { unit_id, title, description, priority } = req.body;

    if (!unit_id || !title || !description) {
      return res.status(400).json({ error: 'Unit, title, and description are required' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    let tenant_id = null;

    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      if (tenantData) {
        tenant_id = tenantData.id;

        const lease = db.prepare('SELECT * FROM leases WHERE tenant_id = ? AND unit_id = ? AND status IN ("active", "accepted")').get(tenant_id, unit_id);
        if (!lease) {
          return res.status(403).json({ error: 'You can only create requests for your unit' });
        }
      }
    } else {
      tenant_id = req.body.tenant_id || null;
    }

    const unit = db.prepare(`
      SELECT u.*, p.landlord_id 
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.id = ?
    `).get(unit_id);

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (req.user.role === 'landlord' && unit.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare(`
      INSERT INTO maintenance_requests (unit_id, tenant_id, title, description, priority, status)
      VALUES (?, ?, ?, ?, ?, 'open')
    `).run(unit_id, tenant_id, title, description, priority || 'medium');

    console.log('✅ Maintenance request created:', result.lastInsertRowid);

    if (unit.landlord_id) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(unit.landlord_id, 'New Maintenance Request', `New request for unit: ${title}`, 'maintenance');
      } catch (notifError) {
        console.log('Notification error (non-critical):', notifError.message);
      }
    }

    res.status(201).json({ message: 'Maintenance request created', requestId: result.lastInsertRowid });
  } catch (error) {
    console.error('❌ Maintenance error:', error);
    res.status(500).json({ error: 'Failed to create maintenance request', details: error.message });
  }
});

router.put('/maintenance/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { unit_id, title, description, priority, status, notes } = req.body;

    if (req.user.role === 'landlord') {
      const request = db.prepare(`
        SELECT m.* FROM maintenance_requests m
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE m.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!request) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updates = [];
    const values = [];

    // Allow updating unit_id
    if (unit_id) {
      updates.push('unit_id = ?');
      values.push(unit_id);
    }

    // Allow updating title
    if (title) {
      updates.push('title = ?');
      values.push(title);
    }

    // Allow updating description
    if (description) {
      updates.push('description = ?');
      values.push(description);
    }

    // Allow updating status
    if (status) {
      const validStatuses = ['open', 'in-progress', 'completed', 'closed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      values.push(status);

      if (status === 'completed' || status === 'closed') {
        updates.push('resolved_date = CURRENT_TIMESTAMP');
      }
    }

    // Allow updating priority
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.push('priority = ?');
      values.push(priority);
    }

    // Allow updating notes
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    db.prepare(`
      UPDATE maintenance_requests 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    console.log('✅ Maintenance request updated:', req.params.id);
    res.json({ message: 'Maintenance request updated' });
  } catch (error) {
    console.error('❌ Update maintenance error:', error);
    res.status(500).json({ error: 'Failed to update maintenance request', details: error.message });
  }
});

router.delete('/maintenance/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const request = db.prepare(`
        SELECT m.* FROM maintenance_requests m
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE m.id = ? AND p.landlord_id = ?
      `).get(req.params.id, req.user.id);

      if (!request) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    db.prepare('DELETE FROM maintenance_requests WHERE id = ?').run(req.params.id);

    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ error: 'Failed to delete maintenance request' });
  }
});

// ============================================
// REPORTS ROUTES
// ============================================

router.get('/reports/revenue', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;
    
    let query = `
      SELECT 
        strftime('%Y-%m', p.payment_date) as month,
        SUM(p.amount) as revenue,  -- ✅ Changed from 'total_revenue'
        COUNT(p.id) as payment_count,
        AVG(p.amount) as avg_payment
      FROM payments p
      JOIN leases l ON p.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties prop ON u.property_id = prop.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (req.user.role === 'landlord') {
      query += ' AND prop.landlord_id = ?';
      params.push(req.user.id);
    }
    
    if (startDate) {
      query += ' AND p.payment_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND p.payment_date <= ?';
      params.push(endDate);
    }
    
    if (propertyId) {
      query += ' AND prop.id = ?';
      params.push(propertyId);
    }
    
    query += ' GROUP BY month ORDER BY month DESC';
    
    const monthlyRevenue = db.prepare(query).all(...params);
    
    // Calculate totals
    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);  // ✅ Changed field name
    const totalPayments = monthlyRevenue.reduce((sum, m) => sum + m.payment_count, 0);
    
    res.json({
      monthlyRevenue,
      summary: {
        totalRevenue,
        totalPayments,
        averageMonthlyRevenue: monthlyRevenue.length > 0 ? totalRevenue / monthlyRevenue.length : 0
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});


// ============================================
// M-PESA STK PUSH
// ============================================

router.post('/mpesa/stk-push', authMiddleware, async (req, res) => {
  try {
    const { phone, amount, lease_id } = req.body;

    if (!phone || !amount || !lease_id) {
      return res.status(400).json({ error: 'Phone, amount, and lease ID are required' });
    }

    // Get M-PESA credentials from environment
    const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
    const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
    const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
    const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
    const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback';

    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
      return res.status(500).json({ error: 'M-PESA credentials not configured' });
    }

    // Get access token
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const tokenResponse = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });

    const accessToken = tokenResponse.data.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    // Format phone number
    const formattedPhone = phone.replace(/^0/, '254').replace(/\+/, '');

    // STK Push request
    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: `LEASE-${lease_id}`,
        TransactionDesc: 'Rent Payment'
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    console.log('✅ M-PESA STK Push initiated:', stkResponse.data.CheckoutRequestID);

    res.json({
      success: true,
      message: 'Payment request sent to phone',
      checkoutRequestId: stkResponse.data.CheckoutRequestID
    });

  } catch (error) {
    console.error('❌ M-PESA STK Push error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment', details: error.response?.data || error.message });
  }
});

// M-PESA Callback
router.post('/mpesa/callback', (req, res) => {
  try {
    console.log('📥 M-PESA Callback received:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    
    if (Body && Body.stkCallback) {
      const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

      if (ResultCode === 0) {
        // Payment successful
        const metadata = {};
        CallbackMetadata.Item.forEach(item => {
          metadata[item.Name] = item.Value;
        });

        const { Amount, MpesaReceiptNumber, PhoneNumber } = metadata;

        console.log('✅ Payment successful:', {
          amount: Amount,
          receipt: MpesaReceiptNumber,
          phone: PhoneNumber
        });

        // Auto-create payment record
        // Extract lease_id from AccountReference if available
        // For now, just log it - you can enhance this to auto-record

      } else {
        console.log('❌ Payment failed:', ResultDesc);
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });

  } catch (error) {
    console.error('Callback error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Failed' });
  }
});

// ============================================
// SMS INTEGRATION (BONGA SMS)
// ============================================

router.post('/sms/send', authMiddleware, roleMiddleware('admin', 'landlord'), async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    const BONGA_API_KEY = process.env.BONGA_API_KEY;
    const BONGA_PARTNER_ID = process.env.BONGA_PARTNER_ID;
    const BONGA_SHORTCODE = process.env.BONGA_SHORTCODE || 'SPIRALDART';

    if (!BONGA_API_KEY) {
      return res.status(500).json({ error: 'SMS credentials not configured' });
    }

    const formattedPhone = phone.replace(/^0/, '254').replace(/\+/, '');

    const smsResponse = await axios.post(
      'https://api.bongasms.co.ke/v2/send',
      {
        partnerID: BONGA_PARTNER_ID,
        apikey: BONGA_API_KEY,
        shortcode: BONGA_SHORTCODE,
        mobile: formattedPhone,
        message: message
      }
    );

    console.log('✅ SMS sent:', smsResponse.data);

    res.json({ success: true, message: 'SMS sent successfully' });

  } catch (error) {
    console.error('❌ SMS error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send SMS', details: error.response?.data || error.message });
  }
});

// Send rent reminder SMS to all tenants with arrears
router.post('/sms/rent-reminders', authMiddleware, roleMiddleware('admin', 'landlord'), async (req, res) => {
  try {
    console.log('📱 ========================================');
    console.log('📱 SMS RENT REMINDERS');
    console.log('📱 ========================================');

    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'landlord') {
      whereClause = 'WHERE p.landlord_id = ?';
      params.push(req.user.id);
    }

    // USE THE EXACT SAME QUERY AS ARREARS REPORT
    const query = `
      SELECT 
        l.id as lease_id,
        t.full_name as tenant_name,
        t.phone as tenant_phone,
        u.name as unit_name,
        p.name as property_name,
        l.rent_amount,
        l.start_date,
        -- Months elapsed
        CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER)
        END as months_elapsed,
        -- Total paid
        COALESCE(SUM(pay.amount), 0) as total_paid,
        -- Expected amount
        CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER) * l.rent_amount
        END as expected_amount,
        -- Arrears
        (CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER) * l.rent_amount
        END) - COALESCE(SUM(pay.amount), 0) as arrears_amount
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN payments pay ON l.id = pay.lease_id
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} l.status = 'active'
      GROUP BY l.id
      HAVING arrears_amount > 0
      ORDER BY arrears_amount DESC
    `;

    const tenantsWithArrears = db.prepare(query).all(...params);
    
    console.log(`📱 Found ${tenantsWithArrears.length} tenants with arrears:`);
    tenantsWithArrears.forEach(t => {
      console.log(`📱   ${t.tenant_name}: ${t.arrears_amount} arrears (Expected: ${t.expected_amount}, Paid: ${t.total_paid})`);
    });

    if (tenantsWithArrears.length === 0) {
      return res.json({
        message: 'No tenants with arrears',
        total: 0,
        sent: 0,
        failed: 0
      });
    }

    let sent = 0;
    let failed = 0;
    const failedDetails = [];

    for (const tenant of tenantsWithArrears) {
      if (!tenant.tenant_phone) {
        console.log(`⚠️ ${tenant.tenant_name}: No phone number`);
        failed++;
        failedDetails.push({ name: tenant.tenant_name, reason: 'No phone number' });
        continue;
      }

      const message = `Dear ${tenant.tenant_name}, you have an outstanding rent balance of KES ${tenant.arrears_amount.toLocaleString()} for ${tenant.unit_name}. Please make payment at your earliest convenience. Thank you - ${tenant.property_name} Management`;

      console.log(`📱 Sending to ${tenant.tenant_name}: "${message}"`);

      try {
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('clientId', process.env.BONGASMS_CLIENT_ID);
        formData.append('secret', process.env.BONGASMS_API_SECRET);
        formData.append('msisdn', tenant.tenant_phone);
        formData.append('message', message);
        formData.append('serviceId', process.env.BONGASMS_SERVICE_ID);
        formData.append('sender', process.env.BONGASMS_SENDER || 'SPIRALDART');

        const response = await fetch('http://167.172.14.50:4002/v1/send-sms', {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        });

        const result = await response.json();
        
        if (result.status === 222 || result.responseCode === 222) {
          console.log(`✅ SMS sent to ${tenant.tenant_name}`);
          sent++;
        } else {
          console.log(`❌ SMS failed for ${tenant.tenant_name}:`, result);
          failed++;
          failedDetails.push({ name: tenant.tenant_name, reason: result.message || 'SMS API error' });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error sending to ${tenant.tenant_name}:`, error.message);
        failed++;
        failedDetails.push({ name: tenant.tenant_name, reason: error.message });
      }
    }

    console.log('📱 ========================================');
    console.log(`📱 RESULTS: ${sent} sent, ${failed} failed`);
    console.log('📱 ========================================');

    res.json({
      message: 'Rent reminders sent',
      total: tenantsWithArrears.length,
      sent,
      failed,
      failedDetails
    });

  } catch (error) {
    console.error('❌ SMS reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminders', details: error.message });
  }
});


// Check SMS Balance
router.get('/sms/balance', authMiddleware, roleMiddleware('admin', 'landlord'), async (req, res) => {
  try {
    const clientId = process.env.BONGASMS_CLIENT_ID;
    const apiKey = process.env.BONGASMS_API_KEY;

    if (!clientId || !apiKey) {
      return res.status(500).json({ error: 'SMS service not configured' });
    }

    console.log('Checking balance with:', { clientId, apiKey: apiKey?.substring(0, 5) + '...' });

    const response = await axios.get('http://167.172.14.50:4002/api/check-credits', {
      params: {
        apiClientID: clientId,
        key: apiKey
      },
      timeout: 10000
    });

    console.log('SMS Balance Response:', response.data);

    if (response.data.status === 222) {
      res.json({
        success: true,
        balance: response.data.sms_credits,
        clientName: response.data.client_name
      });
    } else {
      res.status(400).json({
        error: response.data.status_message || 'Failed to check balance'
      });
    }

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      error: 'Failed to check SMS balance',
      details: error.message
    });
  }
});



// ============================================
// NOTIFICATION ROUTES
// ============================================

router.get('/notifications', authMiddleware, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications 
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ============================================
// USER MANAGEMENT (Admin only)
// ============================================

router.get('/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, role, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, role);

    res.status(201).json({ message: 'User created', userId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const { username, email, role, is_active } = req.body;

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    res.json({ message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// ============================================
// PASSWORD MANAGEMENT ROUTES
// ============================================

// Change own password (any user)
router.put('/auth/change-password', authMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = bcrypt.compareSync(currentPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Landlord: Reset tenant password
// Landlord/Admin: Reset tenant password
router.put('/tenants/:id/reset-password', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Get tenant and verify ownership
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // For landlords, verify they own the property where this tenant has a lease
    if (req.user.role === 'landlord') {
      const tenantLease = db.prepare(`
        SELECT l.* 
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.tenant_id = ? AND p.landlord_id = ?
        LIMIT 1
      `).get(req.params.id, req.user.id);

      if (!tenantLease) {
        return res.status(403).json({ error: 'Access denied - You can only reset passwords for your tenants' });
      }
    }

    // If tenant has user_id, update that user's password
    if (!tenant.user_id) {
      return res.status(400).json({ error: 'Tenant has no user account' });
    }

    // Get the user details first
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tenant.user_id);
    
    if (!user) {
      return res.status(400).json({ error: 'User account not found for this tenant' });
    }

    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Update the password
    const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, tenant.user_id);
    
    if (result.changes === 0) {
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log('✅ Tenant password reset:', tenant.id, 'User:', user.username);
    
    // Return success with username info
    res.json({ 
      message: 'Tenant password reset successfully',
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error('❌ Reset tenant password error:', error);
    res.status(500).json({ error: 'Failed to reset password', details: error.message });
  }
});

// Admin: Reset any user password
router.put('/users/:id/reset-password', authMiddleware, roleMiddleware('admin'), (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);

    res.json({ message: 'User password reset successfully' });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ==========================================
// REPORTS & ANALYTICS ROUTES
// ==========================================

// Revenue Report


// Summary Dashboard Report
// ==========================================
// REPORTS & ANALYTICS ROUTES
// ==========================================

// 1. Summary Dashboard Report
router.get('/reports/summary', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const params = req.user.role === 'landlord' ? [req.user.id] : [];
    const whereClause = req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : '';
    
    // Revenue (last 30 days)
    const recentRevenue = db.prepare(`
      SELECT COALESCE(SUM(pay.amount), 0) as amount
      FROM payments pay
      JOIN leases l ON pay.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
      AND pay.payment_date >= date('now', '-30 days')
    `).get(...params);
    
    // Total revenue
    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(pay.amount), 0) as amount
      FROM payments pay
      JOIN leases l ON pay.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
    `).get(...params);
    
    // Expenses (last 30 days)
    const recentExpenses = db.prepare(`
      SELECT COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      ${whereClause}
      AND e.expense_date >= date('now', '-30 days')
    `).get(...params);
    
    // Total expenses
    const totalExpenses = db.prepare(`
      SELECT COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      ${whereClause}
    `).get(...params);
    
    // Occupancy
    const occupancy = db.prepare(`
      SELECT 
        COUNT(*) as total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied_units
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
    `).get(...params);
    
    // Active tenants
    const activeTenants = db.prepare(`
      SELECT COUNT(DISTINCT l.tenant_id) as count
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
      AND l.status = 'active'
    `).get(...params);
    
    res.json({
      revenue: {
        last30Days: recentRevenue.amount,
        total: totalRevenue.amount,
        netProfit: totalRevenue.amount - totalExpenses.amount
      },
      expenses: {
        last30Days: recentExpenses.amount,
        total: totalExpenses.amount
      },
      occupancy: {
        totalUnits: occupancy.total_units,
        occupiedUnits: occupancy.occupied_units,
        rate: occupancy.total_units > 0 ? ((occupancy.occupied_units / occupancy.total_units) * 100).toFixed(2) : 0
      },
      activeTenants: activeTenants.count
    });
  } catch (error) {
    console.error('❌ Summary report error:', error);
    res.status(500).json({ error: 'Failed to generate summary report' });
  }
});

// 2. Revenue Report
router.get('/reports/revenue', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;
    
    let query = `
      SELECT 
        strftime('%Y-%m', p.payment_date) as month,
        SUM(p.amount) as revenue,
        COUNT(p.id) as payment_count,
        AVG(p.amount) as avg_payment
      FROM payments p
      JOIN leases l ON p.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties prop ON u.property_id = prop.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (req.user.role === 'landlord') {
      query += ' AND prop.landlord_id = ?';
      params.push(req.user.id);
    }
    
    if (startDate) {
      query += ' AND p.payment_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND p.payment_date <= ?';
      params.push(endDate);
    }
    
    if (propertyId) {
      query += ' AND prop.id = ?';
      params.push(propertyId);
    }
    
    query += ' GROUP BY month ORDER BY month DESC';
    
    const monthlyRevenue = db.prepare(query).all(...params);
    
    // Calculate totals
    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    const totalPayments = monthlyRevenue.reduce((sum, m) => sum + m.payment_count, 0);
    
    res.json({
      monthlyRevenue,
      summary: {
        totalRevenue,
        totalPayments,
        averageMonthlyRevenue: monthlyRevenue.length > 0 ? totalRevenue / monthlyRevenue.length : 0
      }
    });
  } catch (error) {
    console.error('❌ Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

// 3. Occupancy Report
router.get('/reports/occupancy', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'landlord') {
      whereClause = 'WHERE p.landlord_id = ?';
      params.push(req.user.id);
    }
    
    // Overall occupancy stats
    const overall = db.prepare(`
      SELECT 
        COUNT(*) as total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) as vacant_units
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${whereClause}
    `).get(...params);
    
    overall.occupancy_rate = overall.total_units > 0 
      ? ((overall.occupied_units / overall.total_units) * 100).toFixed(2)
      : 0;
    
    // Per-property breakdown
    const byProperty = db.prepare(`
      SELECT 
        p.id,
        p.name as property_name,
        p.location,
        COUNT(u.id) as total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) as vacant_units,
        ROUND(CAST(SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(u.id) * 100, 2) as occupancy_rate
      FROM properties p
      LEFT JOIN units u ON p.id = u.property_id
      ${whereClause}
      GROUP BY p.id, p.name
      ORDER BY occupancy_rate DESC
    `).all(...params);
    
    // Vacant units details
    const vacantUnits = db.prepare(`
      SELECT 
        u.id,
        u.name as unit_number,
        p.name as property_name,
        u.rent_amount,
        u.bedrooms,
        u.bathrooms
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.status = 'vacant'
      ${req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : ''}
      ORDER BY p.name, u.name
    `).all(...(req.user.role === 'landlord' ? [req.user.id] : []));
    
    res.json({
      overall,
      byProperty,
      vacantUnits
    });
  } catch (error) {
    console.error('❌ Occupancy report error:', error);
    res.status(500).json({ error: 'Failed to generate occupancy report' });
  }
});

// 4. Expense Report
router.get('/reports/expenses', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { startDate, endDate, propertyId, category } = req.query;
    
    let query = `
      SELECT 
        e.id,
        e.category,
        e.description,
        e.amount,
        e.expense_date,
        e.vendor,
        p.name as property_name
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (req.user.role === 'landlord') {
      query += ' AND p.landlord_id = ?';
      params.push(req.user.id);
    }
    
    if (startDate) {
      query += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    
    if (propertyId) {
      query += ' AND p.id = ?';
      params.push(propertyId);
    }
    
    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY e.expense_date DESC LIMIT 20';
    
    const expenses = db.prepare(query).all(...params);
    
    // Category breakdown - use same filters
    let categoryQuery = `
      SELECT 
        e.category,
        COUNT(*) as count,
        SUM(e.amount) as total_amount,
        AVG(e.amount) as avg_amount
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
      WHERE 1=1
    `;
    
    const categoryParams = [];
    
    if (req.user.role === 'landlord') {
      categoryQuery += ' AND p.landlord_id = ?';
      categoryParams.push(req.user.id);
    }
    
    if (startDate) {
      categoryQuery += ' AND e.expense_date >= ?';
      categoryParams.push(startDate);
    }
    
    if (endDate) {
      categoryQuery += ' AND e.expense_date <= ?';
      categoryParams.push(endDate);
    }
    
    if (propertyId) {
      categoryQuery += ' AND p.id = ?';
      categoryParams.push(propertyId);
    }
    
    categoryQuery += ' GROUP BY e.category ORDER BY total_amount DESC';
    
    const categoryBreakdown = db.prepare(categoryQuery).all(...categoryParams);
    
    const totalExpenses = categoryBreakdown.reduce((sum, cat) => sum + cat.total_amount, 0);
    const expenseCount = categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0);
    
    res.json({
      expenses,
      categoryBreakdown,
      summary: {
        totalExpenses,
        expenseCount
      }
    });
  } catch (error) {
    console.error('❌ Expense report error:', error);
    res.status(500).json({ error: 'Failed to generate expense report' });
  }
});

// 5. Arrears Report
router.get('/reports/arrears', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'landlord') {
      whereClause = 'WHERE p.landlord_id = ?';
      params.push(req.user.id);
    }
    
    console.log('📊 ========================================');
    console.log('📊 ARREARS REPORT');
    console.log('📊 ========================================');
    
    const query = `
      SELECT 
        l.id as lease_id,
        t.full_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        u.name as unit_name,
        p.name as property_name,
        l.rent_amount,
        l.start_date,
        date('now') as current_date,
        -- Days since lease started
        CAST(julianday('now') - julianday(l.start_date) AS INTEGER) as days_elapsed,
        -- Months elapsed (CEILING to charge full month even if 1 day into it)
        CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER)
        END as months_elapsed,
        -- Total paid
        COALESCE(SUM(pay.amount), 0) as total_paid,
        -- Expected amount = months_elapsed × rent_amount
        CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER) * l.rent_amount
        END as expected_amount,
        -- Arrears = expected - paid
        (CASE 
          WHEN julianday('now') < julianday(l.start_date) THEN 0
          ELSE CAST((julianday('now') - julianday(l.start_date)) / 30.0 + 0.999 AS INTEGER) * l.rent_amount
        END) - COALESCE(SUM(pay.amount), 0) as arrears_amount
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN payments pay ON l.id = pay.lease_id
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} l.status = 'active'
      GROUP BY l.id
      ORDER BY arrears_amount DESC
    `;
    
    const allArrears = db.prepare(query).all(...params);
    
    console.log(`📊 Found ${allArrears.length} active leases:`);
    allArrears.forEach(a => {
      console.log(`📊 ----------------------------------------`);
      console.log(`📊 ${a.tenant_name} - ${a.unit_name}`);
      console.log(`📊   Start: ${a.start_date} | Days: ${a.days_elapsed} | Months: ${a.months_elapsed}`);
      console.log(`📊   Rent: ${a.rent_amount} | Expected: ${a.expected_amount} | Paid: ${a.total_paid}`);
      console.log(`📊   ARREARS: ${a.arrears_amount}`);
    });
    
    // Filter for positive arrears only
    const arrears = allArrears.filter(a => a.arrears_amount > 0);
    
    console.log(`📊 ========================================`);
    console.log(`📊 ${arrears.length} tenants with arrears`);
    console.log(`📊 ========================================`);
    
    const totalArrears = arrears.reduce((sum, a) => sum + a.arrears_amount, 0);
    const tenantsInArrears = arrears.length;
    
    res.json({
      arrears,
      summary: {
        totalArrears,
        tenantsInArrears,
        averageArrears: tenantsInArrears > 0 ? totalArrears / tenantsInArrears : 0
      }
    });
  } catch (error) {
    console.error('❌ Arrears report error:', error);
    res.status(500).json({ error: 'Failed to generate arrears report' });
  }
});



// ============================================
// DEBUG ROUTE - TEMPORARY
// ============================================
router.get('/debug/my-data', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    console.log('\n🔍 ===== DEBUG REQUEST =====');
    console.log('User ID:', userId);
    console.log('Role:', role);
    
    let data = { userId, role };
    
    if (role === 'landlord') {
      data.properties = db.prepare('SELECT * FROM properties WHERE landlord_id = ?').all(userId);
      console.log('Properties found:', data.properties.length);
      
      data.units = db.prepare(`
        SELECT u.*, p.name as property_name 
        FROM units u 
        JOIN properties p ON u.property_id = p.id 
        WHERE p.landlord_id = ?
      `).all(userId);
      console.log('Units found:', data.units.length);
      
      data.leases = db.prepare(`
        SELECT l.*, t.full_name, u.name as unit_name, p.name as property_name
        FROM leases l
        JOIN tenants t ON l.tenant_id = t.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE p.landlord_id = ?
      `).all(userId);
      console.log('Leases found:', data.leases.length);
      
      data.tenants = db.prepare(`
        SELECT DISTINCT t.*
        FROM tenants t
        JOIN leases l ON t.id = l.tenant_id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE p.landlord_id = ?
      `).all(userId);
      console.log('Tenants found:', data.tenants.length);
      
      data.payments = db.prepare(`
        SELECT p.*
        FROM payments p
        JOIN leases l ON p.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties prop ON u.property_id = prop.id
        WHERE prop.landlord_id = ?
      `).all(userId);
      console.log('Payments found:', data.payments.length);
      
    } else if (role === 'admin') {
      data.properties = db.prepare('SELECT * FROM properties').all();
      data.units = db.prepare('SELECT * FROM units').all();
      data.leases = db.prepare('SELECT * FROM leases').all();
      data.tenants = db.prepare('SELECT * FROM tenants').all();
      data.payments = db.prepare('SELECT * FROM payments').all();
    }
    
    console.log('===== END DEBUG =====\n');
    
    res.json(data);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;

