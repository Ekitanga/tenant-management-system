const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { authMiddleware, roleMiddleware } = require('./middleware');

const router = express.Router();

// ============ AUTH ROUTES ============

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/auth/me', authMiddleware, (req, res) => {
  try {
    let userData = { ...req.user };

    if (req.user.role === 'tenant') {
      const tenant = db.prepare(`
        SELECT t.*, l.id as lease_id, l.unit_id, l.start_date, l.end_date, l.rent_amount,
               u.name as unit_name, p.name as property_name
        FROM tenants t
        LEFT JOIN leases l ON t.id = l.tenant_id AND l.status = 'active'
        LEFT JOIN units u ON l.unit_id = u.id
        LEFT JOIN properties p ON u.property_id = p.id
        WHERE t.user_id = ?
      `).get(req.user.id);
      userData.tenantDetails = tenant;
    }

    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Register new user
router.post('/auth/register', authMiddleware, roleMiddleware('admin', 'landlord'), async (req, res) => {
  try {
    const { username, email, password, role, full_name, phone, id_number } = req.body;

    if (db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email)) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hashedPassword, role);

    if (role === 'tenant' && full_name && phone && id_number) {
      db.prepare(`
        INSERT INTO tenants (user_id, full_name, phone, id_number)
        VALUES (?, ?, ?, ?)
      `).run(userResult.lastInsertRowid, full_name, phone, id_number);
    }

    res.status(201).json({ message: 'User registered successfully', userId: userResult.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============ DASHBOARD ROUTES ============

router.get('/dashboard/stats', authMiddleware, (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'admin' || req.user.role === 'landlord') {
      const landlordFilter = req.user.role === 'landlord' ? 'WHERE p.landlord_id = ?' : '';
      const params = req.user.role === 'landlord' ? [req.user.id] : [];

      const propertyStats = db.prepare(`
        SELECT COUNT(*) as total_properties FROM properties ${landlordFilter}
      `).get(...params);

      const unitStats = db.prepare(`
        SELECT 
          COUNT(*) as total_units,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
          SUM(CASE WHEN status = 'vacant' THEN 1 ELSE 0 END) as vacant_units,
          SUM(rent_amount) as total_monthly_rent
        FROM units u
        JOIN properties p ON u.property_id = p.id
        ${landlordFilter}
      `).get(...params);

      const tenantStats = db.prepare(`
        SELECT COUNT(DISTINCT t.id) as total_tenants
        FROM tenants t
        JOIN leases l ON t.id = l.tenant_id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE l.status = 'active' ${landlordFilter ? 'AND p.landlord_id = ?' : ''}
      `).get(...params);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const paymentStats = db.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_collected
        FROM payments pay
        JOIN leases l ON pay.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE pay.payment_date BETWEEN ? AND ? 
        AND pay.status = 'completed'
        ${landlordFilter ? 'AND p.landlord_id = ?' : ''}
      `).get(firstDay, lastDay, ...params);

      const expenseStats = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses e
        JOIN properties p ON e.property_id = p.id
        WHERE e.expense_date BETWEEN ? AND ?
        ${landlordFilter ? 'AND p.landlord_id = ?' : ''}
      `).get(firstDay, lastDay, ...params);

      const maintenanceStats = db.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_requests
        FROM maintenance_requests m
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        ${landlordFilter}
      `).get(...params);

      stats = {
        ...propertyStats,
        ...unitStats,
        ...tenantStats,
        ...paymentStats,
        ...expenseStats,
        ...maintenanceStats,
        net_income: paymentStats.total_collected - expenseStats.total_expenses
      };
    } else if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT * FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (tenantData) {
        const lease = db.prepare(`
          SELECT * FROM leases WHERE tenant_id = ? AND status = 'active'
        `).get(tenantData.id);

        const paymentTotal = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments
          WHERE tenant_id = ? AND status = 'completed'
        `).get(tenantData.id);

        const maintenanceCount = db.prepare(`
          SELECT COUNT(*) as total_requests
          FROM maintenance_requests
          WHERE tenant_id = ? AND status != 'closed'
        `).get(tenantData.id);

        stats = {
          lease_info: lease,
          ...paymentTotal,
          ...maintenanceCount
        };
      }
    }

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Recent activity
router.get('/dashboard/activity', authMiddleware, (req, res) => {
  try {
    const activity = {
      recentPayments: [],
      recentMaintenance: [],
      notifications: []
    };

    if (req.user.role === 'admin' || req.user.role === 'landlord') {
      const landlordFilter = req.user.role === 'landlord' ? 'AND p.landlord_id = ?' : '';
      const params = req.user.role === 'landlord' ? [req.user.id] : [];

      activity.recentPayments = db.prepare(`
        SELECT pay.*, t.full_name as tenant_name, u.name as unit_name
        FROM payments pay
        JOIN tenants t ON pay.tenant_id = t.id
        JOIN leases l ON pay.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE 1=1 ${landlordFilter}
        ORDER BY pay.payment_date DESC
        LIMIT 5
      `).all(...params);

      activity.recentMaintenance = db.prepare(`
        SELECT m.*, t.full_name as tenant_name, u.name as unit_name
        FROM maintenance_requests m
        JOIN tenants t ON m.tenant_id = t.id
        JOIN units u ON m.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE m.status != 'closed' ${landlordFilter}
        ORDER BY m.reported_date DESC
        LIMIT 5
      `).all(...params);
    } else if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT * FROM tenants WHERE user_id = ?').get(req.user.id);
      
      if (tenantData) {
        activity.recentPayments = db.prepare(`
          SELECT * FROM payments WHERE tenant_id = ? ORDER BY payment_date DESC LIMIT 5
        `).all(tenantData.id);

        activity.recentMaintenance = db.prepare(`
          SELECT * FROM maintenance_requests WHERE tenant_id = ? ORDER BY reported_date DESC LIMIT 5
        `).all(tenantData.id);
      }
    }

    activity.notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(req.user.id);

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ============ PROPERTY ROUTES ============

router.get('/properties', authMiddleware, (req, res) => {
  try {
    let query = `
      SELECT p.*, 
             COUNT(DISTINCT u.id) as total_units,
             COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) as occupied_units,
             SUM(u.rent_amount) as total_rent
      FROM properties p
      LEFT JOIN units u ON p.id = u.property_id
    `;
    
    if (req.user.role === 'landlord') {
      query += ' WHERE p.landlord_id = ?';
    }
    
    query += ' GROUP BY p.id ORDER BY p.created_at DESC';
    
    const properties = req.user.role === 'landlord' 
      ? db.prepare(query).all(req.user.id)
      : db.prepare(query).all();

    res.json({ properties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.post('/properties', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { name, location, description } = req.body;
    const landlordId = req.user.role === 'admin' && req.body.landlord_id ? req.body.landlord_id : req.user.id;

    const result = db.prepare(`
      INSERT INTO properties (name, location, description, landlord_id)
      VALUES (?, ?, ?, ?)
    `).run(name, location, description || null, landlordId);

    res.status(201).json({ message: 'Property created', propertyId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create property' });
  }
});

router.put('/properties/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (req.user.role === 'landlord' && property.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, location, description } = req.body;

    db.prepare(`
      UPDATE properties SET name = ?, location = ?, description = ? WHERE id = ?
    `).run(name || property.name, location || property.location, description || property.description, req.params.id);

    res.json({ message: 'Property updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update property' });
  }
});

router.delete('/properties/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (req.user.role === 'landlord' && property.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// ============ UNIT ROUTES ============

router.get('/units', authMiddleware, (req, res) => {
  try {
    const { property_id, status } = req.query;
    
    let query = `
      SELECT u.*, p.name as property_name, p.location, p.landlord_id,
             t.full_name as tenant_name, t.phone as tenant_phone
      FROM units u
      JOIN properties p ON u.property_id = p.id
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN tenants t ON l.tenant_id = t.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (req.user.role === 'landlord') {
      conditions.push('p.landlord_id = ?');
      params.push(req.user.id);
    }
    
    if (property_id) {
      conditions.push('u.property_id = ?');
      params.push(property_id);
    }
    
    if (status) {
      conditions.push('u.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.name, u.name';
    
    const units = db.prepare(query).all(...params);
    res.json({ units });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

router.post('/units', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, name, rent_amount, deposit_amount, bedrooms, bathrooms } = req.body;

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

    res.status(201).json({ message: 'Unit created', unitId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

router.put('/units/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const unit = db.prepare(`
      SELECT u.*, p.landlord_id 
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.id = ?
    `).get(req.params.id);
    
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (req.user.role === 'landlord' && unit.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, rent_amount, deposit_amount, bedrooms, bathrooms, status } = req.body;

    db.prepare(`
      UPDATE units 
      SET name = ?, rent_amount = ?, deposit_amount = ?, bedrooms = ?, bathrooms = ?, status = ?
      WHERE id = ?
    `).run(
      name || unit.name,
      rent_amount !== undefined ? rent_amount : unit.rent_amount,
      deposit_amount !== undefined ? deposit_amount : unit.deposit_amount,
      bedrooms !== undefined ? bedrooms : unit.bedrooms,
      bathrooms !== undefined ? bathrooms : unit.bathrooms,
      status || unit.status,
      req.params.id
    );

    res.json({ message: 'Unit updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

router.delete('/units/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const unit = db.prepare(`
      SELECT u.*, p.landlord_id 
      FROM units u
      JOIN properties p ON u.property_id = p.id
      WHERE u.id = ?
    `).get(req.params.id);
    
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (req.user.role === 'landlord' && unit.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const activeLease = db.prepare('SELECT * FROM leases WHERE unit_id = ? AND status = "active"').get(req.params.id);
    if (activeLease) {
      return res.status(400).json({ error: 'Cannot delete unit with active lease' });
    }

    db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
    res.json({ message: 'Unit deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// ============ TENANT ROUTES ============

router.get('/tenants', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    let query = `
      SELECT t.*, u.username, u.email, u.is_active,
             l.id as lease_id, l.unit_id, l.start_date, l.end_date, l.rent_amount, l.status as lease_status,
             un.name as unit_name, p.name as property_name, p.landlord_id,
             COALESCE(SUM(CASE WHEN pay.status = 'completed' THEN pay.amount ELSE 0 END), 0) as total_paid
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN leases l ON t.id = l.tenant_id AND l.status = 'active'
      LEFT JOIN units un ON l.unit_id = un.id
      LEFT JOIN properties p ON un.property_id = p.id
      LEFT JOIN payments pay ON l.id = pay.lease_id
    `;
    
    if (req.user.role === 'landlord') {
      query += ' WHERE p.landlord_id = ?';
    }
    
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    
    const tenants = req.user.role === 'landlord'
      ? db.prepare(query).all(req.user.id)
      : db.prepare(query).all();

    res.json({ tenants });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.get('/tenants/:id', authMiddleware, (req, res) => {
  try {
    const tenant = db.prepare(`
      SELECT t.*, u.username, u.email, u.is_active
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const lease = db.prepare(`
      SELECT l.*, un.name as unit_name, p.name as property_name, p.landlord_id
      FROM leases l
      JOIN units un ON l.unit_id = un.id
      JOIN properties p ON un.property_id = p.id
      WHERE l.tenant_id = ? AND l.status = 'active'
    `).get(req.params.id);

    if (req.user.role === 'landlord' && (!lease || lease.landlord_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'tenant') {
      const tenantUser = db.prepare('SELECT * FROM tenants WHERE user_id = ?').get(req.user.id);
      if (!tenantUser || tenantUser.id !== parseInt(req.params.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const payments = db.prepare(`
      SELECT * FROM payments WHERE tenant_id = ? ORDER BY payment_date DESC
    `).all(req.params.id);

    const maintenanceRequests = db.prepare(`
      SELECT * FROM maintenance_requests WHERE tenant_id = ? ORDER BY reported_date DESC
    `).all(req.params.id);

    res.json({ tenant: { ...tenant, lease, payments, maintenanceRequests } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

router.put('/tenants/:id', authMiddleware, (req, res) => {
  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (req.user.role === 'tenant') {
      const tenantUser = db.prepare('SELECT * FROM tenants WHERE user_id = ?').get(req.user.id);
      if (!tenantUser || tenantUser.id !== parseInt(req.params.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { full_name, phone, emergency_contact, emergency_phone } = req.body;

    db.prepare(`
      UPDATE tenants 
      SET full_name = ?, phone = ?, emergency_contact = ?, emergency_phone = ?
      WHERE id = ?
    `).run(
      full_name || tenant.full_name,
      phone || tenant.phone,
      emergency_contact || tenant.emergency_contact,
      emergency_phone || tenant.emergency_phone,
      req.params.id
    );

    res.json({ message: 'Tenant updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// ============ LEASE ROUTES ============

router.get('/leases', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT l.*, 
             t.full_name as tenant_name, t.phone as tenant_phone,
             u.name as unit_name, p.name as property_name, p.landlord_id
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (req.user.role === 'landlord') {
      conditions.push('p.landlord_id = ?');
      params.push(req.user.id);
    }
    
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY l.created_at DESC';
    
    const leases = db.prepare(query).all(...params);
    res.json({ leases });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leases' });
  }
});

router.post('/leases', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount } = req.body;

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

    if (unit.status !== 'vacant') {
      return res.status(400).json({ error: 'Unit is not vacant' });
    }

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const activeLease = db.prepare('SELECT * FROM leases WHERE tenant_id = ? AND status = "active"').get(tenant_id);
    if (activeLease) {
      return res.status(400).json({ error: 'Tenant already has an active lease' });
    }

    const result = db.prepare(`
      INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount || 0);

    db.prepare('UPDATE units SET status = "occupied" WHERE id = ?').run(unit_id);

    const tenantUser = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(tenant_id);
    if (tenantUser) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        tenantUser.user_id,
        'New Lease Agreement',
        `Your lease has been created. Period: ${start_date} to ${end_date}`,
        'general'
      );
    }

    res.status(201).json({ message: 'Lease created', leaseId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

router.put('/leases/:id', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const lease = db.prepare(`
      SELECT l.*, u.property_id, p.landlord_id
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

    const { start_date, end_date, rent_amount, deposit_amount, status } = req.body;

    db.prepare(`
      UPDATE leases 
      SET start_date = ?, end_date = ?, rent_amount = ?, deposit_amount = ?, status = ?
      WHERE id = ?
    `).run(
      start_date || lease.start_date,
      end_date || lease.end_date,
      rent_amount !== undefined ? rent_amount : lease.rent_amount,
      deposit_amount !== undefined ? deposit_amount : lease.deposit_amount,
      status || lease.status,
      req.params.id
    );

    if (status === 'terminated' || status === 'expired') {
      db.prepare('UPDATE units SET status = "vacant" WHERE id = ?').run(lease.unit_id);
    }

    res.json({ message: 'Lease updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lease' });
  }
});

// ============ PAYMENT ROUTES ============

router.get('/payments', authMiddleware, (req, res) => {
  try {
    const { tenant_id, status } = req.query;
    
    let query = `
      SELECT p.*, 
             t.full_name as tenant_name, t.phone as tenant_phone,
             l.unit_id, u.name as unit_name, pr.name as property_name, pr.landlord_id
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN leases l ON p.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties pr ON u.property_id = pr.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (req.user.role === 'landlord') {
      conditions.push('pr.landlord_id = ?');
      params.push(req.user.id);
    }
    
    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      if (tenantData) {
        conditions.push('p.tenant_id = ?');
        params.push(tenantData.id);
      }
    }
    
    if (tenant_id) {
      conditions.push('p.tenant_id = ?');
      params.push(tenant_id);
    }
    
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.payment_date DESC';
    
    const payments = db.prepare(query).all(...params);
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/payments', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { tenant_id, lease_id, amount, payment_date, payment_method, reference_number, notes } = req.body;

    const lease = db.prepare(`
      SELECT l.*, u.property_id, p.landlord_id
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE l.id = ? AND l.tenant_id = ?
    `).get(lease_id, tenant_id);

    if (!lease) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (req.user.role === 'landlord' && lease.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare(`
      INSERT INTO payments (tenant_id, lease_id, amount, payment_date, payment_method, reference_number, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(tenant_id, lease_id, amount, payment_date, payment_method, reference_number, notes || null);

    const tenantUser = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(tenant_id);
    if (tenantUser) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        tenantUser.user_id,
        'Payment Received',
        `Your payment of KES ${amount.toLocaleString()} has been received. Ref: ${reference_number}`,
        'payment'
      );
    }

    res.status(201).json({ message: 'Payment recorded', paymentId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ============ EXPENSE ROUTES ============

router.get('/expenses', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, category } = req.query;
    
    let query = `
      SELECT e.*, p.name as property_name, p.landlord_id
      FROM expenses e
      JOIN properties p ON e.property_id = p.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (req.user.role === 'landlord') {
      conditions.push('p.landlord_id = ?');
      params.push(req.user.id);
    }
    
    if (property_id) {
      conditions.push('e.property_id = ?');
      params.push(property_id);
    }
    
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY e.expense_date DESC';
    
    const expenses = db.prepare(query).all(...params);
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', authMiddleware, roleMiddleware('admin', 'landlord'), (req, res) => {
  try {
    const { property_id, category, description, amount, expense_date } = req.body;

    if (req.user.role === 'landlord') {
      const property = db.prepare('SELECT * FROM properties WHERE id = ? AND landlord_id = ?').get(property_id, req.user.id);
      if (!property) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = db.prepare(`
      INSERT INTO expenses (property_id, category, description, amount, expense_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(property_id, category, description, amount, expense_date, req.user.id);

    res.status(201).json({ message: 'Expense recorded', expenseId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

// ============ MAINTENANCE ROUTES ============

router.get('/maintenance', authMiddleware, (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = `
      SELECT m.*, 
             t.full_name as tenant_name, t.phone as tenant_phone,
             u.name as unit_name, p.name as property_name, p.landlord_id
      FROM maintenance_requests m
      JOIN tenants t ON m.tenant_id = t.id
      JOIN units u ON m.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (req.user.role === 'landlord') {
      conditions.push('p.landlord_id = ?');
      params.push(req.user.id);
    }
    
    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      if (tenantData) {
        conditions.push('m.tenant_id = ?');
        params.push(tenantData.id);
      }
    }
    
    if (status) {
      conditions.push('m.status = ?');
      params.push(status);
    }
    
    if (priority) {
      conditions.push('m.priority = ?');
      params.push(priority);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY m.reported_date DESC';
    
    const requests = db.prepare(query).all(...params);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

router.post('/maintenance', authMiddleware, (req, res) => {
  try {
    const { unit_id, title, description, priority } = req.body;

    let tenant_id;
    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      if (!tenantData) {
        return res.status(404).json({ error: 'Tenant profile not found' });
      }
      tenant_id = tenantData.id;

      const lease = db.prepare('SELECT * FROM leases WHERE tenant_id = ? AND unit_id = ? AND status = "active"').get(tenant_id, unit_id);
      if (!lease) {
        return res.status(403).json({ error: 'You can only create requests for your unit' });
      }
    } else {
      tenant_id = req.body.tenant_id;
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

    if (unit.landlord_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(
        unit.landlord_id,
        'New Maintenance Request',
        `New request for unit ${unit.name}: ${title}`,
        'maintenance'
      );
    }

    res.status(201).json({ message: 'Maintenance request created', requestId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create maintenance request' });
  }
});

router.put('/maintenance/:id', authMiddleware, (req, res) => {
  try {
    const request = db.prepare(`
      SELECT m.*, u.property_id, p.landlord_id
      FROM maintenance_requests m
      JOIN units u ON m.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE m.id = ?
    `).get(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (req.user.role === 'tenant') {
      const tenantData = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(req.user.id);
      if (!tenantData || request.tenant_id !== tenantData.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { description } = req.body;
      if (description) {
        db.prepare('UPDATE maintenance_requests SET description = ? WHERE id = ?').run(description, req.params.id);
      }
    } else {
      if (req.user.role === 'landlord' && request.landlord_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { title, description, priority, status, notes } = req.body;

      db.prepare(`
        UPDATE maintenance_requests 
        SET title = ?, description = ?, priority = ?, status = ?, notes = ?, 
            resolved_date = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_date END
        WHERE id = ?
      `).run(
        title || request.title,
        description || request.description,
        priority || request.priority,
        status || request.status,
        notes !== undefined ? notes : request.notes,
        status || request.status,
        req.params.id
      );

      if (status && status !== request.status) {
        const tenantUser = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(request.tenant_id);
        if (tenantUser) {
          db.prepare(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, ?, ?, ?)
          `).run(
            tenantUser.user_id,
            'Maintenance Update',
            `Your request status: ${status}`,
            'maintenance'
          );
        }
      }
    }

    res.json({ message: 'Request updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ============ NOTIFICATION ROUTES ============

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
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.put('/notifications/read-all', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

module.exports = router;
