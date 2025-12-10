const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware');

// GET all tenants
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        t.*,
        u.name as unit_name,
        l.status as lease_status
      FROM tenants t
      LEFT JOIN leases l ON t.id = l.tenant_id AND l.status = 'active'
      LEFT JOIN units u ON l.unit_id = u.id
    `;

    const params = [];

    if (req.user.role === 'landlord') {
      query += ' WHERE t.landlord_id = ?';
      params.push(req.user.userId);
    } else if (req.user.role === 'tenant') {
      query += ' WHERE t.user_id = ?';
      params.push(req.user.userId);
    }

    query += ' ORDER BY t.created_at DESC';

    const [tenants] = await db.execute(query, params);

    res.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ message: 'Failed to fetch tenants', error: error.message });
  }
});

// GET single tenant
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [tenants] = await db.execute(
      `SELECT 
        t.*,
        u.name as unit_name,
        u.id as unit_id,
        p.name as property_name,
        l.id as lease_id,
        l.status as lease_status,
        l.start_date,
        l.end_date,
        l.rent_amount
      FROM tenants t
      LEFT JOIN leases l ON t.id = l.tenant_id AND l.status = 'active'
      LEFT JOIN units u ON l.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE t.id = ?`,
      [req.params.id]
    );

    if (tenants.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json({ tenant: tenants[0] });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ message: 'Failed to fetch tenant', error: error.message });
  }
});

// CREATE tenant
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, phone, id_number } = req.body;

    console.log('Creating tenant:', { full_name, email, phone, id_number });

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({ message: 'Full name and email are required' });
    }

    // Check if email already exists
    const [existingTenants] = await db.execute(
      'SELECT id FROM tenants WHERE email = ?',
      [email]
    );

    if (existingTenants.length > 0) {
      return res.status(400).json({ message: 'A tenant with this email already exists' });
    }

    const landlordId = req.user.role === 'landlord' ? req.user.userId : null;

    const [result] = await db.execute(
      `INSERT INTO tenants (full_name, email, phone, id_number, landlord_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [full_name, email, phone || null, id_number || null, landlordId]
    );

    console.log('Tenant created with ID:', result.insertId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('tenant:created', {
        id: result.insertId,
        full_name,
        email
      });
    }

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: {
        id: result.insertId,
        full_name,
        email,
        phone,
        id_number
      }
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ message: 'Failed to create tenant', error: error.message });
  }
});

// UPDATE tenant
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, phone, id_number } = req.body;

    const [tenants] = await db.execute('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    
    if (tenants.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (req.user.role === 'landlord' && tenants[0].landlord_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute(
      `UPDATE tenants 
       SET full_name = ?, email = ?, phone = ?, id_number = ?
       WHERE id = ?`,
      [full_name, email, phone, id_number, req.params.id]
    );

    res.json({ message: 'Tenant updated successfully' });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ message: 'Failed to update tenant', error: error.message });
  }
});

// DELETE tenant
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [tenants] = await db.execute('SELECT * FROM tenants WHERE id = ?', [req.params.id]);
    
    if (tenants.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (req.user.role === 'landlord' && tenants[0].landlord_id !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [activeLeases] = await db.execute(
      'SELECT id FROM leases WHERE tenant_id = ? AND status = "active"',
      [req.params.id]
    );

    if (activeLeases.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete tenant with active leases. Please terminate the lease first.' 
      });
    }

    await db.execute('DELETE FROM tenants WHERE id = ?', [req.params.id]);

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ message: 'Failed to delete tenant', error: error.message });
  }
});

module.exports = router;