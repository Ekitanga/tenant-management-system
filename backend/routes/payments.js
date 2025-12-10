const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware');

// GET all payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        p.*,
        t.full_name as tenant_name,
        l.unit_id,
        u.name as unit_name
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN leases l ON p.lease_id = l.id
      LEFT JOIN units u ON l.unit_id = u.id
    `;

    const params = [];

    if (req.user.role === 'landlord') {
      query += ' WHERE t.landlord_id = ?';
      params.push(req.user.userId);
    } else if (req.user.role === 'tenant') {
      query += ' WHERE p.tenant_id IN (SELECT id FROM tenants WHERE user_id = ?)';
      params.push(req.user.userId);
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const [payments] = await db.execute(query, params);

    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
});

// GET single payment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [payments] = await db.execute(
      `SELECT 
        p.*,
        t.full_name as tenant_name,
        t.email as tenant_email,
        u.name as unit_name,
        pr.name as property_name
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN leases l ON p.lease_id = l.id
      LEFT JOIN units u ON l.unit_id = u.id
      LEFT JOIN properties pr ON u.property_id = pr.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ payment: payments[0] });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
});

// CREATE payment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { lease_id, amount, payment_date, payment_method, reference_number } = req.body;

    console.log('Creating payment:', { lease_id, amount, payment_date, payment_method });

    // Validate required fields
    if (!lease_id || !amount || !payment_date) {
      return res.status(400).json({ message: 'Lease ID, amount, and payment date are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // Check if lease exists
    const [leases] = await db.execute(
      'SELECT * FROM leases WHERE id = ?',
      [lease_id]
    );

    if (leases.length === 0) {
      return res.status(404).json({ message: 'Lease not found' });
    }

    const lease = leases[0];

    if (lease.status !== 'active') {
      return res.status(400).json({ message: 'Cannot record payment for inactive lease' });
    }

    // Authorization check
    if (req.user.role === 'landlord') {
      const [tenants] = await db.execute(
        'SELECT landlord_id FROM tenants WHERE id = ?',
        [lease.tenant_id]
      );
      if (tenants.length > 0 && tenants[0].landlord_id !== req.user.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Insert payment
    const [result] = await db.execute(
      `INSERT INTO payments (lease_id, tenant_id, amount, payment_date, payment_method, reference_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [lease_id, lease.tenant_id, amount, payment_date, payment_method || 'cash', reference_number || null]
    );

    console.log('Payment created with ID:', result.insertId);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('payment:created', {
        id: result.insertId,
        lease_id,
        tenant_id: lease.tenant_id,
        amount,
        payment_date
      });
      io.emit('dashboard:refresh');
    }

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: {
        id: result.insertId,
        lease_id,
        tenant_id: lease.tenant_id,
        amount,
        payment_date,
        payment_method,
        reference_number
      }
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

// UPDATE payment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { amount, payment_date, payment_method, reference_number } = req.body;

    const [payments] = await db.execute('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await db.execute(
      `UPDATE payments 
       SET amount = ?, payment_date = ?, payment_method = ?, reference_number = ?
       WHERE id = ?`,
      [amount, payment_date, payment_method, reference_number, req.params.id]
    );

    res.json({ message: 'Payment updated successfully' });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Failed to update payment', error: error.message });
  }
});

// DELETE payment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [payments] = await db.execute('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    
    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await db.execute('DELETE FROM payments WHERE id = ?', [req.params.id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('dashboard:refresh');
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Failed to delete payment', error: error.message });
  }
});

module.exports = router;